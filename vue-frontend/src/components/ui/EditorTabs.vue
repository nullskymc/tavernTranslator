<template>
  <div
    class="editor-tabs"
    ref="containerEl"
    role="tablist"
    aria-label="Editor view switch"
  >
    <!-- Sliding underline indicator -->
    <div
      class="indicator"
      v-show="indicatorWidth > 0"
      :style="{ width: indicatorWidth + 'px', transform: `translateX(${indicatorLeft}px)` }"
      aria-hidden="true"
    />
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="tab"
      :class="{ active: modelValue === tab.value }"
      role="tab"
      :aria-selected="modelValue === tab.value"
      tabindex="0"
      @click="emit('update:modelValue', tab.value)"
      @keydown.enter.prevent="emit('update:modelValue', tab.value)"
      @keydown.space.prevent="emit('update:modelValue', tab.value)"
      :data-value="tab.value"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue';

interface TabItem {
  label: string;
  value: string;
}

const props = defineProps<{ modelValue: string; tabs: TabItem[] }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const containerEl = ref<HTMLElement | null>(null);
const indicatorLeft = ref(0);
const indicatorWidth = ref(0);

function updateIndicator() {
  const container = containerEl.value;
  if (!container) { indicatorWidth.value = 0; return; }
  const activeEl = container.querySelector(`.tab[data-value="${props.modelValue}"]`) as HTMLElement | null;
  if (!activeEl) { indicatorWidth.value = 0; return; }
  indicatorLeft.value = activeEl.offsetLeft;
  indicatorWidth.value = activeEl.offsetWidth;
}

onMounted(async () => {
  await nextTick();
  updateIndicator();
  window.addEventListener('resize', updateIndicator);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIndicator);
});

watch(() => props.modelValue, async () => {
  await nextTick();
  updateIndicator();
});

watch(() => props.tabs, async () => {
  await nextTick();
  updateIndicator();
}, { deep: true });
</script>

<style scoped>
.editor-tabs {
  display: inline-flex;
  position: relative;
  align-items: stretch;
  border-bottom: 1px solid var(--apple-border-color);
  gap: 0;
  user-select: none;
}

/* Bottom sliding underline */
.indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  border-radius: 1px;
  background-color: var(--apple-text-color-primary);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              width 200ms cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  pointer-events: none;
}

.tab {
  padding: 10px 16px;
  cursor: pointer;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--apple-text-color-tertiary);
  position: relative;
  transition: color 150ms ease;
  white-space: nowrap;
  letter-spacing: 0.01em;
  line-height: 1.5;
}

.tab:hover {
  color: var(--apple-text-color-secondary);
}

.tab.active {
  color: var(--apple-text-color-primary);
  font-weight: 600;
}

.tab:focus-visible {
  outline: 2px solid var(--apple-color-primary);
  outline-offset: -2px;
  border-radius: 4px;
}

.tab:active {
  opacity: 0.75;
}

@media (prefers-reduced-motion: reduce) {
  .indicator {
    transition: none;
  }
}
</style>
