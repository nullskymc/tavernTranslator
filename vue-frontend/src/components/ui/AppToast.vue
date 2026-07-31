<script setup lang="ts">
/**
 * AppToast — Toast 通知容器，固定于右上角
 * 在 App.vue 中全局挂载一次即可
 */
import { useToast } from './useToast';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const { toasts } = useToast();

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" role="region" :aria-label="$t('common.notifications')" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast--${toast.type}`]"
          role="alert"
        >
          <span class="toast__icon">{{ icons[toast.type] }}</span>
          <span class="toast__msg">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-md, 8px);
  background: var(--color-surface, #fff);
  box-shadow: var(--shadow-lg, 0 4px 20px rgba(0,0,0,0.15));
  font-size: 14px;
  color: var(--color-text, #1f2937);
  pointer-events: auto;
  max-width: 360px;
}
.toast__icon { font-size: 14px; flex-shrink: 0; }
.toast--success .toast__icon { color: var(--color-success, #22c55e); }
.toast--error .toast__icon { color: var(--color-danger, #ef4444); }
.toast--warning .toast__icon { color: var(--color-warning, #f59e0b); }
.toast--info .toast__icon { color: var(--color-primary, #3b82f6); }

/* Transition */
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
