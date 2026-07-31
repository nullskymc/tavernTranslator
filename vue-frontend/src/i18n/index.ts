import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import { supportedLocales, isLocaleCode, detectLocale, type LocaleCode } from './detect'

export { supportedLocales, isLocaleCode, detectLocale }
export type { LocaleCode }

const messages = {
  en,
  zh,
  ja,
}

// 根据浏览器语言推断界面语言；未覆盖的语言统一回退到英文。
// 优先使用 navigator.languages 偏好列表，其次 navigator.language。
const getDefaultLocale = (): LocaleCode => {
  if (typeof navigator === 'undefined') return 'en'
  const preferred =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language]
  return detectLocale(preferred.filter((tag): tag is string => typeof tag === 'string'))
}

// 从本地存储读取语言，并在数据异常时使用浏览器语言。
const getInitialLocale = (): LocaleCode => {
  const storedLocale = typeof localStorage === 'undefined' ? null : localStorage.getItem('locale')
  return isLocaleCode(storedLocale) ? storedLocale : getDefaultLocale()
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages
})

// 统一处理语言切换、持久化以及浏览器可访问性标记。
export const setLocale = (locale: LocaleCode): void => {
  i18n.global.locale.value = locale
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('locale', locale)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = getInitialLocale()
}

export default i18n
