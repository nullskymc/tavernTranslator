<template>
  <div class="welcome-container">
    <div class="welcome-box">
      <h1 class="title">欢迎使用角色卡编辑器</h1>
      <p class="subtitle">一个现代、高效的角色卡创建与翻译工具</p>
      
      <div class="features">
        <div class="feature-item">
          <el-icon><EditPen /></el-icon>
          <span>在线编辑</span>
        </div>
        <div class="feature-item">
          <el-icon><DataLine /></el-icon>
          <span>本地存储</span>
        </div>
        <div class="feature-item">
          <el-icon><Switch /></el-icon>
          <span>一键翻译</span>
        </div>
        <div class="feature-item">
          <el-icon><Download /></el-icon>
          <span>图片导出</span>
        </div>
      </div>

      <p class="instructions">
        要开始使用，请点击左侧边栏的 <strong>“上传新卡片”</strong> 按钮，
        或将您的 <code>.png</code> 格式角色卡文件拖拽到此窗口。
      </p>
    </div>
  </div>
</template>

<script setup>
import { EditPen, DataLine, Switch, Download } from '@element-plus/icons-vue';
import { useTranslatorStore } from '@/stores/translator';

const store = useTranslatorStore();

// 拖拽上传逻辑
const setupDragAndDrop = (element) => {
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.add('dragover');
  });

  element.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('dragover');
  });

  element.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'image/png') {
        store.handleCardUpload(file);
      }
    }
  });
};

import { onMounted, onUnmounted } from 'vue';
let container = null;
onMounted(() => {
  container = document.querySelector('.welcome-container');
  if (container) {
    setupDragAndDrop(container);
  }
});
onUnmounted(() => {
  if (container) {
    // 移除事件监听器以防内存泄漏
  }
});
</script>

<style scoped>
.welcome-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  border: 2px dashed var(--el-border-color);
  border-radius: 12px;
  transition: background-color 0.3s, border-color 0.3s;
}

.welcome-container.dragover {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.welcome-box {
  max-width: 600px;
  padding: 40px;
}

.title {
  font-size: 2.5em;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.2em;
  color: var(--el-text-color-secondary);
  margin-bottom: 40px;
}

.features {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1em;
  color: var(--el-text-color-regular);
}

.feature-item .el-icon {
  color: var(--el-color-primary);
}

.instructions {
  font-size: 1em;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}
</style>
