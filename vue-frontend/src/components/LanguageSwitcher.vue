<template>
  <el-tooltip :content="currentLanguage === 'zh' ? 'Switch to English' : '切换为中文'" placement="top">
    <button class="control-btn" @click="toggleLanguage" :aria-label="currentLanguage === 'zh' ? 'Switch to English' : 'Switch to Chinese'">
      <span class="lang-label">{{ currentLanguage === 'zh' ? 'ZH' : 'EN' }}</span>
    </button>
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const currentLanguage = ref(locale.value);

const toggleLanguage = () => {
  const newLang = currentLanguage.value === 'zh' ? 'en' : 'zh';
  locale.value = newLang;
  localStorage.setItem('locale', newLang);
  currentLanguage.value = newLang;
};
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

.lang-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1;
}
</style>
