"""
错误类型定义模块
参照 OpenAI API 和标准 HTTP 状态码定义完整的错误类型体系
"""
import time
from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass


class ErrorCode(Enum):
    """错误代码枚举，参照 OpenAI API 和 HTTP 标准。"""
    
    # HTTP 4xx 客户端错误
    BAD_REQUEST = "bad_request"              # 400 - 请求格式错误
    UNAUTHORIZED = "unauthorized"            # 401 - 认证失败
    FORBIDDEN = "forbidden"                  # 403 - 权限不足
    NOT_FOUND = "not_found"                 # 404 - 资源不存在
    TOO_MANY_REQUESTS = "too_many_requests" # 429 - 请求过多
    
    # HTTP 5xx 服务器错误
    INTERNAL_ERROR = "internal_error"        # 500 - 服务器内部错误
    BAD_GATEWAY = "bad_gateway"             # 502 - 网关错误
    SERVICE_UNAVAILABLE = "service_unavailable" # 503 - 服务不可用
    GATEWAY_TIMEOUT = "gateway_timeout"      # 504 - 网关超时
    
    # OpenAI 特定错误
    INVALID_REQUEST_ERROR = "invalid_request_error"     # 请求参数无效
    AUTHENTICATION_ERROR = "authentication_error"       # API Key 认证错误
    PERMISSION_ERROR = "permission_error"               # 权限错误
    RATE_LIMIT_ERROR = "rate_limit_error"              # 速率限制错误
    API_ERROR = "api_error"                            # API 服务错误
    API_CONNECTION_ERROR = "api_connection_error"       # API 连接错误
    API_TIMEOUT_ERROR = "api_timeout_error"            # API 超时错误
    
    # 自定义业务错误
    TRANSLATION_ERROR = "translation_error"             # 翻译错误
    FILE_PROCESSING_ERROR = "file_processing_error"     # 文件处理错误
    TASK_CANCELLED = "task_cancelled"                   # 任务被取消
    RETRY_EXHAUSTED = "retry_exhausted"                 # 重试次数耗尽
    CONTENT_FILTER_ERROR = "content_filter_error"       # 内容过滤错误


class ErrorSeverity(Enum):
    """错误严重程度。"""
    LOW = "low"           # 轻微错误，可以继续
    MEDIUM = "medium"     # 中等错误，需要重试
    HIGH = "high"         # 严重错误，需要立即停止
    CRITICAL = "critical" # 致命错误，系统级问题


@dataclass
class TranslationError(Exception):
    """翻译错误基类。"""
    error_code: ErrorCode
    message: str
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
    http_status: Optional[int] = None
    retry_after: Optional[int] = None  # 建议的重试延迟（秒）
    context: Optional[Dict[str, Any]] = None
    timestamp: Optional[float] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()
        super().__init__(self.message)
    
    def is_retryable(self) -> bool:
        """判断错误是否可以重试。"""
        non_retryable_codes = {
            ErrorCode.BAD_REQUEST,
            ErrorCode.UNAUTHORIZED, 
            ErrorCode.FORBIDDEN,
            ErrorCode.NOT_FOUND,
            ErrorCode.INVALID_REQUEST_ERROR,
            ErrorCode.AUTHENTICATION_ERROR,
            ErrorCode.PERMISSION_ERROR,
            ErrorCode.TASK_CANCELLED,
            ErrorCode.CONTENT_FILTER_ERROR
        }
        return self.error_code not in non_retryable_codes
    
    def get_retry_delay(self, attempt: int) -> int:
        """获取重试延迟时间（秒）。"""
        if self.retry_after:
            return self.retry_after
        
        # 根据错误类型返回不同的延迟策略
        if self.error_code == ErrorCode.RATE_LIMIT_ERROR:
            # 速率限制错误使用指数退避，但有上限
            return min(60, 5 * (2 ** attempt))
        elif self.error_code in [ErrorCode.API_CONNECTION_ERROR, ErrorCode.GATEWAY_TIMEOUT]:
            # 连接错误使用较短的指数退避
            return min(30, 2 * (2 ** attempt)) 
        elif self.error_code in [ErrorCode.INTERNAL_ERROR, ErrorCode.SERVICE_UNAVAILABLE]:
            # 服务器错误使用中等延迟
            return min(45, 3 * (2 ** attempt))
        else:
            # 默认延迟策略
            return min(20, 1 * (2 ** attempt))
    
    def should_stop_immediately(self) -> bool:
        """判断是否应该立即停止任务。"""
        critical_codes = {
            ErrorCode.AUTHENTICATION_ERROR,
            ErrorCode.FORBIDDEN,
            ErrorCode.TASK_CANCELLED,
            ErrorCode.CONTENT_FILTER_ERROR
        }
        return (self.error_code in critical_codes or 
                self.severity == ErrorSeverity.CRITICAL)


def parse_http_error(status_code: int, response_text: str = "") -> TranslationError:
    """解析 HTTP 错误状态码，返回对应的翻译错误。"""
    error_map = {
        400: (ErrorCode.BAD_REQUEST, "请求格式错误", ErrorSeverity.HIGH),
        401: (ErrorCode.UNAUTHORIZED, "API密钥认证失败", ErrorSeverity.CRITICAL),
        403: (ErrorCode.FORBIDDEN, "API访问权限不足", ErrorSeverity.CRITICAL),
        404: (ErrorCode.NOT_FOUND, "API端点不存在", ErrorSeverity.HIGH),
        429: (ErrorCode.RATE_LIMIT_ERROR, "API请求频率超限", ErrorSeverity.MEDIUM),
        500: (ErrorCode.INTERNAL_ERROR, "API服务器内部错误", ErrorSeverity.MEDIUM),
        502: (ErrorCode.BAD_GATEWAY, "API网关错误", ErrorSeverity.MEDIUM),
        503: (ErrorCode.SERVICE_UNAVAILABLE, "API服务不可用", ErrorSeverity.MEDIUM),
        504: (ErrorCode.GATEWAY_TIMEOUT, "API网关超时", ErrorSeverity.MEDIUM),
    }
    
    if status_code in error_map:
        error_code, base_message, severity = error_map[status_code]
        message = f"{base_message} (HTTP {status_code})"
        if response_text:
            message += f": {response_text}"
        
        retry_after = None
        if status_code == 429:
            # 对于 429 错误，尝试从响应中提取 Retry-After 信息
            retry_after = 30  # 默认30秒
        
        return TranslationError(
            error_code=error_code,
            message=message,
            severity=severity,
            http_status=status_code,
            retry_after=retry_after,
            context={"response_text": response_text}
        )
    else:
        return TranslationError(
            error_code=ErrorCode.API_ERROR,
            message=f"未知的HTTP错误 (状态码: {status_code}): {response_text}",
            severity=ErrorSeverity.MEDIUM,
            http_status=status_code,
            context={"response_text": response_text}
        )


def parse_openai_error(exception: Exception) -> TranslationError:
    """解析 OpenAI API 错误，返回对应的翻译错误。"""
    error_str = str(exception).lower()
    
    # 检查常见的 OpenAI 错误模式
    if "authentication" in error_str or "invalid_api_key" in error_str:
        return TranslationError(
            error_code=ErrorCode.AUTHENTICATION_ERROR,
            message=f"API密钥认证失败: {str(exception)}",
            severity=ErrorSeverity.CRITICAL
        )
    elif "permission" in error_str or "forbidden" in error_str:
        return TranslationError(
            error_code=ErrorCode.PERMISSION_ERROR,
            message=f"API访问权限不足: {str(exception)}",
            severity=ErrorSeverity.CRITICAL
        )
    elif "rate" in error_str or "429" in error_str or "too many requests" in error_str:
        return TranslationError(
            error_code=ErrorCode.RATE_LIMIT_ERROR,
            message=f"API请求频率超限: {str(exception)}",
            severity=ErrorSeverity.MEDIUM,
            retry_after=30
        )
    elif "timeout" in error_str:
        return TranslationError(
            error_code=ErrorCode.API_TIMEOUT_ERROR,
            message=f"API请求超时: {str(exception)}",
            severity=ErrorSeverity.MEDIUM
        )
    elif "connection" in error_str or "network" in error_str:
        return TranslationError(
            error_code=ErrorCode.API_CONNECTION_ERROR,
            message=f"API连接错误: {str(exception)}",
            severity=ErrorSeverity.MEDIUM
        )
    elif "content_filter" in error_str or "content policy" in error_str:
        return TranslationError(
            error_code=ErrorCode.CONTENT_FILTER_ERROR,
            message=f"内容被过滤器拦截: {str(exception)}",
            severity=ErrorSeverity.HIGH
        )
    else:
        return TranslationError(
            error_code=ErrorCode.API_ERROR,
            message=f"API调用错误: {str(exception)}",
            severity=ErrorSeverity.MEDIUM,
            context={"original_exception": str(exception)}
        )


@dataclass 
class RetryConfig:
    """重试配置。"""
    max_retries: int = 3                    # 最大重试次数
    max_total_time: int = 300              # 最大总重试时间（秒）
    base_delay: float = 1.0                # 基础延迟时间
    max_delay: int = 60                    # 最大延迟时间
    exponential_backoff: bool = True       # 是否使用指数退避
    jitter: bool = True                    # 是否添加随机抖动
    
    def should_retry(self, attempt: int, elapsed_time: float, error: TranslationError) -> bool:
        """判断是否应该继续重试。"""
        if attempt >= self.max_retries:
            return False
        if elapsed_time >= self.max_total_time:
            return False
        if not error.is_retryable():
            return False
        if error.should_stop_immediately():
            return False
        return True


class TaskCancelledException(TranslationError):
    """任务取消异常。"""
    def __init__(self, message: str = "任务已被取消"):
        super().__init__(
            error_code=ErrorCode.TASK_CANCELLED,
            message=message,
            severity=ErrorSeverity.CRITICAL
        )


def format_error_for_log(error: TranslationError) -> str:
    """格式化错误信息用于日志记录。"""
    parts = [
        f"[{error.error_code.value.upper()}]",
        f"严重程度: {error.severity.value}",
        f"消息: {error.message}"
    ]
    
    if error.http_status:
        parts.append(f"HTTP状态: {error.http_status}")
    
    if error.retry_after:
        parts.append(f"建议重试延迟: {error.retry_after}秒")
    
    if error.context:
        parts.append(f"上下文: {error.context}")
    
    return " | ".join(parts)


def format_error_for_frontend(error: TranslationError) -> Dict[str, Any]:
    """格式化错误信息用于前端显示。"""
    return {
        "error_code": error.error_code.value,
        "message": error.message,
        "severity": error.severity.value,
        "timestamp": error.timestamp,
        "is_retryable": error.is_retryable(),
        "should_stop": error.should_stop_immediately()
    }