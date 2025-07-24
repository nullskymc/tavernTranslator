<template>
  <div class="app-sidebar">
    <!-- 移动端关闭按钮 -->
    <div class="mobile-close-btn" @click="$emit('close')">
      <el-icon><Close /></el-icon>
    </div>

    <div class="sidebar-header">
      <img src="/img/index.png" alt="Logo" class="logo" />
      <h2>{{ $t('sidebar.title') }}</h2>
    </div>

    <div class="sidebar-content">
      <!-- 角色图片预览 -->
      <div class="character-image-section">
        
        <div class="image-preview-wrapper">
          <img v-if="store.characterImageB64" :src="store.characterImageB64" :alt="$t('sidebar.image.preview')" class="image-preview" />
          <div v-else class="image-placeholder">
            <el-icon><Picture /></el-icon>
            <span>{{ $t('sidebar.image.placeholder') }}</span>
          </div>
        </div>
        <!-- Removed original "更换图片" button here -->
      </div>

      <!-- 操作按钮 -->
      <div class="actions-section">
        <div class="export-buttons-wrapper">
          <div>
            <el-button 
              type="primary" 
              @click="store.exportCardAsImage()" 
              :icon="Download" 
              :disabled="!store.characterCard"
              :loading="store.isLoading"
            >
              {{ $t('sidebar.export.image') }}
            </el-button>
          </div>

          <div>
            <el-button 
              @click="store.exportCardAsJson()" 
              :icon="Document" 
              :disabled="!store.characterCard"
            >
              {{ $t('sidebar.export.json') }}
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
              <span class="button-text">{{ $t('sidebar.actions.uploadCard') }}</span>
            </div>

            <!-- "上传JSON" button -->
            <div class="action-button-wrapper">
              <input type="file" ref="jsonUploader" @change="handleJsonFileChange" accept="application/json" style="display: none;" />
              <el-button @click="triggerJsonUpload" circle>
                <el-icon><FolderOpened /></el-icon>
              </el-button>
              <span class="button-text">{{ $t('sidebar.actions.uploadJson') }}</span>
            </div>

            <!-- "新建空白卡" button -->
            <div class="action-button-wrapper">
              <el-button @click="createNewCard" circle>
                <el-icon><DocumentAdd /></el-icon>
              </el-button>
              <span class="button-text">{{ $t('sidebar.actions.newBlank') }}</span>
            </div>
          </div>

          <div class="action-buttons-row">
            <!-- "更换图片" button -->
            <div class="action-button-wrapper">
              <input type="file" ref="imageUploader" @change="handleImageChange" accept="image/png" style="display: none;" />
              <el-button @click="triggerImageUpload" :disabled="!store.characterCard" circle>
                <el-icon><Picture /></el-icon>
              </el-button>
              <span class="button-text">{{ $t('sidebar.actions.changeImage') }}</span>
            </div>

            <!-- "翻译设置" button -->
            <div class="action-button-wrapper">
              <el-button @click="settingsDialogVisible = true" circle>
                <el-icon><Setting /></el-icon>
              </el-button>
              <span class="button-text">{{ $t('sidebar.actions.translationSettings') }}</span>
            </div>

            <!-- "清除卡片" button -->
            <div class="action-button-wrapper">
              <el-button @click="confirmReset" :disabled="!store.characterCard" circle type="danger">
                <el-icon><Delete /></el-icon>
              </el-button>
              <span class="button-text">{{ $t('sidebar.actions.clearCard') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部控制按钮 -->
    <div class="sidebar-controls">
      <div class="action-buttons-row">
        <div class="action-button-wrapper">
          <ThemeToggle />
          <span class="button-text">{{ $t('sidebar.actions.theme') }}</span>
        </div>
        <div class="action-button-wrapper">
          <LanguageSwitcher />
          <span class="button-text">{{ $t('sidebar.actions.language') }}</span>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <a href="https://github.com/nullskymc/tavernTranslator" target="_blank">{{ $t('sidebar.footer.github') }}</a>
    </div>

    <!-- 翻译设置对话框 -->
    <TranslationSettingsDialog v-model="settingsDialogVisible" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { useI18n } from 'vue-i18n';
import { ElMessageBox, ElMessage } from 'element-plus';
import { Upload, Download, Setting, Delete, Picture, FolderOpened, DocumentAdd, Document, Close } from '@element-plus/icons-vue';
import TranslationSettingsDialog from './TranslationSettingsDialog.vue';
import ThemeToggle from './ThemeToggle.vue';
import LanguageSwitcher from './LanguageSwitcher.vue';

// 定义emit事件
const emit = defineEmits(['close']);

const store = useTranslatorStore();
const { t: $t } = useI18n();

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
    ElMessage.error($t('messages.error.invalidPng'));
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
    ElMessage.error($t('messages.error.invalidJson'));
  }
  event.target.value = '';
};

// --- 新建空白卡 ---
const createNewCard = () => {
  ElMessageBox.confirm($t('sidebar.confirm.newBlank'), $t('messages.confirm.title'), {
    confirmButtonText: $t('messages.confirm.confirm'), cancelButtonText: $t('messages.confirm.cancel'), type: 'warning',
  }).then(() => store.createNewCard()).catch(() => {}); // 调用 store 中的新方法
};

// --- 重置确认 ---
const confirmReset = () => {
  ElMessageBox.confirm($t('sidebar.confirm.clearCard'), $t('messages.confirm.title'), {
    confirmButtonText: $t('messages.confirm.confirm'), cancelButtonText: $t('messages.confirm.cancel'), type: 'warning',
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
  position: relative;
  flex-shrink: 0; /* 防止被压缩 */
  margin: 0; /* 确保没有外边距 */
  z-index: 1; /* 确保在正确层级 */
}

/* 暗色主题下的侧边栏样式 */
.dark-theme .app-sidebar {
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
}

/* 暗色主题下的边框修复 */
.dark-theme .sidebar-header {
  border-bottom: 1px solid var(--el-border-color);
}

.dark-theme .sidebar-footer {
  border-top: 1px solid var(--el-border-color);
}

.dark-theme .sidebar-controls {
  border-top: 1px solid var(--el-border-color);
  border-bottom: 1px solid var(--el-border-color);
}

/* 文字颜色修复 */
.dark-theme .sidebar-header h2 {
  color: var(--el-text-color-primary);
}

.dark-theme .sidebar-footer a {
  color: var(--el-text-color-secondary);
}

.dark-theme .sidebar-footer a:hover {
  color: var(--el-color-primary);
}

/* 移动端关闭按钮 */
.mobile-close-btn {
  display: none;
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--el-fill-color-light);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background-color 0.2s;
}

.mobile-close-btn:hover {
  background-color: var(--el-fill-color);
}

.dark-theme .mobile-close-btn {
  background-color: var(--el-fill-color-light);
}

.dark-theme .mobile-close-btn:hover {
  background-color: var(--el-fill-color);
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
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.sidebar-content::-webkit-scrollbar {
    display: none; /* Chrome, Safari, and Opera */
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

/* 确保导出按钮在暗色主题下正确显示 */
.dark-theme .export-buttons-wrapper .el-button--primary {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: var(--el-bg-color);
}

.dark-theme .export-buttons-wrapper .el-button--primary:hover {
  background-color: var(--el-color-primary-dark-2);
  border-color: var(--el-color-primary-dark-2);
}

.dark-theme .export-buttons-wrapper .el-button:not(.el-button--primary) {
  background-color: var(--el-fill-color);
  border-color: var(--el-border-color);
  color: var(--el-text-color-primary);
}

.dark-theme .export-buttons-wrapper .el-button:not(.el-button--primary):hover {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
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
  background-color: var(--el-fill-color-light) !important;
}

.action-button-wrapper:hover {
  width: 120px; /* 悬停时展开的宽度 */
  background-color: var(--el-color-primary-light-9);
}

.dark-theme .action-button-wrapper:hover {
  background-color: var(--el-fill-color) !important;
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

.action-button-wrapper .button-text {
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: var(--el-text-color-primary);
  font-size: 0.8em;
  margin-left: 8px; /* 文本与图标的间距 */
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

.sidebar-controls {
  padding: 16px 0;
  border-top: 1px solid var(--el-border-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  margin: 0 20px;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .mobile-close-btn {
    display: flex;
  }
  
  .app-sidebar {
    padding: 16px;
  }
  
  .sidebar-header {
    padding-top: 40px; /* 为关闭按钮留出空间 */
  }
  
  .character-image-section {
    margin-bottom: 20px;
  }
  
  .image-preview-wrapper {
    max-width: 200px;
    margin: 0 auto 10px;
  }
  
  .action-buttons-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .action-button-wrapper, .theme-toggle, .language-switcher {
    width: 100%;
    height: 50px;
    border-radius: 25px;
    justify-content: flex-start;
    padding: 0 16px;
  }
  
  .action-button-wrapper:hover, .theme-toggle:hover, .language-switcher:hover {
    width: 100%;
  }
  
  .action-button-wrapper .button-text, .theme-toggle .button-text, .language-switcher .button-text {
    opacity: 1;
    margin-left: 12px;
  }
  
  .export-buttons-wrapper {
    gap: 8px;
  }
  
  .sidebar-controls {
    margin: 0 16px;
  }
  
  .sidebar-controls .action-buttons-row {
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .app-sidebar {
    width: 280px;
    padding: 12px;
  }
  
  .sidebar-header h2 {
    font-size: 1.1em;
  }
  
  .logo {
    width: 36px;
    height: 36px;
  }
  
  .image-preview-wrapper {
    max-width: 150px;
  }
  
  .action-button-wrapper, .theme-toggle, .language-switcher {
    height: 45px;
    padding: 0 12px;
  }
  
  .action-button-wrapper .el-button, .theme-toggle .theme-button, .language-switcher .language-button {
    width: 45px;
    height: 45px;
  }
  
  .action-button-wrapper .button-text, .theme-toggle .button-text, .language-switcher .button-text {
    font-size: 0.85em;
  }
  
  .sidebar-controls {
    margin: 0 12px;
  }
}
</style>
