<script setup lang="ts">
/**
 * AppInput — 文本输入/文本域包装组件
 * 使用原生 <input>/<textarea>，支持 v-model
 * type: text | textarea | password | number
 * autosize: textarea 随内容自动调整高度（1~maxRows）
 */
import { ref, nextTick, onMounted } from 'vue';

interface Props {
  modelValue: string | number;
  type?: 'text' | 'textarea' | 'password' | 'number';
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  label?: string;
  autosize?: boolean;
  maxRows?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  rows: 4,
  label: '',
  autosize: false,
  maxRows: 4,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  keydown: [event: KeyboardEvent];
}>();

const inputEl = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

function onInput(e: Event) {
  const target = e.target as HTMLInputElement | HTMLTextAreaElement;
  // number 类型将字符串转换为数字，避免类型漂移
  if (props.type === 'number') {
    emit('update:modelValue', target.value === '' ? '' : Number(target.value));
  } else {
    emit('update:modelValue', target.value);
  }
  if (props.type === 'textarea' && props.autosize) {
    autoGrow(target as HTMLTextAreaElement);
  }
}

function onKeydown(e: KeyboardEvent) {
  emit('keydown', e);
}

/** textarea 自动高度：内容撑高，且不超过 maxRows 行 */
function autoGrow(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
  const maxHeight = lineHeight * props.maxRows;
  const next = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${Math.max(next, lineHeight)}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

/** 聚焦内部输入元素 */
function focus() {
  inputEl.value?.focus();
}

onMounted(() => {
  if (props.type === 'textarea' && props.autosize && inputEl.value) {
    autoGrow(inputEl.value as HTMLTextAreaElement);
  }
});

defineExpose({ focus });
</script>

<template>
  <div class="app-input-wrapper">
    <label v-if="label" class="app-input__label">{{ label }}</label>
    <textarea
      v-if="type === 'textarea'"
      ref="inputEl"
      class="app-input app-input--textarea"
      :class="{ 'app-input--autosize': autosize }"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :aria-label="label || placeholder"
      @input="onInput"
      @keydown="onKeydown"
    />
    <input
      v-else
      ref="inputEl"
      class="app-input"
      :type="type === 'number' ? 'number' : type === 'password' ? 'password' : 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="label || placeholder"
      @input="onInput"
      @keydown="onKeydown"
    />
  </div>
</template>

<style scoped>
.app-input-wrapper { display: flex; flex-direction: column; gap: 4px; }
.app-input__label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary, #6b7280); }
.app-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: var(--radius-md, 8px);
  background: var(--color-bg, #fff);
  color: var(--color-text, #1f2937);
  font-size: 14px;
  transition: border-color 0.15s;
  box-sizing: border-box;
  font-family: inherit;
}
.app-input:focus { outline: none; border-color: var(--color-primary, #3b82f6); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent); }
.app-input:disabled { opacity: 0.5; cursor: not-allowed; }
.app-input--textarea { resize: vertical; min-height: 80px; }
.app-input--autosize { resize: none; min-height: 0; line-height: 1.65; padding-top: 10px; padding-bottom: 10px; }
</style>
