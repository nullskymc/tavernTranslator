import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 状态
  const isDarkTheme = ref(false)

  // 初始化主题
  const initializeTheme = () => {
    // 首先检查本地存储
    const savedTheme = localStorage.getItem('tavern_translator_theme')
    
    if (savedTheme) {
      isDarkTheme.value = savedTheme === 'dark'
    } else {
      // 检查系统主题设置
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDarkTheme.value = prefersDark
    }
    
    // 应用主题
    applyTheme()
  }

  // 监听系统主题变化
  const setupThemeChangeListener = () => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e) => {
      // 只有当用户没有手动设置主题时才跟随系统
      if (!localStorage.getItem('tavern_translator_theme')) {
        isDarkTheme.value = e.matches
        applyTheme()
      }
    }

    // 检查浏览器是否支持EventListener API
    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleChange)
    } else if (darkModeMediaQuery.addListener) {
      // 兼容旧版浏览器
      darkModeMediaQuery.addListener(handleChange)
    }
  }

  // 切换主题
  const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value
    applyTheme()
    
    // 保存到本地存储
    localStorage.setItem('tavern_translator_theme', isDarkTheme.value ? 'dark' : 'light')
  }

  // 应用主题到页面
  const applyTheme = () => {
    document.documentElement.classList.toggle('theme-transition')
    if (isDarkTheme.value) {
      document.documentElement.classList.add('dark-theme')
      
      // 直接操作头部横幅样式，强制应用更深的暗黑模式渐变
      const headerBanner = document.querySelector('.header-banner')
      if (headerBanner) {
        headerBanner.style.background = 'linear-gradient(135deg, #1e3a8a, #0c4a6e, #134e4a)'
      }
    } else {
      document.documentElement.classList.remove('dark-theme')
      
      // 恢复头部横幅样式为亮色模式渐变
      const headerBanner = document.querySelector('.header-banner')
      if (headerBanner) {
        headerBanner.style.background = 'linear-gradient(135deg, #2563eb, #0ea5e9, #0d9488)'
      }
    }
    
    // 移除过渡类，使其只在切换时生效
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 300)
  }

  return {
    // 状态
    isDarkTheme,
    
    // 方法
    initializeTheme,
    setupThemeChangeListener,
    toggleTheme,
    applyTheme
  }
})
