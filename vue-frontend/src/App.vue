<template>
  <div id="app-layout">
    <!-- 移动端遮罩层 -->
    <Transition name="fade">
      <div 
        v-if="isMobile && sidebarVisible" 
        class="mobile-overlay"
        style="position:fixed;inset:0;z-index:1000;"
        @click="sidebarVisible = false"
      ></div>
    </Transition>

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
      :current-view="currentView"
      @switch-view="currentView = $event"
    />

    <!-- 右侧主内容区 -->
    <main class="main-content" :class="{ 'mobile-content': isMobile }">
      <!-- 如果没有加载角色卡，显示欢迎/上传提示 -->
      <div v-if="!store.characterCard" class="welcome-view">
        <WelcomeView />
      </div>

      <!-- 如果已加载角色卡，显示编辑器组件 -->
      <div v-else class="editor-view">
        <div class="editor-view-inner">
          <CharacterEditor v-if="currentView === 'character'" :current-view="currentView" />
          <CharacterBookEditor v-else-if="currentView === 'character-book'" :current-view="currentView" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { useThemeStore } from '@/stores/theme';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Menu } from '@element-plus/icons-vue';

// 导入核心布局组件
import AppSidebar from './components/AppSidebar.vue';
import CharacterEditor from './components/CharacterEditor.vue';
import CharacterBookEditor from './components/CharacterBookEditor.vue';
import WelcomeView from './components/WelcomeView.vue'; // 一个新的欢迎组件
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import EditorTabs from './components/ui/EditorTabs.vue';
import EditorLayout from './components/common/EditorLayout.vue';
import { useResponsive } from './composables/useResponsive';

const store = useTranslatorStore();
const themeStore = useThemeStore();
const { t: $t } = useI18n();

// 当前视图状态
const currentView = ref('character'); // 默认为角色编辑视图

// 移动端响应式状态
const { isMobile } = useResponsive();
const sidebarVisible = ref(false);

// 视图切换方法
const handleViewChange = (event: Event) => {
  const ev = event as CustomEvent<{ view: string }>;
  currentView.value = ev.detail.view;
};

// 创建 character_book
const createCharacterBook = () => {
  if (store.characterCard) {
    store.updateCardField('data.character_book', {
      "name": "",
      "description": "",
      "scan_depth": 0,
      "token_budget": 0,
      "recursive_scanning": false,
      "extensions": {},
      "entries": []
    });
    ElMessage.success($t('characterBook.characterBookCreated'));
  }
};

onMounted(() => {
  themeStore.initializeTheme();
  checkMobile();
  window.addEventListener('resize', handleResize);
  
  // 添加手势监听
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  // 监听视图切换事件
  window.addEventListener('view-change', handleViewChange);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
  window.removeEventListener('view-change', handleViewChange);
});

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
const handleTouchStart = (e: TouchEvent) => {
  if (!isMobile.value) return;
  touchStartX.value = e.touches[0].clientX;
};

const handleTouchMove = (e: TouchEvent) => {
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

// 重复生命周期块已移除
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

body {
  background-color: var(--apple-bg-color-secondary);
  color: var(--apple-text-color-primary);
  overflow: hidden;
}
</style>

<style scoped>
/* Root layout - OpenAI style two-panel */
#app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  background-color: var(--apple-bg-color-secondary);
}

/* Main content area - clean, no card styling */
.main-content {
  flex-grow: 1;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  background-color: var(--apple-bg-color);
  display: flex;
  flex-direction: column;
}

.welcome-view,
.editor-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.editor-view-inner {
  flex: 1;
  padding: 24px 32px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

/* Mobile header */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background-color: var(--apple-bg-color);
  border-bottom: 1px solid var(--apple-border-color);
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 1000;
  box-sizing: border-box;
  gap: 12px;
}

.mobile-menu-btn {
  flex-shrink: 0;
}

.mobile-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--apple-text-color-primary);
  flex-grow: 1;
}

.mobile-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

/* Mobile sidebar */
.mobile-sidebar {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 280px !important;
  max-width: 85vw !important;
  height: 100vh !important;
  transform: translateX(-100%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1001;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.12);
}

.mobile-sidebar.sidebar-visible {
  transform: translateX(0);
}

/* Mobile overlay */
.mobile-overlay {
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

/* Mobile content */
.mobile-content {
  margin-top: 56px;
  height: calc(100vh - 56px) !important;
  overflow-x: hidden;
}

.mobile-content .editor-view-inner {
  padding: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  #app-layout {
    flex-direction: column;
  }

  .main-content {
    padding: 0;
  }

  .editor-view-inner {
    padding: 16px;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .mobile-header {
    height: 52px;
  }

  .mobile-content {
    margin-top: 52px;
    height: calc(100vh - 52px) !important;
  }

  .editor-view-inner {
    padding: 12px;
  }
}
</style>
