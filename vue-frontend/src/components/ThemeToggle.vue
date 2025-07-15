<template>
  <div class="theme-toggle" @click="toggleTheme" :title="isDarkTheme ? '切换到亮色模式' : '切换到暗色模式'">
    <i :class="isDarkTheme ? 'fas fa-sun' : 'fas fa-moon'"></i>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()
const { isDarkTheme } = storeToRefs(themeStore)
const { toggleTheme } = themeStore
</script>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  background: var(--theme-toggle-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.theme-toggle i {
  font-size: 20px;
  color: var(--theme-toggle-text);
  transition: color 0.3s ease;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .theme-toggle {
    top: 70px; /* 为移动端头部留出空间 */
    right: 16px;
    width: 44px;
    height: 44px;
  }
  
  .theme-toggle i {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .theme-toggle {
    top: 66px;
    right: 12px;
    width: 40px;
    height: 40px;
  }
  
  .theme-toggle i {
    font-size: 16px;
  }
}
</style>
