"""
重试控制器模块
提供智能重试逻辑、错误分析和任务状态管理
"""
import time
import random
import logging
from typing import Optional, Callable, Any, Type
from errors import (
    TranslationError, RetryConfig, ErrorCode, ErrorSeverity,
    parse_http_error, parse_openai_error, format_error_for_log
)
from task_manager import TaskManager, get_task_manager


class RetryController:
    """重试控制器"""
    
    def __init__(self, 
                 config: Optional[RetryConfig] = None,
                 task_manager: Optional[TaskManager] = None,
                 logger: Optional[logging.Logger] = None):
        self.config = config or RetryConfig()
        self.task_manager = task_manager or get_task_manager()
        self.logger = logger or logging.getLogger(__name__)
        
    def execute_with_retry(self, 
                          task_id: str,
                          operation: Callable,
                          operation_name: str = "操作",
                          *args, **kwargs) -> Any:
        """
        执行操作，支持重试和错误处理
        
        Args:
            task_id: 任务ID
            operation: 要执行的操作函数
            operation_name: 操作名称（用于日志）
            *args, **kwargs: 传递给操作函数的参数
            
        Returns:
            操作的返回值
            
        Raises:
            TranslationError: 当重试耗尽或遇到不可重试错误时
        """
        start_time = time.time()
        last_error = None
        
        for attempt in range(self.config.max_retries + 1):  # +1 因为第一次不算重试
            try:
                # 检查任务是否被取消
                self.task_manager.check_task_cancellation(task_id)
                
                # 执行操作
                if attempt > 0:
                    self.logger.info(f"重试 {operation_name} (第 {attempt} 次重试)")
                    self.task_manager.increment_task_retry(task_id)
                
                result = operation(*args, **kwargs)
                
                # 成功执行，返回结果
                if attempt > 0:
                    self.logger.info(f"{operation_name} 重试成功")
                return result
                
            except Exception as e:
                # 转换为标准错误格式
                if isinstance(e, TranslationError):
                    error = e
                else:
                    error = self._parse_exception(e)
                
                last_error = error
                elapsed_time = time.time() - start_time
                
                # 记录错误和增加错误计数
                self.logger.warning(format_error_for_log(error))
                self.task_manager.increment_task_error(task_id)
                
                # 判断是否应该重试
                if not self.config.should_retry(attempt, elapsed_time, error):
                    self.logger.error(f"{operation_name} 最终失败：{error.message}")
                    break
                
                # 计算重试延迟
                delay = self._calculate_delay(attempt, error)
                if delay > 0:
                    self.logger.info(f"{operation_name} 将在 {delay} 秒后重试...")
                    self._sleep_with_cancellation_check(task_id, delay)
        
        # 重试耗尽，抛出最后一个错误
        if last_error:
            # 如果是重试耗尽，创建新的错误
            if last_error.error_code != ErrorCode.TASK_CANCELLED:
                final_error = TranslationError(
                    error_code=ErrorCode.RETRY_EXHAUSTED,
                    message=f"{operation_name} 重试次数耗尽：{last_error.message}",
                    severity=ErrorSeverity.HIGH,
                    context={
                        "original_error": last_error,
                        "total_attempts": self.config.max_retries + 1,
                        "total_time": time.time() - start_time
                    }
                )
                raise final_error
            else:
                raise last_error
        
        # 理论上不会到达这里
        raise TranslationError(
            error_code=ErrorCode.INTERNAL_ERROR,
            message=f"{operation_name} 执行失败，原因未知",
            severity=ErrorSeverity.HIGH
        )
    
    async def execute_with_retry_async(self,
                                     task_id: str, 
                                     operation: Callable,
                                     operation_name: str = "异步操作",
                                     *args, **kwargs) -> Any:
        """
        异步版本的重试执行器
        """
        import asyncio
        
        start_time = time.time()
        last_error = None
        
        for attempt in range(self.config.max_retries + 1):
            try:
                # 检查任务是否被取消
                self.task_manager.check_task_cancellation(task_id)
                
                # 执行异步操作
                if attempt > 0:
                    self.logger.info(f"重试 {operation_name} (第 {attempt} 次重试)")
                    self.task_manager.increment_task_retry(task_id)
                
                if asyncio.iscoroutinefunction(operation):
                    result = await operation(*args, **kwargs)
                else:
                    result = operation(*args, **kwargs)
                
                if attempt > 0:
                    self.logger.info(f"{operation_name} 重试成功")
                return result
                
            except Exception as e:
                if isinstance(e, TranslationError):
                    error = e
                else:
                    error = self._parse_exception(e)
                
                last_error = error
                elapsed_time = time.time() - start_time
                
                self.logger.warning(format_error_for_log(error))
                self.task_manager.increment_task_error(task_id)
                
                if not self.config.should_retry(attempt, elapsed_time, error):
                    self.logger.error(f"{operation_name} 最终失败：{error.message}")
                    break
                
                delay = self._calculate_delay(attempt, error)
                if delay > 0:
                    self.logger.info(f"{operation_name} 将在 {delay} 秒后重试...")
                    await self._async_sleep_with_cancellation_check(task_id, delay)
        
        # 处理最终错误
        if last_error:
            if last_error.error_code != ErrorCode.TASK_CANCELLED:
                final_error = TranslationError(
                    error_code=ErrorCode.RETRY_EXHAUSTED,
                    message=f"{operation_name} 重试次数耗尽：{last_error.message}",
                    severity=ErrorSeverity.HIGH,
                    context={
                        "original_error": last_error,
                        "total_attempts": self.config.max_retries + 1,
                        "total_time": time.time() - start_time
                    }
                )
                raise final_error
            else:
                raise last_error
        
        raise TranslationError(
            error_code=ErrorCode.INTERNAL_ERROR,
            message=f"{operation_name} 执行失败，原因未知",
            severity=ErrorSeverity.HIGH
        )
    
    def _parse_exception(self, exception: Exception) -> TranslationError:
        """解析异常为标准错误格式"""
        # 先尝试解析为HTTP错误
        error_str = str(exception)
        
        # 检查是否包含HTTP状态码
        import re
        http_match = re.search(r'(\d{3})', error_str)
        if http_match:
            status_code = int(http_match.group(1))
            if 400 <= status_code < 600:
                return parse_http_error(status_code, error_str)
        
        # 尝试解析为OpenAI错误
        openai_keywords = [
            'openai', 'api_key', 'authentication', 'rate_limit', 
            'timeout', 'connection', 'content_filter'
        ]
        if any(keyword in error_str.lower() for keyword in openai_keywords):
            return parse_openai_error(exception)
        
        # 默认处理
        return TranslationError(
            error_code=ErrorCode.TRANSLATION_ERROR,
            message=f"翻译过程出错: {str(exception)}",
            severity=ErrorSeverity.MEDIUM,
            context={"exception_type": type(exception).__name__}
        )
    
    def _calculate_delay(self, attempt: int, error: TranslationError) -> float:
        """计算重试延迟时间"""
        if error.retry_after:
            base_delay = error.retry_after
        elif self.config.exponential_backoff:
            base_delay = self.config.base_delay * (2 ** attempt)
        else:
            base_delay = self.config.base_delay
        
        # 应用最大延迟限制
        delay = min(base_delay, self.config.max_delay)
        
        # 添加随机抖动避免雷群效应
        if self.config.jitter:
            jitter_range = delay * 0.1  # 10%的抖动
            delay += random.uniform(-jitter_range, jitter_range)
        
        return max(0, delay)
    
    def _sleep_with_cancellation_check(self, task_id: str, delay: float):
        """在延迟期间检查任务取消状态"""
        start_time = time.time()
        check_interval = 0.5  # 每0.5秒检查一次
        
        while time.time() - start_time < delay:
            # 检查是否被取消
            self.task_manager.check_task_cancellation(task_id)
            
            # 休眠一小段时间
            remaining_time = delay - (time.time() - start_time)
            sleep_time = min(check_interval, remaining_time)
            if sleep_time > 0:
                time.sleep(sleep_time)
    
    async def _async_sleep_with_cancellation_check(self, task_id: str, delay: float):
        """异步版本的可取消延迟"""
        import asyncio
        
        start_time = time.time()
        check_interval = 0.5
        
        while time.time() - start_time < delay:
            # 检查是否被取消
            self.task_manager.check_task_cancellation(task_id)
            
            # 异步休眠
            remaining_time = delay - (time.time() - start_time)
            sleep_time = min(check_interval, remaining_time)
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)


def create_retry_controller(max_retries: int = 3, 
                          max_total_time: int = 300,
                          task_manager: Optional[TaskManager] = None,
                          logger: Optional[logging.Logger] = None) -> RetryController:
    """创建重试控制器的便捷函数"""
    config = RetryConfig(
        max_retries=max_retries,
        max_total_time=max_total_time
    )
    return RetryController(config, task_manager, logger)


def with_retry(task_id: str,
               max_retries: int = 3,
               operation_name: str = "操作"):
    """
    装饰器版本的重试控制
    
    使用示例:
    @with_retry("task_123", max_retries=5, operation_name="翻译文本")
    def translate_text(text):
        # 翻译逻辑
        pass
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            controller = create_retry_controller(max_retries=max_retries)
            return controller.execute_with_retry(
                task_id=task_id,
                operation=func,
                operation_name=operation_name,
                *args, **kwargs
            )
        return wrapper
    return decorator
