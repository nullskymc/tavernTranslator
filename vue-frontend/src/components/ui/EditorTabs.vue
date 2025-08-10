<template>
  <div
    class="editor-tabs"
    ref="containerEl"
    role="tablist"
    aria-label="Editor view switch"
  >
    <!-- Sliding indicator -->
    <div 
      class="indicator"
      v-show="indicatorWidth > 0"
      :style="{ width: indicatorWidth + 'px', transform: `translateX(${indicatorLeft}px)` }"
      aria-hidden="true"
    />
    <div
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
    </div>
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

// container element to measure active tab
const containerEl = ref<HTMLElement | null>(null);

const indicatorLeft = ref(0);
const indicatorWidth = ref(0);

function updateIndicator() {
  const container = containerEl.value;
  if (!container) {
    indicatorWidth.value = 0;
    indicatorLeft.value = 0;
    return;
  }
  const activeEl = container.querySelector(`.tab[data-value="${props.modelValue}"]`) as HTMLElement | null;
  if (!activeEl) {
    indicatorWidth.value = 0;
    indicatorLeft.value = 0;
    return;
  }
  // Compute left relative to container
  const left = activeEl.offsetLeft;
  const width = activeEl.offsetWidth;
  indicatorLeft.value = left;
  indicatorWidth.value = width;
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
  --segmented-height: 34px;
  --segmented-padding: 4px;
  display: inline-flex;
  background: color-mix(in oklab, var(--apple-bg-color-secondary) 92%, transparent);
  backdrop-filter: saturate(120%) blur(8px);
  -webkit-backdrop-filter: saturate(120%) blur(8px);
  border: 1px solid var(--apple-border-color, rgba(0,0,0,0.08));
  border-radius: 999px;
  overflow: hidden;
  padding: var(--segmented-padding);
  position: relative;
  align-items: center;
  gap: 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.04);
  user-select: none;
}

.indicator {
  position: absolute;
  top: var(--segmented-padding);
  bottom: var(--segmented-padding);
  left: 0;
  border-radius: 999px;
  background: linear-gradient(
      180deg,
      color-mix(in oklab, var(--apple-color-primary) 98%, white 2%),
      color-mix(in oklab, var(--apple-color-primary) 92%, black 8%)
    );
  box-shadow: 0 4px 10px color-mix(in oklab, var(--apple-color-primary) 16%, black 0%), var(--apple-shadow-small);
  transition: transform var(--apple-transition-duration, 220ms) var(--apple-transition-easing, ease), width var(--apple-transition-duration, 220ms) var(--apple-transition-easing, ease);
  z-index: 0;
  pointer-events: none;
}

.tab {
  padding: 8px 16px;
  cursor: pointer;
  background-color: transparent;
  transition: color var(--apple-transition-duration, 200ms) var(--apple-transition-easing, ease), background-color var(--apple-transition-duration, 200ms) var(--apple-transition-easing, ease), transform 120ms ease;
  border-radius: 999px;
  position: relative;
  font-weight: 500;
  color: var(--apple-text-color-secondary);
  z-index: 1; /* Above indicator */
  line-height: calc(var(--segmented-height) - var(--segmented-padding) * 2);
  height: calc(var(--segmented-height) - var(--segmented-padding) * 2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
}

.tab:hover {
  background-color: color-mix(in oklab, var(--apple-bg-color-tertiary) 60%, transparent);
  color: var(--apple-text-color-primary);
}

.tab.active {
  background-color: transparent; /* use indicator as background */
  color: var(--apple-text-color-inverse);
  font-weight: 600;
}

.tab:active {
  transform: translateY(0.5px) scale(0.99);
}

.tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--apple-color-primary) 30%, transparent);
  border-radius: 999px;
}

@media (prefers-reduced-motion: reduce) {
  .indicator {
    transition: none;
  }
  .tab {
    transition: none;
  }
}
</style>
