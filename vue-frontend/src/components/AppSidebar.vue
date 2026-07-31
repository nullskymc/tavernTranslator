<template>
  <div class="app-sidebar">
    <!-- Mobile close button -->
    <div class="mobile-close-btn" @click="$emit('close')">
      <AppIcon name="close" :size="14" />
    </div>

    <!-- Header -->
    <div class="sidebar-header">
      <img src="/img/index.png" :alt="$t('common.logoAlt')" class="logo" />
      <h2>{{ $t('sidebar.title') }}</h2>
    </div>

    <!-- Scrollable content -->
    <div class="sidebar-content">
      <!-- Character image -->
      <div class="character-image-section">
        <div class="image-preview-wrapper">
          <img v-if="store.characterImageB64" :src="store.characterImageB64" :alt="$t('sidebar.image.preview')" class="image-preview" />
          <div v-else class="image-placeholder">
            <AppIcon name="image" :size="28" />
            <span>{{ $t('sidebar.image.placeholder') }}</span>
          </div>
        </div>
      </div>

      <!-- Export buttons -->
      <div class="actions-section">
        <div class="export-buttons-container">
          <AppButton
            variant="primary"
            size="sm"
            :disabled="!store.characterCard"
            :loading="store.isLoading"
            @click="store.exportCardAsImage()"
          >
            <AppIcon name="download" :size="14" />
            {{ $t('sidebar.export.image') }}
          </AppButton>
          <AppButton
            size="sm"
            :disabled="!store.characterCard"
            @click="store.exportCardAsJson()"
          >
            <AppIcon name="doc" :size="14" />
            {{ $t('sidebar.export.json') }}
          </AppButton>
        </div>
      </div>

      <!-- Action grid -->
      <span class="section-label">{{ $t('sidebar.actions.title') }}</span>
      <input type="file" ref="fileUploader" @change="handleFileChange" accept="image/png" style="display:none;" />
      <input type="file" ref="jsonUploader" @change="handleJsonFileChange" accept="application/json" style="display:none;" />
      <input type="file" ref="imageUploader" @change="handleImageChange" accept="image/png" style="display:none;" />

      <div class="action-grid">
        <button
          class="action-btn"
          :title="$t('sidebar.actions.uploadCard')"
          @click="triggerFileUpload"
        >
          <AppIcon name="upload" :size="18" />
        </button>

        <button
          class="action-btn"
          :title="$t('sidebar.actions.uploadJson')"
          @click="triggerJsonUpload"
        >
          <AppIcon name="folder" :size="18" />
        </button>

        <button
          class="action-btn"
          :title="$t('sidebar.actions.newBlank')"
          @click="createNewCard"
        >
          <AppIcon name="doc-add" :size="18" />
        </button>

        <button
          class="action-btn"
          :title="$t('sidebar.actions.changeImage')"
          @click="triggerImageUpload"
          :disabled="!store.characterCard"
        >
          <AppIcon name="image" :size="18" />
        </button>

        <button
          class="action-btn"
          :title="$t('sidebar.actions.translationSettings')"
          @click="settingsDialogVisible = true"
        >
          <AppIcon name="settings" :size="18" />
        </button>

        <button
          class="action-btn"
          :title="$t('sidebar.actions.glossary')"
          @click="glossaryDialogVisible = true"
        >
          <AppIcon name="notebook" :size="18" />
          <span v-if="store.glossaryEntries.length > 0" class="action-btn-badge">{{ store.glossaryEntries.length > 99 ? '99+' : store.glossaryEntries.length }}</span>
        </button>

        <button
          class="action-btn action-btn--ai"
          :title="$t('sidebar.actions.aiAssistant')"
          @click="openAIChat"
        >
          <AppIcon name="chat" :size="18" />
        </button>

        <button
          class="action-btn action-btn--danger"
          :title="$t('sidebar.actions.clearCard')"
          @click="confirmReset"
          :disabled="!store.characterCard"
        >
          <AppIcon name="delete" :size="18" />
        </button>
      </div>
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
    <!-- Glossary dialog -->
    <GlossaryDialog v-model="glossaryDialogVisible" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { useAIChatStore } from '@/stores/aiChat';
import { useI18n } from 'vue-i18n';
import { useConfirm } from './ui/useConfirm';
import { useToast } from './ui/useToast';
import AppIcon from './ui/AppIcon.vue';
import AppButton from './ui/AppButton.vue';
import TranslationSettingsDialog from './TranslationSettingsDialog.vue';
import GlossaryDialog from './GlossaryDialog.vue';
import ThemeToggle from './ThemeToggle.vue';
import LanguageSwitcher from './LanguageSwitcher.vue';

const emit = defineEmits(['close']);

const store = useTranslatorStore();
const aiChatStore = useAIChatStore();
const { t: $t } = useI18n();
const { confirm } = useConfirm();
const toast = useToast();

const imageUploader = ref(null);
const fileUploader = ref(null);
const jsonUploader = ref(null);
const settingsDialogVisible = ref(false);
const glossaryDialogVisible = ref(false);

const triggerImageUpload = () => imageUploader.value?.click();
const handleImageChange = (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'image/png') {
    const reader = new FileReader();
    reader.onload = (e) => store.updateBaseImage(e.target.result);
    reader.readAsDataURL(file);
  } else {
    toast.error($t('messages.error.invalidPng'));
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
    toast.error($t('messages.error.invalidJson'));
  }
  event.target.value = '';
};

const createNewCard = async () => {
  const ok = await confirm({
    title: $t('messages.confirm.title'),
    message: $t('sidebar.confirm.newBlank'),
    confirmText: $t('messages.confirm.confirm'),
    cancelText: $t('messages.confirm.cancel'),
  });
  if (ok) store.createNewCard();
};

const confirmReset = async () => {
  const ok = await confirm({
    title: $t('messages.confirm.title'),
    message: $t('sidebar.confirm.clearCard'),
    confirmText: $t('messages.confirm.confirm'),
    cancelText: $t('messages.confirm.cancel'),
    type: 'danger',
  });
  if (ok) store.resetStore();
};

const openAIChat = () => {
  aiChatStore.sidebarVisible = true;
  emit('close'); // Close mobile sidebar if open
};
</script>

<style scoped>
/* ===========================
   Sidebar — Premium Glass
   =========================== */
.app-sidebar {
  width: fit-content;
  min-width: 220px;
  max-width: 280px;
  height: 100vh;
  background: var(--tt-glass-bg);
  backdrop-filter: blur(var(--tt-glass-blur));
  -webkit-backdrop-filter: blur(var(--tt-glass-blur));
  border-right: 1px solid var(--tt-glass-border);
  display: flex;
  flex-direction: column;
  padding: 0;
  box-sizing: border-box;
  position: relative;
  flex-shrink: 0;
  z-index: 1;
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
  transition: all 0.2s var(--tt-smooth);
  color: var(--apple-text-color-secondary);
  font-size: 14px;
}

.mobile-close-btn:hover {
  background-color: var(--apple-color-gray-4);
  color: var(--apple-text-color-primary);
  transform: scale(1.1);
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
  width: 34px;
  height: 34px;
  border-radius: 9px;
  object-fit: cover;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--apple-text-color-primary);
}

/* Scrollable content */
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Character image */
.character-image-section {
  padding: 0 8px;
}

.image-preview-wrapper {
  aspect-ratio: 1 / 1;
  border-radius: var(--apple-border-radius-large);
  overflow: hidden;
  background-color: var(--apple-color-gray-5);
  border: 1px solid var(--apple-border-color);
  position: relative;
  transition: transform 0.3s var(--tt-smooth);
}

.image-preview-wrapper:hover {
  transform: scale(1.02);
}

/* Image overlay gradient on hover */
.image-preview-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.25) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  border-radius: inherit;
}

.image-preview-wrapper:hover::after {
  opacity: 1;
}

.image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s var(--tt-smooth);
}

.image-preview-wrapper:hover .image-preview {
  transform: scale(1.04);
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

.image-placeholder :deep(svg) {
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

.export-buttons-container .app-btn {
  flex: 1 1 0;
  min-width: 0;
  justify-content: center;
  font-size: 12px;
  height: auto;
  min-height: 30px;
  padding: 4px 8px;
  white-space: normal;
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

/* Action grid — 3 columns of animated circle buttons */
.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 4px 8px;
  justify-items: center;
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--apple-border-radius-full);
  border: 1px solid var(--apple-border-color);
  background-color: var(--apple-bg-color);
  cursor: pointer;
  color: var(--apple-text-color-secondary);
  font-size: 18px;
  transition: all 0.25s var(--tt-smooth);
}

.action-btn:hover {
  color: var(--apple-text-color-primary);
  border-color: var(--apple-border-color-strong);
  transform: scale(1.12) translateY(-2px);
  box-shadow: var(--apple-shadow-medium);
  background: var(--apple-color-gray-5);
}

.action-btn:active {
  transform: scale(0.95);
  transition-duration: 0.1s;
}

.action-btn:disabled {
  color: var(--apple-text-color-tertiary);
  background-color: var(--apple-color-gray-6);
  border-color: var(--apple-border-color-secondary);
  cursor: not-allowed;
}

.action-btn:disabled:hover {
  transform: none;
  box-shadow: none;
}

.action-btn--ai {
  color: var(--apple-color-primary);
  border-color: var(--apple-color-primary-alpha);
}

.action-btn--ai:hover {
  background: var(--apple-color-primary-alpha);
  color: var(--apple-color-primary);
  border-color: var(--apple-color-primary);
  box-shadow: var(--apple-shadow-glow);
}

.action-btn--danger {
  color: var(--apple-color-danger);
  border-color: rgba(239, 68, 68, 0.15);
}

.action-btn--danger:hover {
  background-color: rgba(239, 68, 68, 0.08);
  color: var(--apple-color-danger);
  border-color: var(--apple-color-danger);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.12);
}

/* Badge */
.action-btn-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--apple-border-radius-full);
  background: var(--tt-gradient-primary);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 1;
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(14, 164, 122, 0.3);
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
  color: var(--apple-color-primary);
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

  .action-btn {
    width: 46px;
    height: 46px;
    font-size: 20px;
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
