/**
 * useToast — 轻量 Toast 通知 composable
 * 替代 ElMessage / ElNotification
 * duration 为 0 时通知常驻，需通过 close(id) 手动关闭
 */
import { ref } from 'vue';

export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number; // 0 表示常驻
}

// 全局单例状态（跨组件共享）
const toasts = ref<ToastItem[]>([]);
let nextId = 0;

/** 添加一条 toast；duration<=0 时常驻，否则到点自动移除 */
function push(type: ToastItem['type'], message: string, duration = 3000): number {
  const id = nextId++;
  toasts.value.push({ id, type, message, duration });
  if (duration > 0) {
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, duration);
  }
  return id;
}

/** 手动关闭指定 toast（用于常驻通知） */
function close(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

export function useToast() {
  return {
    toasts,
    success: (msg: string, duration?: number) => push('success', msg, duration),
    error: (msg: string, duration?: number) => push('error', msg, duration),
    warning: (msg: string, duration?: number) => push('warning', msg, duration),
    info: (msg: string, duration?: number) => push('info', msg, duration),
    close,
  };
}
