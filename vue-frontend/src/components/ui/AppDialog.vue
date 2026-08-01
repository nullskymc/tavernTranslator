<script setup lang="ts">
/**
 * AppDialog — 模态对话框，使用原生 <dialog> 元素
 * 支持 Escape/遮罩关闭、焦点管理、ARIA 属性
 */
import { ref, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

interface Props {
  open: boolean;
  title?: string;
  width?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: '520px',
  closeOnBackdrop: true,
  closeOnEscape: true,
});

const emit = defineEmits<{ close: [] }>();
const dialogRef = ref<HTMLDialogElement>();

watch(() => props.open, async (val) => {
  await nextTick();
  const dialog = dialogRef.value;
  if (!dialog) return;

  // ConfirmDialog 使用 v-if 按需挂载，首次挂载时 open 已经是 true，
  // 因此必须立即同步原生 dialog 状态，而不能只等待后续 prop 变化。
  if (val && !dialog.open) {
    dialog.showModal();
  } else if (!val && dialog.open) {
    dialog.close();
  }
}, { immediate: true });

function onClose() {
  emit('close');
}

/** Escape 键触发 cancel 事件；closeOnEscape=false 时阻止关闭 */
function onCancel(e: Event) {
  if (!props.closeOnEscape) {
    e.preventDefault();
  }
}

function onBackdropClick(e: MouseEvent) {
  // 点击 dialog 背景（非内容区域）时关闭
  if (e.target === dialogRef.value && props.closeOnBackdrop) {
    emit('close');
  }
}
</script>

<template>
  <dialog
    ref="dialogRef"
    class="app-dialog"
    :style="{ '--dialog-width': width }"
    :aria-label="title || $t('common.dialog')"
    @close="onClose"
    @cancel="onCancel"
    @click="onBackdropClick"
  >
    <div class="app-dialog__content" role="document">
      <header v-if="title || $slots.header" class="app-dialog__header">
        <slot name="header">
          <h2 class="app-dialog__title">{{ title }}</h2>
        </slot>
        <button class="app-dialog__close" :aria-label="$t('common.close')" @click="emit('close')">✕</button>
      </header>
      <div class="app-dialog__body">
        <slot />
      </div>
      <footer v-if="$slots.footer" class="app-dialog__footer">
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.app-dialog {
  border: none;
  border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.3));
  padding: 0;
  max-width: 90vw;
  width: var(--dialog-width, 520px);
  background: var(--color-surface, #fff);
  color: var(--color-text, #1f2937);
}
.app-dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
.app-dialog__content { display: flex; flex-direction: column; max-height: 85vh; }
.app-dialog__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--color-border, #e5e7eb);
}
.app-dialog__title { margin: 0; font-size: 16px; font-weight: 600; }
.app-dialog__close {
  background: none; border: none; font-size: 18px; cursor: pointer;
  color: var(--color-text-secondary, #6b7280); padding: 4px 8px; border-radius: 4px;
}
.app-dialog__close:hover { background: var(--color-border, #e5e7eb); }
.app-dialog__body { padding: 20px; overflow-y: auto; flex: 1; }
.app-dialog__footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 20px; border-top: 1px solid var(--color-border, #e5e7eb);
}
</style>
