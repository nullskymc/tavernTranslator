<template>
  <AppTooltip :content="$t('language.open')">
    <button
      ref="triggerRef"
      class="control-btn"
      :aria-label="$t('language.open')"
      :aria-expanded="drawerOpen"
      aria-controls="language-drawer"
      @click="openDrawer"
    >
      <span class="lang-label">{{ currentLabel }}</span>
    </button>
  </AppTooltip>

  <Teleport to="body">
    <Transition name="language-drawer">
      <div v-if="drawerOpen" class="language-drawer-layer">
        <aside
          ref="drawerRef"
          id="language-drawer"
          class="language-drawer"
          :style="drawerStyle"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('language.title')"
        >
          <div class="language-options" role="radiogroup" :aria-label="$t('language.title')">
            <button
              v-for="language in ORDER"
              :key="language"
              class="language-option"
              :class="{ 'language-option--active': currentLanguage === language }"
              role="radio"
              :aria-checked="currentLanguage === language"
              @click="selectLanguage(language)"
            >
              <span class="language-option__name">{{ NATIVE_LABELS[language] }}</span>
              <span v-if="currentLanguage === language" class="language-option__check">✓</span>
            </button>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { supportedLocales, setLocale, type LocaleCode } from '@/i18n';
import AppTooltip from './ui/AppTooltip.vue';

const { t: $t, locale } = useI18n();
const currentLanguage = computed(() => locale.value as LocaleCode);
const drawerOpen = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const drawerRef = ref<HTMLElement | null>(null);
const drawerPosition = ref({ left: 16, bottom: 72 });

const ORDER: LocaleCode[] = [...supportedLocales];
const LABELS: Record<LocaleCode, string> = { zh: '中', en: 'EN', ja: '日' };
const NATIVE_LABELS: Record<LocaleCode, string> = { zh: '中文', en: 'English', ja: '日本語' };
const currentLabel = computed(() => LABELS[currentLanguage.value]);

const drawerStyle = computed(() => ({
  left: `${drawerPosition.value.left}px`,
  bottom: `${drawerPosition.value.bottom}px`,
}));

/** 将浮动面板定位到语言按钮上方，并限制在视口内。 */
const updateDrawerPosition = () => {
  const trigger = triggerRef.value;
  if (!trigger) return;

  const rect = trigger.getBoundingClientRect();
  const panelWidth = Math.min(180, window.innerWidth - 24);
  drawerPosition.value = {
    left: Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12)),
    bottom: Math.max(12, window.innerHeight - rect.top + 10),
  };
};

const openDrawer = async () => {
  drawerOpen.value = true;
  await nextTick();
  updateDrawerPosition();
};

const closeDrawer = () => {
  drawerOpen.value = false;
};

const selectLanguage = (language: LocaleCode) => {
  setLocale(language);
  closeDrawer();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && drawerOpen.value) closeDrawer();
};

const handlePointerDown = (event: PointerEvent) => {
  if (!drawerOpen.value) return;
  const target = event.target as Node;
  if (!triggerRef.value?.contains(target) && !drawerRef.value?.contains(target)) {
    closeDrawer();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', updateDrawerPosition);
  document.addEventListener('pointerdown', handlePointerDown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', updateDrawerPosition);
  document.removeEventListener('pointerdown', handlePointerDown);
});
</script>

<style scoped>
.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--apple-border-radius-medium);
  border: 1px solid var(--apple-border-color);
  background-color: var(--apple-bg-color);
  color: var(--apple-text-color-secondary);
  cursor: pointer;
  transition: all var(--apple-transition-duration) var(--apple-transition-easing);
  flex-shrink: 0;
}

.control-btn:hover {
  background-color: var(--apple-color-gray-5);
  color: var(--apple-text-color-primary);
  border-color: var(--apple-border-color-strong);
}

.lang-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1;
}

.language-drawer-layer {
  position: fixed;
  inset: auto;
  z-index: 1000;
  pointer-events: none;
}

.language-drawer {
  position: absolute;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  width: min(180px, calc(100vw - 24px));
  max-height: min(260px, calc(100vh - 24px));
  padding: 8px;
  background: var(--apple-bg-color, #fff);
  border: 1px solid var(--apple-border-color);
  border-radius: 12px;
  color: var(--apple-text-color-primary);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.08);
}

.language-options {
  display: grid;
  gap: 6px;
}

.language-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: 1px solid var(--apple-border-color);
  border-radius: 9px;
  background: transparent;
  color: var(--apple-text-color-primary);
  text-align: left;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.language-option:hover,
.language-option--active {
  border-color: var(--apple-color-primary);
  background: color-mix(in srgb, var(--apple-color-primary) 9%, transparent);
}

.language-option__name {
  flex: 1;
  font-size: 12px;
}

.language-option__check {
  color: var(--apple-color-primary);
  font-size: 16px;
  font-weight: 700;
}

.language-drawer-enter-active,
.language-drawer-leave-active {
  transition: transform 220ms ease;
  transform-origin: bottom left;
}

.language-drawer-enter-from,
.language-drawer-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
</style>
