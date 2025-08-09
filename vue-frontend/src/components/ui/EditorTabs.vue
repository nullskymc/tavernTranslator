<template>
  <div class="editor-tabs">
    <div
      v-for="tab in tabs"
      :key="tab.value"
      class="tab"
      :class="{ active: modelValue === tab.value }"
      @click="$emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface TabItem {
  label: string;
  value: string;
}

const props = defineProps<{ modelValue: string; tabs: TabItem[] }>();
</script>

<style scoped>
.editor-tabs {
  display: flex;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.tab {
  padding: 8px 16px;
  cursor: pointer;
  background-color: var(--el-fill-color-light);
  transition: all 0.3s;
  border-right: 1px solid var(--el-border-color-light);
  position: relative;
}

.tab:last-child {
  border-right: none;
}

.tab:hover {
  background-color: var(--el-fill-color);
}

.tab.active {
  background-color: var(--el-color-primary);
  color: white;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: white;
}
</style>
