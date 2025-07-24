import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'

const messages = {
  en,
  zh
}

// Get the browser's default language
const getDefaultLocale = () => {
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: localStorage.getItem('locale') || getDefaultLocale(),
  fallbackLocale: 'en',
  messages
})

export default i18n