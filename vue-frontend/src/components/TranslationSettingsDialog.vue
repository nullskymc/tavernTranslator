<template>
  <AppDialog
    :open="dialogVisible"
    :title="$t('settings.title')"
    :width="isMobile ? '95%' : '700px'"
    :close-on-backdrop="false"
    :close-on-escape="false"
    @close="dialogVisible = false"
  >
    <div class="settings-form">
      <div class="form-field">
        <label class="form-field__label">{{ $t('settings.api') }}</label>
        <AppInput v-model="settings.api_key" type="password" :placeholder="$t('settings.apiPlaceholder')" />
        <p class="form-field__hint">{{ $t('settings.apiKeyNotice') }}</p>
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ $t('settings.baseUrl') }}</label>
        <AppInput v-model="settings.base_url" :placeholder="$t('settings.baseUrlPlaceholder')" />
      </div>
      <div class="form-field">
        <label class="form-field__label">{{ $t('settings.model') }}</label>
        <AppInput v-model="settings.model_name" :placeholder="$t('settings.modelPlaceholder')" />
      </div>

      <div class="form-field">
        <label class="form-field__label">{{ $t('settings.promptLanguage') }}</label>
        <div class="radio-group" role="radiogroup">
          <label class="radio-option">
            <input
              type="radio"
              value="zh"
              :checked="settings.prompt_language === 'zh'"
              @change="settings.prompt_language = 'zh'"
            />
            <span>{{ $t('settings.promptLanguageZh') }}</span>
          </label>
          <label class="radio-option">
            <input
              type="radio"
              value="en"
              :checked="settings.prompt_language === 'en'"
              @change="settings.prompt_language = 'en'"
            />
            <span>{{ $t('settings.promptLanguageEn') }}</span>
          </label>
          <label class="radio-option">
            <input
              type="radio"
              value="ja"
              :checked="settings.prompt_language === 'ja'"
              @change="settings.prompt_language = 'ja'"
            />
            <span>{{ $t('settings.promptLanguageJa') }}</span>
          </label>
        </div>
      </div>

      <details class="collapse" :open="activePrompt === '1'">
        <summary @click.prevent="togglePrompt('1')">{{ $t('settings.prompts.base_template') }}</summary>
        <div class="collapse__content">
          <AppInput
            v-model="settings.prompts.base_template"
            type="textarea"
            :rows="8"
            :placeholder="$t('settings.prompts.placeholder')"
          />
        </div>
      </details>
      <details class="collapse" :open="activePrompt === '2'">
        <summary @click.prevent="togglePrompt('2')">{{ $t('settings.prompts.description_template') }}</summary>
        <div class="collapse__content">
          <AppInput
            v-model="settings.prompts.description_template"
            type="textarea"
            :rows="8"
            :placeholder="$t('settings.prompts.placeholder')"
          />
        </div>
      </details>
      <details class="collapse" :open="activePrompt === '3'">
        <summary @click.prevent="togglePrompt('3')">{{ $t('settings.prompts.dialogue_template') }}</summary>
        <div class="collapse__content">
          <AppInput
            v-model="settings.prompts.dialogue_template"
            type="textarea"
            :rows="8"
            :placeholder="$t('settings.prompts.placeholder')"
          />
        </div>
      </details>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <AppButton @click="dialogVisible = false">{{ $t('settings.cancel') }}</AppButton>
        <AppButton variant="primary" @click="saveSettings">
          {{ $t('settings.save') }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useTranslatorStore, getDefaultPrompts } from '@/stores/translator';
import { useToast } from '@/components/ui/useToast';
import AppDialog from './ui/AppDialog.vue';
import AppInput from './ui/AppInput.vue';
import AppButton from './ui/AppButton.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue']);

const store = useTranslatorStore();
const toast = useToast();

const isMobile = ref(false);
const activePrompt = ref('1');

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const settings = ref({ ...store.translationSettings });

const dialogVisible = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val;
  if (val) {
    settings.value = JSON.parse(JSON.stringify(store.translationSettings));
  }
});

watch(dialogVisible, (val) => {
  emit('update:modelValue', val);
});

watch(() => settings.value.prompt_language, (newLang) => {
  settings.value.prompts = getDefaultPrompts(newLang);
});

const togglePrompt = (name: string) => {
  activePrompt.value = activePrompt.value === name ? '' : name;
};

const saveSettings = () => {
  store.translationSettings.api_key = settings.value.api_key;
  store.translationSettings.base_url = settings.value.base_url;
  store.translationSettings.model_name = settings.value.model_name;
  store.translationSettings.prompt_language = settings.value.prompt_language;
  store.translationSettings.prompts = settings.value.prompts;

  toast.success(t('settings.saveSuccess'));
  dialogVisible.value = false;
};
</script>

<style scoped>
/* 表单标签：小写微型标签风格 */
.form-field {
  margin-bottom: 16px;
}

.form-field__label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--apple-text-color-secondary);
  line-height: 1.4;
  padding-bottom: 6px;
}

.form-field__hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--apple-text-color-tertiary, var(--apple-text-color-secondary));
}

/* Radio group — flat, native */
.radio-group {
  display: flex;
  gap: 16px;
}

.radio-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--apple-text-color-primary);
  cursor: pointer;
}

.radio-option input[type='radio'] {
  accent-color: var(--apple-color-primary);
  width: 15px;
  height: 15px;
  cursor: pointer;
}

/* Collapse section — flat, no card shadow */
.collapse {
  border-top: 1px solid var(--apple-border-color);
  border-bottom: none;
  margin-top: 4px;
}

.collapse + .collapse {
  margin-top: 0;
  border-top: none;
}

.collapse summary {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--apple-text-color-secondary);
  padding: 10px 0;
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

.collapse summary::-webkit-details-marker {
  display: none;
}

.collapse summary::after {
  content: '+';
  font-size: 14px;
  color: var(--apple-text-color-tertiary);
  transition: transform 0.2s var(--apple-transition-easing);
}

.collapse[open] summary::after {
  content: '−';
}

.collapse__content {
  padding: 4px 0 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
