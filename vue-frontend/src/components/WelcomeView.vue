<template>
  <div
    class="welcome-container"
    :class="{ 'is-dragover': isDragover }"
    @dragover.prevent="isDragover = true"
    @dragleave.prevent="isDragover = false"
    @drop.prevent="handleDrop"
  >
    <!-- Animated background orbs -->
    <div class="bg-orbs" aria-hidden="true">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <div class="welcome-content">
      <!-- Logo -->
      <div class="hero-icon fade-slide-up">
        <img src="/img/index.png" alt="TavernTranslator" class="hero-logo" />
      </div>

      <!-- Gradient title -->
      <h1 class="hero-title fade-slide-up stagger-1">
        <span class="gradient-text">{{ $t('welcome.title') }}</span>
      </h1>
      <p class="hero-subtitle fade-slide-up stagger-2">{{ $t('welcome.subtitle') }}</p>

      <!-- Feature cards -->
      <div class="features fade-slide-up stagger-3">
        <div class="feature-card">
          <div class="feature-icon feature-icon--edit">
            <el-icon><EditPen /></el-icon>
          </div>
          <span>{{ $t('welcome.features.onlineEdit') }}</span>
        </div>
        <div class="feature-card">
          <div class="feature-icon feature-icon--data">
            <el-icon><DataLine /></el-icon>
          </div>
          <span>{{ $t('welcome.features.localStorage') }}</span>
        </div>
        <div class="feature-card">
          <div class="feature-icon feature-icon--translate">
            <el-icon><Switch /></el-icon>
          </div>
          <span>{{ $t('welcome.features.oneClickTranslate') }}</span>
        </div>
        <div class="feature-card">
          <div class="feature-icon feature-icon--export">
            <el-icon><Download /></el-icon>
          </div>
          <span>{{ $t('welcome.features.imageExport') }}</span>
        </div>
      </div>

      <!-- Drop zone -->
      <div class="drop-zone fade-slide-up stagger-4">
        <div class="drop-zone-inner">
          <div class="drop-icon-wrapper">
            <el-icon class="drop-icon"><Upload /></el-icon>
          </div>
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
/* ============================================
   Welcome Container — Full-bleed premium
   ============================================ */
.welcome-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 100%;
  padding: 48px 24px;
  box-sizing: border-box;
  transition: background-color 0.3s ease;
  background-color: var(--apple-bg-color);
  overflow: hidden;
}

.welcome-container.is-dragover {
  background-color: var(--apple-color-primary-alpha);
}

/* ============================================
   Animated background orbs
   ============================================ */
.bg-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  animation: float 12s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: var(--apple-color-primary);
  top: -10%;
  right: -5%;
  animation-delay: 0s;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: var(--apple-color-accent, #d4a853);
  bottom: -5%;
  left: -5%;
  animation-delay: -4s;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: var(--apple-color-primary);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -8s;
  opacity: 0.08;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  33% { transform: translateY(-20px) scale(1.05); }
  66% { transform: translateY(10px) scale(0.97); }
}

/* ============================================
   Content area
   ============================================ */
.welcome-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 560px;
  width: 100%;
}

/* Logo */
.hero-icon {
  width: 72px;
  height: 72px;
  margin-bottom: 28px;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--apple-shadow-large), var(--apple-shadow-glow);
  transition: transform 0.3s var(--apple-transition-spring);
}

.hero-icon:hover {
  transform: scale(1.08) rotate(-2deg);
}

.hero-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Title */
.hero-title {
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 12px;
  letter-spacing: -0.04em;
  line-height: 1.15;
}

.hero-subtitle {
  font-size: 16px;
  color: var(--apple-text-color-secondary);
  margin: 0 0 36px;
  line-height: 1.6;
  max-width: 420px;
}

/* ============================================
   Feature grid — icon cards
   ============================================ */
.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 40px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: var(--apple-border-radius-large);
  border: 1px solid var(--apple-border-color);
  background-color: var(--apple-bg-color-secondary);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--apple-text-color-secondary);
  transition: all 0.25s var(--tt-smooth);
  cursor: default;
}

.feature-card:hover {
  border-color: var(--apple-color-primary);
  background-color: var(--apple-color-primary-alpha);
  transform: translateY(-3px);
  box-shadow: var(--apple-shadow-medium);
}

.feature-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: transform 0.2s var(--apple-transition-spring);
}

.feature-card:hover .feature-icon {
  transform: scale(1.15);
}

.feature-icon--edit {
  background: linear-gradient(135deg, rgba(14,164,122,0.12), rgba(14,164,122,0.04));
  color: var(--apple-color-primary);
}

.feature-icon--data {
  background: linear-gradient(135deg, rgba(212,168,83,0.12), rgba(212,168,83,0.04));
  color: var(--apple-color-accent, #d4a853);
}

.feature-icon--translate {
  background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04));
  color: #6366f1;
}

.feature-icon--export {
  background: linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.04));
  color: #ec4899;
}

/* ============================================
   Drop zone
   ============================================ */
.drop-zone {
  width: 100%;
}

.drop-zone-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 32px;
  border: 2px dashed var(--apple-border-color-strong);
  border-radius: var(--apple-border-radius-xl);
  background-color: var(--apple-bg-color-secondary);
  box-sizing: border-box;
  transition: all 0.3s var(--tt-smooth);
}

.welcome-container.is-dragover .drop-zone-inner {
  border-color: var(--apple-color-primary);
  background-color: var(--apple-color-primary-alpha);
  box-shadow: var(--apple-shadow-glow);
  transform: scale(1.01);
}

.drop-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--apple-color-primary-alpha);
  transition: all 0.3s ease;
}

.welcome-container.is-dragover .drop-icon-wrapper {
  background: var(--apple-color-primary);
  animation: pulse-glow 1.5s ease-in-out infinite;
}

.drop-icon {
  font-size: 22px;
  color: var(--apple-color-primary);
  transition: color 0.2s ease;
}

.welcome-container.is-dragover .drop-icon {
  color: #ffffff;
}

.drop-text {
  font-size: 13px;
  color: var(--apple-text-color-secondary);
  line-height: 1.7;
}

.drop-text strong {
  color: var(--apple-text-color-primary);
  font-weight: 600;
}

.drop-text code {
  background-color: var(--apple-color-gray-5);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', 'JetBrains Mono', 'Cascadia Mono', monospace;
  font-size: 12px;
  color: var(--apple-color-primary);
  font-weight: 500;
}

.drop-text a {
  color: var(--apple-color-primary);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.drop-text a:hover {
  color: var(--apple-color-primary-dark);
}

/* ============================================
   Mobile
   ============================================ */
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
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .features {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 28px;
  }

  .feature-card {
    padding: 12px 8px;
  }

  .drop-zone-inner {
    padding: 20px;
  }

  .orb { display: none; }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 24px;
  }

  .features {
    gap: 6px;
  }
}
</style>
