<script setup lang="ts">
/**
 * ConfirmDialog — 确认对话框，基于 AppDialog
 * 替代 ElMessageBox.confirm
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from './AppDialog.vue';
import AppButton from './AppButton.vue';

const { t: $t } = useI18n();

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  confirmText: '',
  cancelText: '',
  type: 'warning',
});

/** 未传入时使用本地化默认文案 */
const resolvedTitle = computed(() => props.title || $t('messages.confirm.title'));
const resolvedConfirmText = computed(() => props.confirmText || $t('messages.confirm.confirm'));
const resolvedCancelText = computed(() => props.cancelText || $t('messages.confirm.cancel'));

const emit = defineEmits<{ confirm: []; cancel: []; close: [] }>();
</script>

<template>
  <AppDialog :open="open" :title="resolvedTitle" width="400px" @close="emit('close')">
    <p class="confirm-msg">{{ message }}</p>
    <template #footer>
      <AppButton variant="default" @click="emit('cancel')">{{ resolvedCancelText }}</AppButton>
      <AppButton :variant="type === 'danger' ? 'danger' : 'primary'" @click="emit('confirm')">
        {{ resolvedConfirmText }}
      </AppButton>
    </template>
  </AppDialog>
</template>

<style scoped>
.confirm-msg {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text, #1f2937);
}
</style>
