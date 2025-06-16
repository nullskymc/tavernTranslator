"""
任务状态管理模块
提供任务生命周期管理、状态跟踪和取消控制功能
"""
import asyncio
import threading
import time
from enum import Enum
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass, field
from errors import TaskCancelledException, ErrorCode, TranslationError


class TaskStatus(Enum):
    """任务状态枚举"""
    PENDING = "pending"           # 等待开始
    RUNNING = "running"          # 正在执行
    PAUSED = "paused"           # 已暂停
    COMPLETED = "completed"      # 已完成
    FAILED = "failed"           # 执行失败
    CANCELLED = "cancelled"      # 已取消
    TIMEOUT = "timeout"         # 超时


@dataclass
class TaskInfo:
    """任务信息"""
    task_id: str
    status: TaskStatus = TaskStatus.PENDING
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    last_updated: float = field(default_factory=time.time)
    
    # 进度信息
    current_step: str = ""
    completed_steps: int = 0
    total_steps: int = 0
    progress_percentage: float = 0.0
    
    # 错误信息
    error: Optional[TranslationError] = None
    error_count: int = 0
    retry_count: int = 0
    
    # 任务数据
    data: Dict[str, Any] = field(default_factory=dict)
    
    def update_progress(self, current_step: str, completed_steps: int, total_steps: int):
        """更新进度信息"""
        self.current_step = current_step
        self.completed_steps = completed_steps
        self.total_steps = total_steps
        self.progress_percentage = (completed_steps / total_steps * 100) if total_steps > 0 else 0
        self.last_updated = time.time()
    
    def mark_started(self):
        """标记任务开始"""
        self.status = TaskStatus.RUNNING
        self.started_at = time.time()
        self.last_updated = time.time()
    
    def mark_completed(self):
        """标记任务完成"""
        self.status = TaskStatus.COMPLETED
        self.completed_at = time.time()
        self.last_updated = time.time()
    
    def mark_failed(self, error: TranslationError):
        """标记任务失败"""
        self.status = TaskStatus.FAILED
        self.error = error
        self.completed_at = time.time()
        self.last_updated = time.time()
    
    def mark_cancelled(self):
        """标记任务取消"""
        self.status = TaskStatus.CANCELLED
        self.completed_at = time.time()
        self.last_updated = time.time()
    
    def increment_error_count(self):
        """增加错误计数"""
        self.error_count += 1
        self.last_updated = time.time()
    
    def increment_retry_count(self):
        """增加重试计数"""
        self.retry_count += 1
        self.last_updated = time.time()
    
    def is_active(self) -> bool:
        """判断任务是否处于活动状态"""
        return self.status in [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.PAUSED]
    
    def is_finished(self) -> bool:
        """判断任务是否已结束"""
        return self.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED, TaskStatus.TIMEOUT]
    
    def get_duration(self) -> Optional[float]:
        """获取任务执行时长（秒）"""
        if not self.started_at:
            return None
        end_time = self.completed_at or time.time()
        return end_time - self.started_at


class TaskManager:
    """任务管理器"""
    
    def __init__(self):
        self._tasks: Dict[str, TaskInfo] = {}
        self._cancel_flags: Dict[str, threading.Event] = {}
        self._callbacks: Dict[str, Dict[str, Callable]] = {}
        self._lock = threading.RLock()
        
        # 任务清理配置
        self.cleanup_interval = 3600  # 1小时清理一次
        self.max_finished_tasks = 100  # 最多保留100个已完成任务
        self.task_timeout = 7200      # 任务超时时间（2小时）
        
        # 启动清理任务
        self._cleanup_timer = None
        self._start_cleanup_timer()
    
    def create_task(self, task_id: str, total_steps: int = 0) -> TaskInfo:
        """创建新任务"""
        with self._lock:
            if task_id in self._tasks:
                raise ValueError(f"任务 {task_id} 已存在")
            
            task_info = TaskInfo(
                task_id=task_id,
                total_steps=total_steps
            )
            self._tasks[task_id] = task_info
            self._cancel_flags[task_id] = threading.Event()
            self._callbacks[task_id] = {}
            
            return task_info
    
    def get_task(self, task_id: str) -> Optional[TaskInfo]:
        """获取任务信息"""
        with self._lock:
            return self._tasks.get(task_id)
    
    def start_task(self, task_id: str) -> bool:
        """启动任务"""
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            
            if task.status != TaskStatus.PENDING:
                return False
            
            task.mark_started()
            self._trigger_callback(task_id, 'on_start', task)
            return True
    
    def update_task_progress(self, task_id: str, current_step: str, 
                           completed_steps: int, total_steps: Optional[int] = None):
        """更新任务进度"""
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            
            if total_steps is not None:
                task.total_steps = total_steps
            
            task.update_progress(current_step, completed_steps, task.total_steps)
            self._trigger_callback(task_id, 'on_progress', task)
            return True
    
    def complete_task(self, task_id: str):
        """完成任务"""
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            
            task.mark_completed()
            self._trigger_callback(task_id, 'on_complete', task)
            self._cleanup_task_resources(task_id)
            return True
    
    def fail_task(self, task_id: str, error: TranslationError):
        """标记任务失败"""
        with self._lock:
            task = self._tasks.get(task_id)
            if not task:
                return False
            
            task.mark_failed(error)
            self._trigger_callback(task_id, 'on_error', task, error)
            self._cleanup_task_resources(task_id)
            return True
    
    def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        with self._lock:
            task = self._tasks.get(task_id)
            if not task or task.is_finished():
                return False
            
            # 设置取消标志
            if task_id in self._cancel_flags:
                self._cancel_flags[task_id].set()
            
            task.mark_cancelled()
            self._trigger_callback(task_id, 'on_cancel', task)
            # 注意：不要立即清理资源，因为可能还有地方需要检查取消标志
            return True
    
    def is_task_cancelled(self, task_id: str) -> bool:
        """检查任务是否被取消"""
        with self._lock:
            cancel_flag = self._cancel_flags.get(task_id)
            return cancel_flag.is_set() if cancel_flag else False
    
    def check_task_cancellation(self, task_id: str):
        """检查任务取消状态，如果已取消则抛出异常"""
        if self.is_task_cancelled(task_id):
            raise TaskCancelledException()
    
    def increment_task_error(self, task_id: str):
        """增加任务错误计数"""
        with self._lock:
            task = self._tasks.get(task_id)
            if task:
                task.increment_error_count()
    
    def increment_task_retry(self, task_id: str):
        """增加任务重试计数"""
        with self._lock:
            task = self._tasks.get(task_id)
            if task:
                task.increment_retry_count()
    
    def set_task_callback(self, task_id: str, event: str, callback: Callable):
        """设置任务回调函数"""
        with self._lock:
            if task_id not in self._callbacks:
                self._callbacks[task_id] = {}
            self._callbacks[task_id][event] = callback
    
    def remove_task_callback(self, task_id: str, event: str):
        """移除任务回调函数"""
        with self._lock:
            if task_id in self._callbacks:
                self._callbacks[task_id].pop(event, None)
    
    def get_all_tasks(self) -> Dict[str, TaskInfo]:
        """获取所有任务信息"""
        with self._lock:
            return self._tasks.copy()
    
    def get_active_tasks(self) -> Dict[str, TaskInfo]:
        """获取所有活动任务"""
        with self._lock:
            return {k: v for k, v in self._tasks.items() if v.is_active()}
    
    def get_finished_tasks(self) -> Dict[str, TaskInfo]:
        """获取所有已完成任务"""
        with self._lock:
            return {k: v for k, v in self._tasks.items() if v.is_finished()}
    
    def cleanup_old_tasks(self):
        """清理旧任务"""
        with self._lock:
            current_time = time.time()
            finished_tasks = self.get_finished_tasks()
            
            # 按完成时间排序，保留最新的任务
            sorted_tasks = sorted(
                finished_tasks.items(),
                key=lambda x: x[1].completed_at or 0,
                reverse=True
            )
            
            # 移除超出限制的任务
            if len(sorted_tasks) > self.max_finished_tasks:
                tasks_to_remove = sorted_tasks[self.max_finished_tasks:]
                for task_id, _ in tasks_to_remove:
                    self._remove_task(task_id)
            
            # 清理已完成超过5分钟的任务的资源
            for task_id, task in finished_tasks.items():
                if (task.completed_at and 
                    current_time - task.completed_at > 300):  # 5分钟
                    self._cleanup_task_resources(task_id)
            
            # 检查超时任务
            for task_id, task in self._tasks.items():
                if (task.is_active() and task.started_at and 
                    current_time - task.started_at > self.task_timeout):
                    task.status = TaskStatus.TIMEOUT
                    task.completed_at = current_time
                    self._trigger_callback(task_id, 'on_timeout', task)
    
    def _trigger_callback(self, task_id: str, event: str, *args):
        """触发回调函数"""
        callbacks = self._callbacks.get(task_id, {})
        callback = callbacks.get(event)
        if callback:
            try:
                callback(*args)
            except Exception as e:
                # 回调函数出错不应该影响主流程
                print(f"回调函数执行出错 ({task_id}.{event}): {e}")
    
    def _cleanup_task_resources(self, task_id: str):
        """清理任务相关资源"""
        # 清理取消标志
        if task_id in self._cancel_flags:
            del self._cancel_flags[task_id]
        
        # 清理回调函数
        if task_id in self._callbacks:
            del self._callbacks[task_id]
    
    def _remove_task(self, task_id: str):
        """完全移除任务"""
        if task_id in self._tasks:
            del self._tasks[task_id]
        self._cleanup_task_resources(task_id)
    
    def _start_cleanup_timer(self):
        """启动清理定时器"""
        def cleanup_worker():
            try:
                self.cleanup_old_tasks()
            except Exception as e:
                print(f"任务清理出错: {e}")
            finally:
                # 重新启动定时器
                self._cleanup_timer = threading.Timer(self.cleanup_interval, cleanup_worker)
                self._cleanup_timer.daemon = True
                self._cleanup_timer.start()
        
        self._cleanup_timer = threading.Timer(self.cleanup_interval, cleanup_worker)
        self._cleanup_timer.daemon = True
        self._cleanup_timer.start()
    
    def shutdown(self):
        """关闭任务管理器"""
        with self._lock:
            # 取消所有活动任务
            active_tasks = self.get_active_tasks()
            for task_id in active_tasks:
                self.cancel_task(task_id)
            
            # 停止清理定时器
            if self._cleanup_timer:
                self._cleanup_timer.cancel()


# 全局任务管理器实例
task_manager = TaskManager()


def get_task_manager() -> TaskManager:
    """获取全局任务管理器实例"""
    return task_manager
