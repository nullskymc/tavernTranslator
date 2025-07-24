<template>
  <el-button class="language-button" circle @click="toggleLanguage">
    <el-icon><Switch /></el-icon>
  </el-button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Switch } from '@element-plus/icons-vue';

const { locale } = useI18n();
const currentLanguage = ref(locale.value);

// 移动端检测
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const handleResize = () => {
  checkMobile();
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const toggleLanguage = () => {
  const newLang = currentLanguage.value === 'zh' ? 'en' : 'zh';
  locale.value = newLang;
  localStorage.setItem('locale', newLang);
  currentLanguage.value = newLang;
};
</script>

<style scoped>


.language-button {
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

.language-button:hover {
  background-color: var(--el-color-primary-light-9);
}

.language-button .el-icon {
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

.language-switcher:hover .button-text {
  opacity: 1;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .language-switcher {
    width: 100%;
    height: 50px;
    border-radius: 25px;
    justify-content: flex-start;
    padding: 0 16px;
  }
  
  .language-switcher:hover {
    width: 100%;
  }
  
  .language-button {
    width: 50px;
    height: 50px;
  }
  
  .button-text {
    opacity: 1;
    margin-left: 12px;
  }
}

@media (max-width: 480px) {
  .language-switcher {
    height: 45px;
    padding: 0 12px;
  }
  
  .language-button {
    width: 45px;
    height: 45px;
  }
  
  .language-button .el-icon {
    font-size: 16px;
  }
  
  .button-text {
    font-size: 0.85em;
  }
}
</style>