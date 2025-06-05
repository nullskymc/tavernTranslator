/**
 * 主题管理模块 - 处理主题切换功能
 */

const ThemeManagerModule = {
  data() {
    return {
      isDarkTheme: false,
    };
  },
  
  created() {
    // 检查系统偏好和本地存储的主题设置
    this.initializeTheme();
    
    // 监听系统主题变化
    this.setupThemeChangeListener();
  },
  
  methods: {
    // 初始化主题
    initializeTheme() {
      // 首先检查本地存储
      const savedTheme = localStorage.getItem('tavern_translator_theme');
      
      if (savedTheme) {
        this.isDarkTheme = savedTheme === 'dark';
      } else {
        // 检查系统主题设置
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.isDarkTheme = prefersDark;
      }
      
      // 应用主题
      this.applyTheme();
    },
    
    // 监听系统主题变化
    setupThemeChangeListener() {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // 检查浏览器是否支持EventListener API
      if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', e => {
          // 只有当用户没有手动设置主题时才跟随系统
          if (!localStorage.getItem('tavern_translator_theme')) {
            this.isDarkTheme = e.matches;
            this.applyTheme();
          }
        });
      } else if (darkModeMediaQuery.addListener) {
        // 兼容旧版浏览器
        darkModeMediaQuery.addListener(e => {
          if (!localStorage.getItem('tavern_translator_theme')) {
            this.isDarkTheme = e.matches;
            this.applyTheme();
          }
        });
      }
    },
    
    // 切换主题
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      this.applyTheme();
      
      // 保存到本地存储
      localStorage.setItem('tavern_translator_theme', this.isDarkTheme ? 'dark' : 'light');
    },
    
    // 应用主题到页面
    applyTheme() {
      document.documentElement.classList.toggle('theme-transition');
      if (this.isDarkTheme) {
        document.documentElement.classList.add('dark-theme');
        
        // 直接操作头部横幅样式，强制应用更深的暗黑模式渐变
        const headerBanner = document.querySelector('.header-banner');
        if (headerBanner) {
          headerBanner.style.background = 'linear-gradient(135deg, #1e3a8a, #0c4a6e, #134e4a)';
        }
      } else {
        document.documentElement.classList.remove('dark-theme');
        
        // 恢复头部横幅样式为亮色模式渐变
        const headerBanner = document.querySelector('.header-banner');
        if (headerBanner) {
          headerBanner.style.background = 'linear-gradient(135deg, #2563eb, #0ea5e9, #0d9488)';
        }
      }
      
      // 移除过渡类，使其只在切换时生效
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 300);
    }
  }
};

export default ThemeManagerModule;
