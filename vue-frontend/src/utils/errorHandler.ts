/**
 * 全局错误处理工具
 * 用于捕获和处理应用中的各种错误
 */

import { ElMessage, ElNotification } from 'element-plus'
import type { ErrorInfo, ErrorRecord } from '@/types'

// 错误类型枚举
export const ErrorTypes = {
  NETWORK_ERROR: 'network_error',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',
  TRANSLATION_ERROR: 'translation_error',
  WEBSOCKET_ERROR: 'websocket_error',
  UNKNOWN_ERROR: 'unknown_error'
}

// 错误级别枚举
export const ErrorLevels = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  errorHistory: ErrorRecord[]

  constructor() {
    this.errorHistory = []
    this.setupGlobalErrorHandlers()
  }

  /**
   * 设置全局错误处理器
   */
  setupGlobalErrorHandlers() {
    // 监听未捕获的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未处理的Promise错误:', event.reason)
      this.handleError({
        type: ErrorTypes.UNKNOWN_ERROR,
        message: event.reason?.message || '未知错误',
        level: ErrorLevels.ERROR,
        context: 'unhandledrejection',
        originalError: event.reason
      })
    })

    // 监听全局JavaScript错误
    window.addEventListener('error', (event) => {
      console.error('全局JavaScript错误:', event.error)
      this.handleError({
        type: ErrorTypes.UNKNOWN_ERROR,
        message: event.error?.message || event.message || '脚本错误',
        level: ErrorLevels.ERROR,
        context: 'global',
        originalError: event.error
      })
    })
  }

  /**
   * 主要错误处理方法
   * @param {Object} errorInfo - 错误信息对象
   */
  handleError(errorInfo: ErrorInfo): ErrorRecord {
    const {
      type = ErrorTypes.UNKNOWN_ERROR,
      message = '发生了未知错误',
      level = ErrorLevels.ERROR,
      context = 'unknown',
      originalError = null,
      showNotification = true,
      autoRecover = false
    } = errorInfo

    // 记录错误到历史
    const errorRecord = {
      timestamp: new Date().toISOString(),
      type,
      message,
      level,
      context,
      originalError: originalError?.stack || originalError?.toString() || null
    }
    
    this.errorHistory.push(errorRecord)
    
    // 控制台输出
    console.error(`[${level.toUpperCase()}] ${type}: ${message}`, originalError)

    // 根据错误级别显示不同的通知
    if (showNotification) {
      this.showErrorNotification(errorRecord)
    }

    // 自动恢复尝试
    if (autoRecover) {
      this.attemptAutoRecover(errorRecord)
    }

    return errorRecord
  }

  /**
   * 显示错误通知
   * @param {Object} errorRecord - 错误记录
   */
  showErrorNotification(errorRecord: ErrorRecord) {
    const { type, message, level } = errorRecord

    switch (level) {
      case ErrorLevels.INFO:
        ElMessage.info(message)
        break

      case ErrorLevels.WARNING:
        ElMessage.warning(message)
        break

      case ErrorLevels.ERROR:
        if (type === ErrorTypes.TRANSLATION_ERROR) {
          ElNotification({
            title: '翻译错误',
            message: message,
            type: 'error',
            duration: 8000
          })
        } else {
          ElMessage.error(message)
        }
        break

      case ErrorLevels.CRITICAL:
        ElNotification({
          title: '严重错误',
          message: message + '\n\n建议刷新页面或重新开始操作',
          type: 'error',
          duration: 12000,
          dangerouslyUseHTMLString: false
        })
        break

      default:
        ElMessage.error(message)
    }
  }

  /**
   * 尝试自动恢复
   * @param {Object} errorRecord - 错误记录
   */
  attemptAutoRecover(errorRecord: ErrorRecord) {
    const { type } = errorRecord

    switch (type) {
      case ErrorTypes.WEBSOCKET_ERROR:
        // WebSocket错误，尝试重新连接
        console.log('尝试WebSocket自动重连...')
        setTimeout(() => {
          // 这里可以触发重连逻辑
          window.dispatchEvent(new CustomEvent('websocket-reconnect'))
        }, 3000)
        break

      case ErrorTypes.NETWORK_ERROR:
        // 网络错误，建议用户检查网络
        ElMessage.warning('网络连接异常，请检查网络后重试')
        break

      default:
        console.log('无法自动恢复此类型的错误:', type)
    }
  }

  /**
   * 创建网络错误
   * @param {string} message - 错误消息
   * @param {Error} originalError - 原始错误对象
   */
  createNetworkError(message: string, originalError: Error | null = null) {
    return this.handleError({
      type: ErrorTypes.NETWORK_ERROR,
      message,
      level: ErrorLevels.ERROR,
      context: 'network',
      originalError,
      showNotification: true
    })
  }

  /**
   * 创建API错误
   * @param {string} message - 错误消息
   * @param {number} statusCode - HTTP状态码
   * @param {Error} originalError - 原始错误对象
   */
  createApiError(message: string, statusCode: number | null = null, originalError: Error | null = null) {
    const level = (statusCode as number) >= 500 ? ErrorLevels.CRITICAL : ErrorLevels.ERROR
    return this.handleError({
      type: ErrorTypes.API_ERROR,
      message: statusCode ? `${message} (状态码: ${statusCode})` : message,
      level,
      context: 'api',
      originalError,
      showNotification: true
    })
  }

  /**
   * 创建翻译错误
   * @param {string} message - 错误消息
   * @param {Error} originalError - 原始错误对象
   */
  createTranslationError(message: string, originalError: Error | null = null) {
    return this.handleError({
      type: ErrorTypes.TRANSLATION_ERROR,
      message,
      level: ErrorLevels.ERROR,
      context: 'translation',
      originalError,
      showNotification: true,
      autoRecover: false
    })
  }

  /**
   * 创建WebSocket错误
   * @param {string} message - 错误消息
   * @param {Error} originalError - 原始错误对象
   */
  createWebSocketError(message: string, originalError: Error | null = null) {
    return this.handleError({
      type: ErrorTypes.WEBSOCKET_ERROR,
      message,
      level: ErrorLevels.ERROR,
      context: 'websocket',
      originalError,
      showNotification: true,
      autoRecover: true
    })
  }

  /**
   * 创建验证错误
   * @param {string} message - 错误消息
   */
  createValidationError(message: string) {
    return this.handleError({
      type: ErrorTypes.VALIDATION_ERROR,
      message,
      level: ErrorLevels.WARNING,
      context: 'validation',
      showNotification: true
    })
  }

  /**
   * 获取错误历史
   * @param {number} limit - 限制返回数量
   */
  getErrorHistory(limit = 10): ErrorRecord[] {
    return this.errorHistory.slice(-limit)
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory() {
    this.errorHistory = []
  }

  /**
   * 检查是否存在特定类型的错误
   * @param {string} errorType - 错误类型
   * @param {number} timeWindow - 时间窗口（分钟）
   */
  hasRecentError(errorType: string, timeWindow = 5): boolean {
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000)
    return this.errorHistory.some(error => 
      error.type === errorType && 
      new Date(error.timestamp) > cutoffTime
    )
  }
}

// 创建全局错误处理器实例
export const globalErrorHandler = new ErrorHandler()

// 导出便捷方法
export const handleNetworkError = (message: string, error: Error) => 
  globalErrorHandler.createNetworkError(message, error)

export const handleApiError = (message: string, statusCode: number, error: Error) => 
  globalErrorHandler.createApiError(message, statusCode, error)

export const handleTranslationError = (message: string, error: Error) => 
  globalErrorHandler.createTranslationError(message, error)

export const handleWebSocketError = (message: string, error: Error) => 
  globalErrorHandler.createWebSocketError(message, error)

export const handleValidationError = (message: string) => 
  globalErrorHandler.createValidationError(message)

export default globalErrorHandler
