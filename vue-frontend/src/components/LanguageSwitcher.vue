<template>
  <button
    class="control-btn"
    :title="switchToTitle"
    :aria-label="switchToTitle"
    @click="cycleLanguage"
  >
    <span class="lang-label">{{ currentLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { supportedLocales, setLocale, type LocaleCode } from '@/i18n';

const { t: $t, locale } = useI18n();
const currentLanguage = ref<LocaleCode>(locale.value as LocaleCode);

// 循环顺序：中文 → 英文 → 日文 → 中文
const ORDER: LocaleCode[] = [...supportedLocales];

// 按钮上显示当前语言的缩写（紧凑布局）
const LABELS: Record<LocaleCode, string> = {
  zh: '中',
  en: 'EN',
  ja: '日',
};

const currentLabel = computed(() => LABELS[currentLanguage.value]);

/** 目标语言在当前界面语言下的名称（用于 tooltip / aria-label） */
const switchToTitle = computed(() => {
  const idx = ORDER.indexOf(currentLanguage.value);
  const next = ORDER[(idx + 1) % ORDER.length];
  return $t('language.switchTo', { language: $t(`language.${next}`) });
});

const cycleLanguage = () => {
  const idx = ORDER.indexOf(currentLanguage.value);
  const next = ORDER[(idx + 1) % ORDER.length];
  setLocale(next);
  currentLanguage.value = next;
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
