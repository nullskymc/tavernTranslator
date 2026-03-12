<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('settings.title')"
    :width="isMobile ? '95%' : '700px'"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form label-position="top" :model="settings">
      <el-form-item :label="$t('settings.api')">
        <el-input v-model="settings.api_key" :placeholder="$t('settings.apiPlaceholder')" show-password />
      </el-form-item>
      <el-form-item :label="$t('settings.baseUrl')">
        <el-input v-model="settings.base_url" :placeholder="$t('settings.baseUrlPlaceholder')" />
      </el-form-item>
      <el-form-item :label="$t('settings.model')">
        <el-input v-model="settings.model_name" :placeholder="$t('settings.modelPlaceholder')" />
      </el-form-item>
      
      <el-form-item :label="$t('settings.promptLanguage')">
        <el-radio-group v-model="settings.prompt_language">
          <el-radio label="zh">{{ $t('settings.promptLanguageZh') }}</el-radio>
          <el-radio label="en">{{ $t('settings.promptLanguageEn') }}</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-collapse v-model="activePrompt">
        <el-collapse-item :title="$t('settings.prompts.base_template')" name="1">
          <el-input
            v-model="settings.prompts.base_template"
            type="textarea"
            :rows="8"
            :placeholder="$t('settings.prompts.placeholder')"
          />
        </el-collapse-item>
        <el-collapse-item :title="$t('settings.prompts.description_template')" name="2">
          <el-input
            v-model="settings.prompts.description_template"
            type="textarea"
            :rows="8"
            :placeholder="$t('settings.prompts.placeholder')"
          />
        </el-collapse-item>
        <el-collapse-item :title="$t('settings.prompts.dialogue_template')" name="3">
          <el-input
            v-model="settings.prompts.dialogue_template"
            type="textarea"
            :rows="8"
            :placeholder="$t('settings.prompts.placeholder')"
          />
        </el-collapse-item>
      </el-collapse>

    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">{{ $t('settings.cancel') }}</el-button>
        <el-button type="primary" @click="saveSettings">
          {{ $t('settings.save') }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useTranslatorStore, defaultPromptsZh, defaultPromptsEn } from '@/stores/translator';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(['update:modelValue']);

const store = useTranslatorStore();

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
  if (newLang === 'en') {
    settings.value.prompts = { ...defaultPromptsEn };
  } else {
    settings.value.prompts = { ...defaultPromptsZh };
  }
});

const saveSettings = () => {
  store.translationSettings.api_key = settings.value.api_key;
  store.translationSettings.base_url = settings.value.base_url;
  store.translationSettings.model_name = settings.value.model_name;
  store.translationSettings.prompt_language = settings.value.prompt_language;
  store.translationSettings.prompts = settings.value.prompts;
  
  ElMessage.success(t('settings.saveSuccess'));
  dialogVisible.value = false;
};
</script>

<style scoped>
/* Tighten the form to match the flat OpenAI aesthetic */
:deep(.el-dialog__header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-right: 0;
}

:deep(.el-dialog__title) {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--el-text-color-primary);
}

:deep(.el-dialog__body) {
  padding: 20px 24px;
}

:deep(.el-dialog__footer) {
  padding: 12px 24px 20px;
  border-top: 1px solid var(--el-border-color-light);
}

/* Form labels: uppercase micro-label style */
:deep(.el-form-item__label) {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  padding-bottom: 6px;
}

/* Tighter form item spacing */
:deep(.el-form-item) {
  margin-bottom: 16px;
}

/* Collapse section — flat, no card shadow */
:deep(.el-collapse) {
  border-top: 1px solid var(--el-border-color-light);
  border-bottom: none;
  margin-top: 4px;
}

:deep(.el-collapse-item__header) {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--el-text-color-secondary);
  height: 40px;
  line-height: 40px;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 12px;
}

/* Radio buttons */
:deep(.el-radio__label) {
  font-size: 13px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
