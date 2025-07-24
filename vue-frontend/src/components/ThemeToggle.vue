<template>
  <el-button class="theme-button" circle @click="toggleTheme">
    <el-icon><component :is="isDarkTheme ? Sunny : Moon" /></el-icon>
  </el-button>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useThemeStore } from '../stores/theme'
import { Sunny, Moon } from '@element-plus/icons-vue'

const themeStore = useThemeStore()
const { isDarkTheme } = storeToRefs(themeStore)
const { toggleTheme } = themeStore
</script>

<style scoped>


.theme-button {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  background-color: var(--el-fill-color-light);
  border: none;
  color: var(--el-text-color-primary);
}

.theme-button:hover {
  background-color: var(--el-color-primary-light-9);
}

.theme-button .el-icon {
  font-size: 18px;
  transition: color 0.3s ease;
}

.button-text {
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: var(--el-text-color-primary);
  font-size: 0.8em;
  margin-left: 8px;
}

.dark-theme .button-text {
  color: var(--text-primary) !important;
}

.theme-toggle:hover .button-text {
  opacity: 1;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .theme-toggle {
    width: 100%;
    height: 50px;
    border-radius: 25px;
    justify-content: flex-start;
    padding: 0 16px;
  }
  
  .theme-toggle:hover {
    width: 100%;
  }
  
  .theme-button {
    width: 50px;
    height: 50px;
  }
  
  .button-text {
    opacity: 1;
    margin-left: 12px;
  }
}

@media (max-width: 480px) {
  .theme-toggle {
    height: 45px;
    padding: 0 12px;
  }
  
  .theme-button {
    width: 45px;
    height: 45px;
  }
  
  .theme-button .el-icon {
    font-size: 16px;
  }
  
  .button-text {
    font-size: 0.85em;
  }
}
</style>
