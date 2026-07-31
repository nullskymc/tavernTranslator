/**
 * useConfirm — Promise 化的确认对话框状态
 * 替代 ElMessageBox.confirm
 *
 * 用法：
 *   const { confirm } = useConfirm();
 *   const ok = await confirm({ message: '确定删除吗？' });
 *
 * 在 App.vue 中挂载一个 ConfirmDialog 并绑定 state / settle 即可全局复用。
 */
import { reactive } from 'vue';
import i18n from '@/i18n';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'warning' | 'danger';
  resolve?: (value: boolean) => void;
}

// 全局单例状态（跨组件/跨 store 共享）
const state = reactive<ConfirmState>({
  open: false,
  title: i18n.global.t('messages.confirm.title'),
  message: '',
  confirmText: i18n.global.t('messages.confirm.confirm'),
  cancelText: i18n.global.t('messages.confirm.cancel'),
  type: 'warning',
});

export function useConfirm() {
  /** 打开确认框并返回 Promise<boolean>（true=确认，false=取消） */
  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    state.open = true;
    state.title = options.title ?? i18n.global.t('messages.confirm.title');
    state.message = options.message;
    state.confirmText = options.confirmText ?? i18n.global.t('messages.confirm.confirm');
    state.cancelText = options.cancelText ?? i18n.global.t('messages.confirm.cancel');
    state.type = options.type ?? 'warning';
    return new Promise((resolve) => {
      state.resolve = resolve;
    });
  };

  /** 由 ConfirmDialog 回调调用，结算结果并关闭 */
  const settle = (value: boolean) => {
    state.open = false;
    state.resolve?.(value);
    state.resolve = undefined;
  };

  return { state, confirm, settle };
}
