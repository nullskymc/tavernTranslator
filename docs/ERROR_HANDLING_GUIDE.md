# 错误处理和重试系统配置说明

## 概述

本文档描述了新的错误处理和重试系统的配置选项和使用方法。该系统解决了以下问题：

1. **无限重试问题** - 设置了明确的重试上限和超时控制
2. **错误类型混乱** - 定义了完整的错误类型体系，参照OpenAI和HTTP标准  
3. **任务状态管理** - 实现了完整的任务生命周期管理和取消机制
4. **前后端状态不一致** - 通过任务管理器确保状态同步

## 错误类型体系

### HTTP 错误类型
- `BAD_REQUEST` (400) - 请求格式错误
- `UNAUTHORIZED` (401) - 认证失败  
- `FORBIDDEN` (403) - 权限不足
- `NOT_FOUND` (404) - 资源不存在
- `TOO_MANY_REQUESTS` (429) - 请求过多

### OpenAI 特定错误
- `AUTHENTICATION_ERROR` - API Key 认证错误
- `RATE_LIMIT_ERROR` - 速率限制错误
- `API_CONNECTION_ERROR` - API 连接错误
- `API_TIMEOUT_ERROR` - API 超时错误
- `CONTENT_FILTER_ERROR` - 内容过滤错误

### 业务逻辑错误
- `TRANSLATION_ERROR` - 翻译错误
- `FILE_PROCESSING_ERROR` - 文件处理错误
- `TASK_CANCELLED` - 任务被取消
- `RETRY_EXHAUSTED` - 重试次数耗尽

## 重试配置

### 默认配置
```python
RetryConfig(
    max_retries=3,           # 最大重试次数
    max_total_time=180,      # 最大重试时间（3分钟）
    base_delay=2.0,          # 基础延迟时间
    max_delay=30,            # 最大延迟时间
    exponential_backoff=True, # 使用指数退避
    jitter=True              # 添加随机抖动
)
```

### 不同错误类型的重试策略

#### 速率限制错误 (429)
- 重试延迟：5 * (2^尝试次数)，最大60秒
- 可重试：是
- 特殊处理：立即降低并发数

#### 认证错误 (401, 403) 
- 重试延迟：不适用
- 可重试：否
- 特殊处理：立即停止任务

#### 连接错误
- 重试延迟：2 * (2^尝试次数)，最大30秒
- 可重试：是
- 特殊处理：逐步降低并发

#### 服务器错误 (500, 502, 503)
- 重试延迟：3 * (2^尝试次数)，最大45秒
- 可重试：是
- 特殊处理：增加请求间隔

## 任务管理配置

### 任务状态
- `PENDING` - 等待开始
- `RUNNING` - 正在执行  
- `COMPLETED` - 已完成
- `FAILED` - 执行失败
- `CANCELLED` - 已取消
- `TIMEOUT` - 超时

### 任务清理配置
```python
cleanup_interval = 3600      # 1小时清理一次
max_finished_tasks = 100     # 最多保留100个已完成任务
task_timeout = 7200          # 任务超时时间（2小时）
```

### 并发控制配置
```python
initial_max_workers = 2      # 初始并发数
min_workers = 1              # 最小并发数
max_workers = 3              # 最大并发数
request_interval = 3         # 初始请求间隔（秒）
```

## API 端点更新

### 新增端点

#### POST /cancel/{task_id}
取消正在执行的翻译任务

**响应示例：**
```json
{
    "message": "任务取消请求已发送",
    "task_id": "uuid-here"
}
```

#### GET /status/{task_id} (增强)
获取任务详细状态，包括进度和错误信息

**响应示例：**
```json
{
    "task_id": "uuid-here",
    "status": "running",
    "progress_percentage": 60.0,
    "current_step": "翻译角色描述",
    "error_count": 1,
    "retry_count": 2,
    "duration": 45.2
}
```

#### GET /health (增强)
健康检查端点，包含任务管理器状态

**响应示例：**
```json
{
    "status": "healthy",
    "current_tasks": 1,
    "max_concurrent_tasks": 2,
    "available_slots": 1,
    "task_manager": {
        "active_tasks_count": 1,
        "finished_tasks_count": 5,
        "total_tasks_count": 6
    }
}
```

## WebSocket 消息更新

### 新增消息类型

#### 任务取消消息
```json
{
    "type": "cancelled",
    "message": "翻译任务已取消"
}
```

#### 增强的错误消息
```json
{
    "type": "error",
    "message": "API请求频率超限",
    "error_details": {
        "error_code": "rate_limit_error",
        "severity": "medium",
        "is_retryable": true,
        "should_stop": false
    }
}
```

## 使用示例

### 前端任务取消
```javascript
// 取消任务
async function cancelTask(taskId) {
    const response = await fetch(`/cancel/${taskId}`, {
        method: 'POST'
    });
    const result = await response.json();
    console.log(result.message);
}
```

### 错误处理最佳实践
```python
from src.errors import TranslationError, ErrorCode
from src.retry_controller import create_retry_controller

# 创建重试控制器
retry_controller = create_retry_controller(
    max_retries=5,
    max_total_time=300
)

# 执行带重试的操作
try:
    result = retry_controller.execute_with_retry(
        task_id="task_123",
        operation=my_translation_function,
        operation_name="翻译文本"
    )
except TranslationError as e:
    if e.should_stop_immediately():
        logger.error(f"严重错误，停止任务: {e.message}")
    else:
        logger.warning(f"可重试错误: {e.message}")
```

## 监控和日志

### 结构化日志格式
```
[ERROR_CODE] | 严重程度: level | 消息: message | HTTP状态: code | 建议重试延迟: seconds | 上下文: context
```

### 关键指标监控
- 任务成功率
- 平均重试次数  
- 错误类型分布
- 任务执行时长
- 并发使用率

## 故障排除

### 常见问题

#### 1. 任务一直重试不停止
**原因：** 重试配置过于宽松
**解决：** 检查 `max_retries` 和 `max_total_time` 配置

#### 2. 前端显示错误但后端还在运行
**原因：** 任务取消机制未正确工作
**解决：** 检查任务管理器的取消标志设置

#### 3. API 429 错误频繁出现
**原因：** 并发控制不当
**解决：** 调整 `max_workers` 和 `request_interval` 参数

#### 4. 任务超时但没有被清理
**原因：** 任务清理配置问题
**解决：** 检查 `task_timeout` 和 `cleanup_interval` 设置

### 调试工具

使用测试脚本验证系统功能：
```bash
python test_error_handling.py
```

查看详细的错误日志：
```bash
tail -f logs/translation.log | grep ERROR
```

## 性能优化建议

1. **调整重试策略**：根据API特性调整重试参数
2. **监控并发数**：根据服务器性能调整并发限制  
3. **优化清理频率**：根据内存使用情况调整清理间隔
4. **错误统计分析**：定期分析错误模式并优化处理策略

## 向后兼容性

新系统保持了与原有API的完全兼容性，现有的前端代码无需修改即可使用新的错误处理功能。所有增强功能都是向后兼容的扩展。
