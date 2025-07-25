<template>
  <div class="welcome-container">
    <div class="welcome-box">
      <h1 class="title">{{ $t('welcome.title') }}</h1>
      <p class="subtitle">{{ $t('welcome.subtitle') }}</p>
      
      <div class="features">
        <div class="feature-item">
          <el-icon><EditPen /></el-icon>
          <span>{{ $t('welcome.features.onlineEdit') }}</span>
        </div>
        <div class="feature-item">
          <el-icon><DataLine /></el-icon>
          <span>{{ $t('welcome.features.localStorage') }}</span>
        </div>
        <div class="feature-item">
          <el-icon><Switch /></el-icon>
          <span>{{ $t('welcome.features.oneClickTranslate') }}</span>
        </div>
        <div class="feature-item">
          <el-icon><Download /></el-icon>
          <span>{{ $t('welcome.features.imageExport') }}</span>
        </div>
      </div>

      <p class="instructions" v-html="$t('welcome.instructions')"></p>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  flex-wrap: wrap;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1em;
  color: var(--el-text-color-regular);
  flex-direction: column;
  text-align: center;
  min-width: 80px;
}

.feature-item .el-icon {
  color: var(--el-color-primary);
  font-size: 24px;
}

.instructions {
  font-size: 1em;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.instructions code {
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.instructions a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.instructions a:hover {
  text-decoration: underline;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .welcome-box {
    padding: 24px 16px;
  }
  
  .title {
    font-size: 2em;
  }
  
  .subtitle {
    font-size: 1.1em;
    margin-bottom: 24px;
  }
  
  .features {
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .feature-item {
    min-width: 70px;
  }
  
  .feature-item .el-icon {
    font-size: 20px;
  }
  
  .instructions {
    font-size: 0.9em;
  }
}

@media (max-width: 480px) {
  .welcome-container {
    border: 1px dashed var(--el-border-color);
    padding: 16px;
  }
  
  .welcome-box {
    padding: 16px 8px;
  }
  
  .title {
    font-size: 1.8em;
  }
  
  .subtitle {
    font-size: 1em;
  }
  
  .features {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .feature-item {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
    min-width: auto;
  }
  
  .feature-item .el-icon {
    font-size: 18px;
  }
  
  .instructions {
    font-size: 0.85em;
  }
}
</style>
