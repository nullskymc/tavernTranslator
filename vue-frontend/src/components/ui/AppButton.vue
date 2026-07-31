<script setup lang="ts">
/**
 * AppButton — 轻量按钮组件，替代 ElButton
 * 支持 variant/size/loading/disabled/plain，使用原生 <button>
 * variant: primary | default | danger | text
 * plain: 轮廓样式（透明底 + 主题色文字/边框）
 */
interface Props {
  variant?: 'primary' | 'default' | 'danger' | 'text';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  plain?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
  plain: false,
});
</script>

<template>
  <button
    :type="type"
    :class="[
      'app-btn',
      `app-btn--${variant}`,
      `app-btn--${size}`,
      { 'app-btn--plain': plain },
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading"
  >
    <span v-if="loading" class="app-btn__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: var(--radius-md, 8px);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--color-surface, #fff);
  color: var(--color-text, #1f2937);
  line-height: 1;
  font-family: inherit;
}
.app-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.app-btn:not(:disabled):hover { border-color: var(--color-primary, #3b82f6); color: var(--color-primary, #3b82f6); }
.app-btn:not(:disabled):active { transform: scale(0.97); }

/* Variants */
.app-btn--primary { background: var(--color-primary, #3b82f6); border-color: var(--color-primary, #3b82f6); color: #fff; }
.app-btn--primary:not(:disabled):hover { opacity: 0.9; color: #fff; }
.app-btn--danger { background: var(--color-danger, #ef4444); border-color: var(--color-danger, #ef4444); color: #fff; }
.app-btn--danger:not(:disabled):hover { opacity: 0.9; color: #fff; }
.app-btn--text { border-color: transparent; background: transparent; }
.app-btn--text:not(:disabled):hover { background: color-mix(in srgb, var(--color-primary, #3b82f6) 8%, transparent); }

/* Plain (outline) variants */
.app-btn--plain { background: transparent; }
.app-btn--primary.app-btn--plain {
  color: var(--color-primary, #3b82f6);
  border-color: color-mix(in srgb, var(--color-primary, #3b82f6) 45%, transparent);
  background: color-mix(in srgb, var(--color-primary, #3b82f6) 6%, transparent);
}
.app-btn--primary.app-btn--plain:not(:disabled):hover {
  background: var(--color-primary, #3b82f6);
  color: #fff;
  border-color: var(--color-primary, #3b82f6);
}
.app-btn--danger.app-btn--plain {
  color: var(--color-danger, #ef4444);
  border-color: color-mix(in srgb, var(--color-danger, #ef4444) 45%, transparent);
  background: transparent;
}
.app-btn--danger.app-btn--plain:not(:disabled):hover {
  background: var(--color-danger, #ef4444);
  color: #fff;
  border-color: var(--color-danger, #ef4444);
}

/* Sizes */
.app-btn--sm { padding: 5px 10px; font-size: 12px; }
.app-btn--md { padding: 8px 16px; font-size: 14px; }
.app-btn--lg { padding: 11px 22px; font-size: 16px; }

/* Spinner */
.app-btn__spinner {
  width: 14px; height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
