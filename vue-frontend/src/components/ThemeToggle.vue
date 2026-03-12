<template>
  <el-tooltip :content="isDarkTheme ? $t('sidebar.actions.theme') + ' (Light)' : $t('sidebar.actions.theme') + ' (Dark)'" placement="top">
    <button class="control-btn" @click="toggleTheme" :aria-label="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'">
      <el-icon><component :is="isDarkTheme ? Sunny : Moon" /></el-icon>
    </button>
  </el-tooltip>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useThemeStore } from '../stores/theme';
import { Sunny, Moon } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const themeStore = useThemeStore();
const { isDarkTheme } = storeToRefs(themeStore);
const { toggleTheme } = themeStore;
</script>

<style scoped>
.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--apple-border-radius-medium);
  border: 1px solid var(--apple-border-color);
  background-color: var(--apple-bg-color);
  color: var(--apple-text-color-secondary);
  cursor: pointer;
  font-size: 15px;
  transition: all var(--apple-transition-duration) var(--apple-transition-easing);
  flex-shrink: 0;
}

.control-btn:hover {
  background-color: var(--apple-color-gray-5);
  color: var(--apple-text-color-primary);
  border-color: var(--apple-border-color-strong);
}

.control-btn:active {
  background-color: var(--apple-color-gray-4);
}
</style>
