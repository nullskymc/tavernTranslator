/**
 * 轻量 UI 基础组件 — 统一导出
 * 替代 Element Plus 的 ElButton/ElDialog/ElInput/ElSelect/ElMessage 等
 */
export { default as AppButton } from './AppButton.vue';
export { default as AppDialog } from './AppDialog.vue';
export { default as AppInput } from './AppInput.vue';
export { default as AppSelect } from './AppSelect.vue';
export { default as AppSwitch } from './AppSwitch.vue';
export { default as AppToast } from './AppToast.vue';
export { default as ConfirmDialog } from './ConfirmDialog.vue';
export { useToast } from './useToast';
export type { ToastItem } from './useToast';
export { useConfirm } from './useConfirm';
export type { ConfirmOptions } from './useConfirm';
