<template>
  <div class="app-sidebar">
    <div class="sidebar-header">
      <img src="/img/index.png" alt="Logo" class="logo" />
      <h2>TavernTranslator</h2>
    </div>

    <div class="sidebar-content">
      <!-- 角色图片预览 -->
      <div class="character-image-section">
        
        <div class="image-preview-wrapper">
          <img v-if="store.characterImageB64" :src="store.characterImageB64" alt="Character Preview" class="image-preview" />
          <div v-else class="image-placeholder">
            <el-icon><Picture /></el-icon>
            <span>无图片</span>
          </div>
        </div>
        <!-- Removed original "更换图片" button here -->
      </div>

      <!-- 操作按钮 -->
      <div class="actions-section">
        <div class="section-title">导出</div>
        <div class="export-buttons-wrapper">
          <div>
            <el-button 
              type="primary" 
              @click="store.exportCardAsImage()" 
              :icon="Download" 
              :disabled="!store.characterCard"
              :loading="store.isLoading"
            >
              导出为图片
            </el-button>
          </div>

          <div>
            <el-button 
              @click="store.exportCardAsJson()" 
              :icon="Document" 
              :disabled="!store.characterCard"
            >
              导出为JSON
            </el-button>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="quick-actions-section">
        
        <div class="action-buttons-group">
          <div class="action-buttons-row">
            <!-- "上传卡片" button -->
            <div class="action-button-wrapper">
              <input type="file" ref="fileUploader" @change="handleFileChange" accept="image/png" style="display: none;" />
              <el-button @click="triggerFileUpload" circle>
                <el-icon><Upload /></el-icon>
              </el-button>
              <span class="button-text">上传卡片</span>
            </div>

            <!-- "上传JSON" button -->
            <div class="action-button-wrapper">
              <input type="file" ref="jsonUploader" @change="handleJsonFileChange" accept="application/json" style="display: none;" />
              <el-button @click="triggerJsonUpload" circle>
                <el-icon><FolderOpened /></el-icon>
              </el-button>
              <span class="button-text">上传JSON</span>
            </div>

            <!-- "新建空白卡" button -->
            <div class="action-button-wrapper">
              <el-button @click="createNewCard" circle>
                <el-icon><DocumentAdd /></el-icon>
              </el-button>
              <span class="button-text">新建空白卡</span>
            </div>
          </div>

          <div class="action-buttons-row">
            <!-- "更换图片" button -->
            <div class="action-button-wrapper">
              <input type="file" ref="imageUploader" @change="handleImageChange" accept="image/png" style="display: none;" />
              <el-button @click="triggerImageUpload" :disabled="!store.characterCard" circle>
                <el-icon><Picture /></el-icon>
              </el-button>
              <span class="button-text">更换图片</span>
            </div>

            <!-- "翻译设置" button -->
            <div class="action-button-wrapper">
              <el-button @click="settingsDialogVisible = true" circle>
                <el-icon><Setting /></el-icon>
              </el-button>
              <span class="button-text">翻译设置</span>
            </div>

            <!-- "清除卡片" button -->
            <div class="action-button-wrapper">
              <el-button @click="confirmReset" :disabled="!store.characterCard" circle type="danger">
                <el-icon><Delete /></el-icon>
              </el-button>
              <span class="button-text">清除卡片</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <a href="https://github.com/nullskymc/tavernTranslator" target="_blank">GitHub</a>
    </div>

    <!-- 翻译设置对话框 -->
    <TranslationSettingsDialog v-model="settingsDialogVisible" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Upload, Download, Setting, Delete, Picture, FolderOpened, DocumentAdd, Document } from '@element-plus/icons-vue';
import TranslationSettingsDialog from './TranslationSettingsDialog.vue';

const store = useTranslatorStore();

const imageUploader = ref(null);
const fileUploader = ref(null);
const jsonUploader = ref(null); // 新增：JSON 文件上传的 ref
const settingsDialogVisible = ref(false);

// --- 图片处理 ---
const triggerImageUpload = () => imageUploader.value?.click();
const handleImageChange = (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'image/png') {
    const reader = new FileReader();
    reader.onload = (e) => store.updateBaseImage(e.target.result);
    reader.readAsDataURL(file);
  } else {
    ElMessage.error('请选择一个有效的PNG文件');
  }
  event.target.value = ''; // 重置input，以便可以再次选择相同的文件
};

// --- 文件上传处理 ---
const triggerFileUpload = () => fileUploader.value?.click();
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    store.handleCardUpload(file);
  }
  event.target.value = ''; // 重置input
};

// --- JSON 文件上传处理 ---
const triggerJsonUpload = () => jsonUploader.value?.click();
const handleJsonFileChange = (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'application/json') {
    store.handleJsonUpload(file); // 调用 store 中的新方法
  } else {
    ElMessage.error('请选择一个有效的JSON文件');
  }
  event.target.value = '';
};

// --- 新建空白卡 ---
const createNewCard = () => {
  ElMessageBox.confirm('这将创建一个新的空白角色卡，当前数据将丢失。确定要继续吗？', '警告', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(() => store.createNewCard()).catch(() => {}); // 调用 store 中的新方法
};

// --- 重置确认 ---
const confirmReset = () => {
  ElMessageBox.confirm('这将清除当前加载的角色卡数据，且无法恢复。确定要继续吗？', '警告', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(() => store.resetStore()).catch(() => {});
};
</script>

<style scoped>
.app-sidebar {
  width: 300px;
  height: 100vh;
  background-color: var(--el-bg-color-page);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.sidebar-header h2 {
  font-size: 1.2em;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.sidebar-content {
  flex-grow: 1;
  overflow-y: auto;
  margin-top: 20px;
}

.section-title {
  font-size: 0.9em;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
  font-weight: 500;
}

.character-image-section, .settings-section {
  margin-bottom: 25px;
}

.image-preview-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 10px;
  background-color: var(--el-fill-color-light);
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.image-placeholder .el-icon {
  font-size: 48px;
}

.actions-section {
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  gap: 15px; /* Spacing between title and button group */
}

.export-buttons-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.export-buttons-wrapper .el-button {
  width: 100%; /* Make them full width */
  box-sizing: border-box;
}

/* 黑暗模式下导出按钮的特定样式 */
.dark-theme .export-buttons-wrapper .el-button {
  background-color: var(--background-color) !important; /* 强制黑底 */
  border-color: var(--background-color) !important; /* 边框也设为黑底 */
  color: var(--text-primary) !important; /* 强制白字 */
}

.dark-theme .export-buttons-wrapper .el-button:hover {
  background-color: var(--background-secondary) !important; /* 悬停时稍微亮一点 */
  border-color: var(--background-secondary) !important;
}


.settings-section .el-button {
  width: 100%;
  justify-content: flex-start;
  padding: 8px 12px;
}

.quick-actions-section {
  margin-bottom: 25px;
}

.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 10px; /* 行之间的间距 */
}

.action-buttons-row {
  display: flex;
  justify-content: space-around;
  gap: 10px; /* 按钮之间的间距 */
}

.action-button-wrapper {
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: flex-start; /* 初始左对齐 */
  position: relative;
  width: 50px; /* 初始宽度，与按钮直径相同 */
  height: 50px; /* 与按钮直径相同 */
  transition: width 0.3s ease, background-color 0.3s ease;
  border-radius: 25px; /* 圆角 */
  overflow: hidden; /* 隐藏溢出的文本 */
  background-color: var(--el-fill-color-light);
  box-sizing: border-box;
  cursor: pointer;
}

.dark-theme .action-button-wrapper {
  background-color: var(--background-secondary) !important;
}

.action-button-wrapper:hover {
  width: 120px; /* 悬停时展开的宽度 */
  background-color: var(--el-color-primary-light-9);
}

.dark-theme .action-button-wrapper:hover {
  background-color: var(--background-hover) !important;
}

.action-button-wrapper .el-button {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0; /* 防止按钮在父容器展开时被压缩 */
}

.dark-theme .action-button-wrapper .el-button {
  background-color: var(--background-color) !important; /* 强制黑底 */
  border-color: var(--background-color) !important; /* 边框也设为黑底 */
  color: var(--text-primary) !important; /* 强制白字 */
}

.dark-theme .action-button-wrapper .el-button:hover {
  background-color: var(--background-secondary) !important; /* 悬停时稍微亮一点 */
  border-color: var(--background-secondary) !important;
}

.dark-theme .action-button-wrapper .el-button .el-icon {
  color: var(--text-primary) !important; /* 强制图标颜色为白字 */
}

.dark-theme .action-button-wrapper .el-button .el-icon svg,
.dark-theme .action-button-wrapper .el-button .el-icon svg path {
  fill: var(--text-primary) !important; /* 强制 SVG 填充颜色为白字 */
}

.action-button-wrapper .button-text {
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: var(--el-text-color-primary);
  font-size: 0.8em;
  margin-left: 8px; /* 文本与图标的间距 */
}

.dark-theme .action-button-wrapper .button-text {
  color: var(--text-primary) !important;
}

.action-button-wrapper:hover .button-text {
  opacity: 1;
}

.sidebar-footer {
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-light);
  text-align: center;
}

.sidebar-footer a {
  color: var(--el-text-color-secondary);
  text-decoration: none;
  font-size: 0.9em;
}
.sidebar-footer a:hover {
  color: var(--el-color-primary);
}
</style>
