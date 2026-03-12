<template>
  <div
    class="welcome-container"
    :class="{ 'is-dragover': isDragover }"
    @dragover.prevent="isDragover = true"
    @dragleave.prevent="isDragover = false"
    @drop.prevent="handleDrop"
  >
    <div class="welcome-content">
      <!-- Logo / Icon area -->
      <div class="hero-icon">
        <img src="/img/index.png" alt="TavernTranslator" class="hero-logo" />
      </div>

      <h1 class="hero-title">{{ $t('welcome.title') }}</h1>
      <p class="hero-subtitle">{{ $t('welcome.subtitle') }}</p>

      <!-- Feature pills -->
      <div class="features">
        <div class="feature-pill">
          <el-icon><EditPen /></el-icon>
          <span>{{ $t('welcome.features.onlineEdit') }}</span>
        </div>
        <div class="feature-pill">
          <el-icon><DataLine /></el-icon>
          <span>{{ $t('welcome.features.localStorage') }}</span>
        </div>
        <div class="feature-pill">
          <el-icon><Switch /></el-icon>
          <span>{{ $t('welcome.features.oneClickTranslate') }}</span>
        </div>
        <div class="feature-pill">
          <el-icon><Download /></el-icon>
          <span>{{ $t('welcome.features.imageExport') }}</span>
        </div>
      </div>

      <!-- Drop zone hint -->
      <div class="drop-hint">
        <el-icon class="drop-icon"><Upload /></el-icon>
        <div class="drop-text">
          <i18n-t keypath="welcome.instructions" tag="span">
            <template #uploadButton>
              <strong>{{ $t('sidebar.actions.uploadCard') }}</strong>
            </template>
            <template #pngCode>
              <code>.png</code>
            </template>
            <template #githubLink>
              <a href="https://github.com/nullskymc/tavernTranslator" target="_blank">{{ $t('welcome.instructionsGithubLinkText') }}</a>
            </template>
          </i18n-t>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { EditPen, DataLine, Switch, Download, Upload } from '@element-plus/icons-vue';
import { useTranslatorStore } from '@/stores/translator';

const store = useTranslatorStore();
const isDragover = ref(false);

const handleDrop = (e: DragEvent) => {
  isDragover.value = false;
  if (e.dataTransfer?.files?.[0]) {
    const file = e.dataTransfer.files[0];
    if (file.type === 'image/png') {
      store.handleCardUpload(file);
    }
  }
};
</script>

<style scoped>
.welcome-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 100%;
  padding: 40px 24px;
  box-sizing: border-box;
  transition: background-color var(--apple-transition-duration) var(--apple-transition-easing);
  background-color: var(--apple-bg-color);
}

.welcome-container.is-dragover {
  background-color: var(--apple-color-primary-alpha);
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 520px;
  width: 100%;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Hero icon */
.hero-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--apple-shadow-medium);
}

.hero-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Titles */
.hero-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--apple-text-color-primary);
  margin: 0 0 10px;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 15px;
  color: var(--apple-text-color-secondary);
  margin: 0 0 32px;
  line-height: 1.6;
}

/* Feature pills */
.features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 40px;
}

.feature-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--apple-border-radius-full);
  border: 1px solid var(--apple-border-color);
  background-color: var(--apple-bg-color-secondary);
  font-size: 12px;
  font-weight: 500;
  color: var(--apple-text-color-secondary);
  transition: all var(--apple-transition-duration) var(--apple-transition-easing);
}

.feature-pill:hover {
  border-color: var(--apple-color-primary);
  color: var(--apple-color-primary);
  background-color: var(--apple-color-primary-alpha);
}

.feature-pill .el-icon {
  font-size: 13px;
  color: var(--apple-color-primary);
}

/* Drop zone */
.drop-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 32px;
  border: 1.5px dashed var(--apple-border-color-strong);
  border-radius: var(--apple-border-radius-xl);
  background-color: var(--apple-bg-color-secondary);
  width: 100%;
  box-sizing: border-box;
  transition: all var(--apple-transition-duration) var(--apple-transition-easing);
}

.welcome-container.is-dragover .drop-hint {
  border-color: var(--apple-color-primary);
  background-color: var(--apple-color-primary-alpha);
}

.drop-icon {
  font-size: 24px;
  color: var(--apple-text-color-tertiary);
}

.welcome-container.is-dragover .drop-icon {
  color: var(--apple-color-primary);
}

.drop-text {
  font-size: 13px;
  color: var(--apple-text-color-secondary);
  line-height: 1.6;
}

.drop-text strong {
  color: var(--apple-text-color-primary);
  font-weight: 600;
}

.drop-text code {
  background-color: var(--apple-color-gray-5);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Mono', monospace;
  font-size: 12px;
  color: var(--apple-text-color-primary);
}

.drop-text a {
  color: var(--apple-color-primary);
  font-weight: 500;
}

.drop-text a:hover {
  text-decoration: underline;
}

/* Mobile */
@media (max-width: 768px) {
  .welcome-container {
    padding: 32px 16px;
    align-items: flex-start;
  }

  .hero-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
  }

  .hero-title {
    font-size: 24px;
  }

  .hero-subtitle {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .features {
    gap: 6px;
    margin-bottom: 28px;
  }

  .feature-pill {
    font-size: 11px;
    padding: 5px 10px;
  }

  .drop-hint {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 22px;
  }

  .features {
    gap: 5px;
  }
}
</style>
