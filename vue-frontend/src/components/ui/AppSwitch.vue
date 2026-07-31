<script setup lang="ts">
/**
 * AppSwitch — 开关组件，使用原生 checkbox + CSS 轨道
 * 替代 el-switch，保留键盘操作与 ARIA
 */
interface Props {
  modelValue: boolean;
  disabled?: boolean;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  label: '',
});

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).checked);
}
</script>

<template>
  <label
    class="app-switch"
    :class="{ 'app-switch--disabled': disabled }"
  >
    <input
      type="checkbox"
      class="app-switch__input"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="label"
      @change="onChange"
    />
    <span class="app-switch__track" aria-hidden="true">
      <span class="app-switch__thumb" />
    </span>
  </label>
</template>

<style scoped>
.app-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  width: fit-content;
}
.app-switch--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.app-switch__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.app-switch__track {
  width: 40px;
  height: 22px;
  border-radius: var(--apple-border-radius-full);
  background: var(--apple-color-gray-4);
  transition: background-color 0.2s var(--apple-transition-easing);
  position: relative;
  flex-shrink: 0;
}
.app-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--apple-shadow-small);
  transition: transform 0.2s var(--apple-transition-spring);
}
.app-switch__input:checked + .app-switch__track {
  background: var(--apple-color-primary);
}
.app-switch__input:checked + .app-switch__track .app-switch__thumb {
  transform: translateX(18px);
}
.app-switch__input:focus-visible + .app-switch__track {
  outline: 2px solid var(--apple-color-primary);
  outline-offset: 2px;
}
</style>
