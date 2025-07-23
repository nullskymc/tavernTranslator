<template>
  <div id="app-layout" v-loading.fullscreen.lock="store.isLoading" :element-loading-text="$t('app.loading')">
    <!-- 移动端遮罩层 -->
    <div 
      v-if="isMobile && sidebarVisible" 
      class="mobile-overlay"
      @click="sidebarVisible = false"
    ></div>

    <!-- 移动端头部 -->
    <header v-if="isMobile" class="mobile-header">
      <el-button 
        @click="sidebarVisible = !sidebarVisible" 
        class="mobile-menu-btn"
        :icon="Menu"
        circle
      />
      <div class="mobile-title">
        <img src="/img/index.png" alt="Logo" class="mobile-logo" />
        <span>{{ $t('app.title') }}</span>
      </div>
    </header>

    <!-- 左侧边栏 -->
    <AppSidebar 
      :class="{ 'mobile-sidebar': isMobile, 'sidebar-visible': sidebarVisible }"
      @close="sidebarVisible = false"
    />

    <!-- 右侧主内容区 -->
    <main class="main-content" :class="{ 'mobile-content': isMobile }">
      <div class="main-content-inner">
        <!-- 如果没有加载角色卡，显示欢迎/上传提示 -->
        <div v-if="!store.characterCard" class="welcome-view">
          <WelcomeView />
        </div>

        <!-- 如果已加载角色卡，显示编辑器组件 -->
        <div v-else class="editor-view">
          <CharacterEditor />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { useThemeStore } from '@/stores/theme';
import { Menu } from '@element-plus/icons-vue';

// 导入核心布局组件
import AppSidebar from './components/AppSidebar.vue';
import CharacterEditor from './components/CharacterEditor.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import WelcomeView from './components/WelcomeView.vue'; // 一个新的欢迎组件
import LanguageSwitcher from './components/LanguageSwitcher.vue';

const store = useTranslatorStore();
const themeStore = useThemeStore();

// 移动端响应式状态
const isMobile = ref(false);
const sidebarVisible = ref(false);

// 手势支持
const touchStartX = ref(0);
const touchEndX = ref(0);

// 检查是否为移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    sidebarVisible.value = false;
  }
};

// 手势处理
const handleTouchStart = (e) => {
  if (!isMobile.value) return;
  touchStartX.value = e.touches[0].clientX;
};

const handleTouchMove = (e) => {
  if (!isMobile.value) return;
  touchEndX.value = e.touches[0].clientX;
};

const handleTouchEnd = () => {
  if (!isMobile.value) return;
  
  const deltaX = touchEndX.value - touchStartX.value;
  const threshold = 50;
  
  // 从左边缘向右滑动打开侧边栏
  if (touchStartX.value < 20 && deltaX > threshold) {
    sidebarVisible.value = true;
  }
  // 向左滑动关闭侧边栏
  else if (sidebarVisible.value && deltaX < -threshold) {
    sidebarVisible.value = false;
  }
};

// 监听窗口大小变化
const handleResize = () => {
  checkMobile();
};

onMounted(() => {
  themeStore.initializeTheme();
  checkMobile();
  window.addEventListener('resize', handleResize);
  
  // 添加手势监听
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
});
</script>

<style>
/* 全局样式重置和基础设置 */
body {
  margin: 0;
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

/* 新的根布局 */
#app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
}

.main-content {
  flex-grow: 1;
  height: 100vh;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

.main-content-inner {
  max-width: 1000px;
  margin: 0 auto;
}

.welcome-view, .editor-view {
  height: 100%;
}

/* 移动端遮罩层 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* 移动端头部 */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 1000;
  box-sizing: border-box;
}

.mobile-menu-btn {
  margin-right: 16px;
}

.mobile-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  flex-grow: 1;
}

.mobile-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

/* 移动端侧边栏 */
.mobile-sidebar {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 300px !important;
  height: 100vh !important;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.mobile-sidebar.sidebar-visible {
  transform: translateX(0);
}

/* 移动端主内容 */
.mobile-content {
  margin-top: 60px;
  height: calc(100vh - 60px) !important;
  padding: 16px;
}

/* 桌面端语言切换器 */
.language-switcher-desktop {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
}

/* 移动端响应式 */
@media (max-width: 768px) {
  #app-layout {
    flex-direction: column;
  }
  
  .main-content {
    padding: 16px;
  }
  
  .main-content-inner {
    max-width: 100%;
  }
  
  /* 隐藏桌面端语言切换器 */
  .language-switcher-desktop {
    display: none;
  }
}

@media (max-width: 480px) {
  .mobile-content {
    padding: 12px;
  }
  
  .mobile-header {
    height: 56px;
  }
  
  .mobile-content {
    margin-top: 56px;
    height: calc(100vh - 56px) !important;
  }
}
</style>
