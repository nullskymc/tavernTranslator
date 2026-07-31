<script setup lang="ts">
/**
 * AppSelect — 原生 <select> 包装组件，支持 v-model
 */
interface Option {
  label: string;
  value: string;
}

interface Props {
  modelValue: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  label: '',
});

/** 未传 placeholder 时使用本地化占位文案 */
const placeholderText = computed(() => props.placeholder || $t('common.selectPlaceholder'));

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <div class="app-select-wrapper">
    <label v-if="label" class="app-select__label">{{ label }}</label>
    <select
      class="app-select"
      :value="modelValue"
      :disabled="disabled"
      :aria-label="label || placeholderText"
      @change="onChange"
    >
      <option v-if="placeholderText" value="" disabled>{{ placeholderText }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.app-select-wrapper { display: flex; flex-direction: column; gap: 4px; }
.app-select__label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary, #6b7280); }
.app-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: var(--radius-md, 8px);
  background: var(--color-bg, #fff);
  color: var(--color-text, #1f2937);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.15s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
.app-select:focus { outline: none; border-color: var(--color-primary, #3b82f6); }
.app-select:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
