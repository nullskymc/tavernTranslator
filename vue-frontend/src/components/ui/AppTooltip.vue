<script setup lang="ts">
/**
 * 轻量悬浮提示，替代 Element Plus Tooltip。
 * 使用 CSS 定位，不引入运行时依赖；包裹禁用按钮时仍能显示提示。
 */
import { nextTick, onBeforeUnmount, reactive, ref } from 'vue';

interface Props {
  content: string;
  placement?: 'top' | 'bottom';
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'top',
});

const triggerRef = ref<HTMLElement>();
const tooltipRef = ref<HTMLElement>();
const visible = ref(false);
const position = reactive({ left: '0px', top: '0px' });

/** 将 tooltip 固定到视口内，避免靠近浏览器边缘时被裁切。 */
const updatePosition = async () => {
  await nextTick();
  const trigger = triggerRef.value;
  const tooltip = tooltipRef.value;
  if (!trigger || !tooltip) return;

  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const margin = 8;
  const shouldPlaceTop = props.placement === 'top'
    && triggerRect.top >= tooltipRect.height + gap + margin;
  const top = shouldPlaceTop
    ? triggerRect.top - tooltipRect.height - gap
    : triggerRect.bottom + gap;
  const minLeft = margin + tooltipRect.width / 2;
  const maxLeft = window.innerWidth - margin - tooltipRect.width / 2;
  const centerLeft = triggerRect.left + triggerRect.width / 2;

  position.left = `${Math.min(Math.max(centerLeft, minLeft), maxLeft)}px`;
  position.top = `${Math.min(top, window.innerHeight - tooltipRect.height - margin)}px`;
};

const show = () => {
  visible.value = true;
  updatePosition();
};

const hide = () => {
  visible.value = false;
};

const reposition = () => {
  if (visible.value) updatePosition();
};

window.addEventListener('resize', reposition);
window.addEventListener('scroll', reposition, true);
onBeforeUnmount(() => {
  window.removeEventListener('resize', reposition);
  window.removeEventListener('scroll', reposition, true);
});
</script>

<template>
  <span
    ref="triggerRef"
    class="app-tooltip"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <span
      v-if="visible"
      ref="tooltipRef"
      class="app-tooltip__content"
      role="tooltip"
      :style="{ left: position.left, top: position.top }"
    >{{ content }}</span>
  </span>
</template>

<style scoped>
.app-tooltip {
  position: relative;
  display: inline-flex;
}

.app-tooltip__content {
  position: fixed;
  z-index: 30;
  width: max-content;
  max-width: 240px;
  padding: 6px 9px;
  border: 1px solid var(--apple-border-color, rgba(0, 0, 0, 0.12));
  border-radius: 7px;
  background: var(--apple-text-color-primary, #1f2937);
  color: var(--apple-bg-color, #fff);
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.18);
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
  pointer-events: none;
  transform: translateX(-50%);
}
</style>
