<template>
  <div class="app-sidebar">
    <!-- Mobile close button -->
    <div class="mobile-close-btn" @click="$emit('close')">
      <el-icon><Close /></el-icon>
    </div>

    <!-- Header -->
    <div class="sidebar-header">
      <img src="/img/index.png" alt="Logo" class="logo" />
      <h2>{{ $t('sidebar.title') }}</h2>
    </div>

    <!-- Scrollable content -->
    <div class="sidebar-content">
      <!-- Character image -->
      <div class="character-image-section">
        <div class="image-preview-wrapper">
          <img v-if="store.characterImageB64" :src="store.characterImageB64" :alt="$t('sidebar.image.preview')" class="image-preview" />
          <div v-else class="image-placeholder">
            <el-icon><Picture /></el-icon>
            <span>{{ $t('sidebar.image.placeholder') }}</span>
          </div>
        </div>
      </div>

      <!-- Export buttons -->
      <div class="actions-section">
        <div class="export-buttons-container">
          <el-button
            type="primary"
            @click="store.exportCardAsImage()"
            :icon="Download"
            :disabled="!store.characterCard"
            :loading="store.isLoading"
            size="small"
          >
            {{ $t('sidebar.export.image') }}
          </el-button>
          <el-button
            @click="store.exportCardAsJson()"
            :icon="Document"
            :disabled="!store.characterCard"
            size="small"
          >
            {{ $t('sidebar.export.json') }}
          </el-button>
        </div>
      </div>

      <!-- Action list - OpenAI style -->
      <span class="section-label">{{ $t('sidebar.actions.title') }}</span>
      <nav class="action-list">
        <input type="file" ref="fileUploader" @change="handleFileChange" accept="image/png" style="display:none;" />
        <input type="file" ref="jsonUploader" @change="handleJsonFileChange" accept="application/json" style="display:none;" />
        <input type="file" ref="imageUploader" @change="handleImageChange" accept="image/png" style="display:none;" />

        <button class="action-item" @click="triggerFileUpload">
          <span class="action-icon"><el-icon><Upload /></el-icon></span>
          <span class="action-label">{{ $t('sidebar.actions.uploadCard') }}</span>
        </button>

        <button class="action-item" @click="triggerJsonUpload">
          <span class="action-icon"><el-icon><FolderOpened /></el-icon></span>
          <span class="action-label">{{ $t('sidebar.actions.uploadJson') }}</span>
        </button>

        <button class="action-item" @click="createNewCard">
          <span class="action-icon"><el-icon><DocumentAdd /></el-icon></span>
          <span class="action-label">{{ $t('sidebar.actions.newBlank') }}</span>
        </button>

        <button class="action-item" @click="triggerImageUpload" :disabled="!store.characterCard">
          <span class="action-icon"><el-icon><Picture /></el-icon></span>
          <span class="action-label">{{ $t('sidebar.actions.changeImage') }}</span>
        </button>

        <button class="action-item" @click="settingsDialogVisible = true">
          <span class="action-icon"><el-icon><Setting /></el-icon></span>
          <span class="action-label">{{ $t('sidebar.actions.translationSettings') }}</span>
        </button>

        <button class="action-item action-item--danger" @click="confirmReset" :disabled="!store.characterCard">
          <span class="action-icon"><el-icon><Delete /></el-icon></span>
          <span class="action-label">{{ $t('sidebar.actions.clearCard') }}</span>
        </button>
      </nav>
    </div>

    <!-- Bottom controls -->
    <div class="sidebar-footer">
      <div class="footer-controls">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <a href="https://github.com/nullskymc/tavernTranslator" target="_blank" class="github-link">
        {{ $t('sidebar.footer.github') }}
      </a>
    </div>

    <!-- Settings dialog -->
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

const emit = defineEmits(['close']);

const store = useTranslatorStore();
const { t: $t } = useI18n();

const imageUploader = ref(null);
const fileUploader = ref(null);
const jsonUploader = ref(null);
const settingsDialogVisible = ref(false);

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
  event.target.value = '';
};

const triggerFileUpload = () => fileUploader.value?.click();
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) store.handleCardUpload(file);
  event.target.value = '';
};

const triggerJsonUpload = () => jsonUploader.value?.click();
const handleJsonFileChange = (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'application/json') {
    store.handleJsonUpload(file);
  } else {
    ElMessage.error($t('messages.error.invalidJson'));
  }
  event.target.value = '';
};

const createNewCard = () => {
  ElMessageBox.confirm($t('sidebar.confirm.newBlank'), $t('messages.confirm.title'), {
    confirmButtonText: $t('messages.confirm.confirm'),
    cancelButtonText: $t('messages.confirm.cancel'),
    type: 'warning',
  }).then(() => store.createNewCard()).catch(() => {});
};

const confirmReset = () => {
  ElMessageBox.confirm($t('sidebar.confirm.clearCard'), $t('messages.confirm.title'), {
    confirmButtonText: $t('messages.confirm.confirm'),
    cancelButtonText: $t('messages.confirm.cancel'),
    type: 'warning',
  }).then(() => store.resetStore()).catch(() => {});
};
</script>

<style scoped>
/* ===========================
   Sidebar - OpenAI style
   =========================== */
.app-sidebar {
  /* Flexible width: shrinks to ~220px, grows up to 280px based on content */
  width: fit-content;
  min-width: 220px;
  max-width: 280px;
  height: 100vh;
  background-color: var(--apple-bg-sidebar);
  border-right: 1px solid var(--apple-border-color);
  display: flex;
  flex-direction: column;
  padding: 0;
  box-sizing: border-box;
  position: relative;
  flex-shrink: 0;
  z-index: 1;
  /* overflow: hidden removed — let flex column children clip themselves */
}

/* Mobile close button */
.mobile-close-btn {
  display: none;
  position: absolute;
  top: 14px;
  right: 14px;
  width: 28px;
  height: 28px;
  border-radius: var(--apple-border-radius-medium);
  background-color: var(--apple-color-gray-5);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background-color var(--apple-transition-duration) var(--apple-transition-easing);
  color: var(--apple-text-color-secondary);
  font-size: 14px;
}

.mobile-close-btn:hover {
  background-color: var(--apple-color-gray-4);
  color: var(--apple-text-color-primary);
}

/* Header */
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px 14px;
  border-bottom: 1px solid var(--apple-border-color);
  flex-shrink: 0;
}

.logo {
  width: 28px;
  height: 28px;
  border-radius: var(--apple-border-radius-medium);
  flex-shrink: 0;
}

.sidebar-header h2 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--apple-text-color-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Content scroll area */
.sidebar-content {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sidebar-content::-webkit-scrollbar {
  display: none;
}

/* Image section */
.character-image-section {
  margin-bottom: 12px;
}

.image-preview-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--apple-border-radius-large);
  overflow: hidden;
  background-color: var(--apple-color-gray-5);
  border: 1px solid var(--apple-border-color);
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--apple-text-color-tertiary);
  font-size: 11px;
}

.image-placeholder .el-icon {
  font-size: 28px;
  color: var(--apple-color-gray-3);
}

/* Export section */
.actions-section {
  margin-bottom: 8px;
}

.export-buttons-container {
  display: flex;
  gap: 6px;
  width: 100%;
}

.export-buttons-container .el-button {
  flex: 1 1 0;       /* grow equally but allow shrink */
  min-width: 0;      /* allow content to shrink below intrinsic size */
  justify-content: center;
  font-size: 12px;
  height: auto;
  min-height: 30px;
  padding: 4px 8px;
  white-space: normal;   /* let text wrap on narrow widths */
  line-height: 1.3;
  word-break: break-word;
}

/* Section label */
.section-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--apple-text-color-tertiary);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 8px 8px 4px;
}

/* Action list - OpenAI nav item style */
.action-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--apple-border-radius-medium);
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--apple-text-color-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  text-align: left;
  transition: background-color var(--apple-transition-duration) var(--apple-transition-easing);
  line-height: 1.4;
}

.action-item:hover {
  background-color: var(--apple-color-gray-5);
}

.action-item:active {
  background-color: var(--apple-color-gray-4);
}

.action-item:disabled {
  color: var(--apple-text-color-tertiary);
  cursor: not-allowed;
}

.action-item:disabled:hover {
  background: transparent;
}

.action-item--danger {
  color: var(--apple-color-danger);
}

.action-item--danger:hover {
  background-color: rgba(239, 68, 68, 0.08);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  font-size: 15px;
  color: var(--apple-text-color-secondary);
}

.action-item--danger .action-icon {
  color: var(--apple-color-danger);
}

.action-item:disabled .action-icon {
  color: var(--apple-text-color-tertiary);
}

.action-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Footer */
.sidebar-footer {
  flex-shrink: 0;
  padding: 10px 8px;
  border-top: 1px solid var(--apple-border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.github-link {
  font-size: 11px;
  color: var(--apple-text-color-tertiary);
  text-decoration: none;
  text-align: center;
  display: block;
  transition: color var(--apple-transition-duration) var(--apple-transition-easing);
}

.github-link:hover {
  color: var(--apple-text-color-secondary);
}

/* Mobile */
@media (max-width: 768px) {
  .mobile-close-btn {
    display: flex;
  }

  .sidebar-header {
    padding-top: 52px;
  }

  .image-preview-wrapper {
    max-width: 180px;
    margin: 0 auto;
  }

  .action-item {
    padding: 10px 12px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .app-sidebar {
    min-width: 240px;
    max-width: 280px;
  }

  .image-preview-wrapper {
    max-width: 140px;
  }
}
</style>
