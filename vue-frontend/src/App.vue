<template>
  <div id="app-layout" v-loading.fullscreen.lock="store.isLoading" element-loading-text="请稍候...">
    <!-- 左侧边栏 -->
    <AppSidebar />

    <!-- 右侧主内容区 -->
    <main class="main-content">
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
    
    <!-- 全局组件 -->
    <ThemeToggle />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { useThemeStore } from '@/stores/theme';

// 导入核心布局组件
import AppSidebar from './components/AppSidebar.vue';
import CharacterEditor from './components/CharacterEditor.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import WelcomeView from './components/WelcomeView.vue'; // 一个新的欢迎组件

const store = useTranslatorStore();
const themeStore = useThemeStore();

onMounted(() => {
  themeStore.initializeTheme();
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
</style>
