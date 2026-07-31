/**
 * 浏览器语言识别 — 纯函数模块
 * 不依赖 vue-i18n / DOM，便于在 Node 中直接验证。
 *
 * 识别规则：
 * - 按用户的偏好列表（navigator.languages）顺序匹配
 * - zh*（zh-CN / zh-HK / zh-Hans 等）→ zh
 * - ja*（ja / ja-JP）→ ja
 * - en* → en
 * - 其余语言或空列表 → en（回退）
 */
export const supportedLocales = ['en', 'zh', 'ja'] as const
export type LocaleCode = (typeof supportedLocales)[number]

/** 只接受已注册的语言，避免旧版本或手工写入的值导致界面没有文案 */
export const isLocaleCode = (locale: string | null): locale is LocaleCode => {
  return locale !== null && supportedLocales.includes(locale as LocaleCode)
}

/** 将 BCP-47 语言标签规范化为基础语言代码：'zh-CN' → 'zh'，'ZH_hans' → 'zh' */
function normalizeBaseLang(tag: string): string {
  return tag.trim().split('-')[0]?.split('_')[0].toLowerCase() ?? ''
}

/**
 * 按偏好顺序识别界面语言。
 * @param preferredLanguages 用户语言偏好列表（浏览器 navigator.languages）
 */
export function detectLocale(preferredLanguages: readonly string[]): LocaleCode {
  for (const tag of preferredLanguages) {
    const base = normalizeBaseLang(tag)
    if (base === 'zh') return 'zh'
    if (base === 'ja') return 'ja'
    if (base === 'en') return 'en'
  }
  return 'en'
}
