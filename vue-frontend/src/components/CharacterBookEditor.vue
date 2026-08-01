<template>
  <div v-if="store.characterCard" class="character-book-editor">
    <EditorLayout>
      <template #tabs>
        <EditorTabs
          :tabs="[
            { label: $t('sidebar.viewSwitch.character'), value: 'character' },
            { label: $t('sidebar.viewSwitch.characterBook'), value: 'character-book' },
          ]"
          :model-value="localView"
          @update:modelValue="switchView"
        />
      </template>

      <template #actions>
        <AppButton
          variant="primary"
          size="sm"
          :loading="isBatchTranslating"
          :disabled="!characterBook"
          @click="batchTranslate"
        >
          {{ $t('editor.batchTranslate') }}
        </AppButton>
      </template>

      <!-- 当有角色书时显示编辑内容 -->
      <div v-if="characterBook" class="book-editor-content">
        <!-- character_book 基本信息 -->
        <div class="book-form">
          <div class="form-grid">
            <div class="form-col">
              <div class="form-field">
                <label class="form-field__label">{{ $t('characterBook.name') }} (Name)</label>
                <AppInput v-model="bookName" :disabled="store.isLoading" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-field">
                <label class="form-field__label">{{ $t('characterBook.description') }} (Description)</label>
                <AppInput v-model="bookDescription" :disabled="store.isLoading" />
              </div>
            </div>
          </div>
          <div class="form-grid form-grid--triple">
            <div class="form-col">
              <div class="form-field">
                <label class="form-field__label">{{ $t('characterBook.scanDepth') }} (Scan Depth)</label>
                <AppInput v-model="scanDepth" type="number" :disabled="store.isLoading" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-field">
                <label class="form-field__label">{{ $t('characterBook.tokenBudget') }} (Token Budget)</label>
                <AppInput v-model="tokenBudget" type="number" :disabled="store.isLoading" />
              </div>
            </div>
            <div class="form-col">
              <div class="form-field">
                <label class="form-field__label">{{ $t('characterBook.recursiveScanning') }} (Recursive Scanning)</label>
                <AppSwitch v-model="recursiveScanning" :disabled="store.isLoading" />
              </div>
            </div>
          </div>
        </div>

        <!-- entries 列表 -->
        <div class="entries-section">
          <div class="section-header">
            <h3>{{ $t('characterBook.entries') }}</h3>
            <AppButton variant="primary" plain :disabled="store.isLoading" @click="addEntry">{{ $t('characterBook.addEntry') }}</AppButton>
          </div>

          <div v-for="(entry, index) in entries" :key="entry.id || index" class="entry-item">
            <div class="entry-card">
              <div class="entry-header">
                <span>{{ $t('characterBook.entry') }} {{ index + 1 }}</span>
                <AppButton class="btn-link btn-link--danger" variant="text" size="sm" :disabled="store.isLoading" @click="removeEntry(index)">
                  {{ $t('characterBook.removeEntry') }}
                </AppButton>
              </div>

              <div class="entry-form">
                <div class="form-grid">
                  <div class="form-col">
                    <div class="form-field">
                      <label class="form-field__label">{{ $t('characterBook.entryName') }} (Name)</label>
                      <AppInput v-model="entry.name" :disabled="store.isLoading" />
                    </div>
                  </div>
                  <div class="form-col">
                    <div class="form-field">
                      <label class="form-field__label">{{ $t('characterBook.entryKeys') }} (Keys)</label>
                      <AppInput v-model="entryKeys[index]" :disabled="store.isLoading" />
                    </div>
                  </div>
                  <div class="form-col">
                    <div class="form-field">
                      <label class="form-field__label">{{ $t('characterBook.entrySecondaryKeys') }} (Secondary Keys)</label>
                      <AppInput v-model="entrySecondaryKeys[index]" :disabled="store.isLoading" />
                    </div>
                  </div>
                  <div class="form-col form-col--full">
                    <div class="form-field">
                      <div class="form-field__label">
                        <FormLabelWithTranslate
                          :label="`${$t('characterBook.entryContent')} (Content)`"
                          :button-text="$t('editor.translate')"
                          :loading="store.isLoading"
                          @translate="translateContent(index)"
                        />
                      </div>
                      <AppInput
                        v-model="entry.content"
                        type="textarea"
                        :rows="6"
                        :placeholder="$t('characterBook.contentPlaceholder')"
                        :disabled="store.isLoading"
                      />
                    </div>
                  </div>
                </div>
                <div class="form-grid form-grid--triple">
                  <div class="form-col">
                    <div class="form-field">
                      <label class="form-field__label">{{ $t('characterBook.entryEnabled') }} (Enabled)</label>
                      <AppSwitch v-model="entry.enabled" :disabled="store.isLoading" />
                    </div>
                  </div>
                  <div class="form-col">
                    <div class="form-field">
                      <label class="form-field__label">{{ $t('characterBook.entryCaseSensitive') }} (Case Sensitive)</label>
                      <AppSwitch v-model="entry.case_sensitive" :disabled="store.isLoading" />
                    </div>
                  </div>
                  <div class="form-col">
                    <div class="form-field">
                      <label class="form-field__label">{{ $t('characterBook.entryPriority') }} (Priority)</label>
                      <AppInput v-model="entry.priority" type="number" :disabled="store.isLoading" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 当没有角色书时显示创建提示 -->
      <div v-else class="no-book-content">
        <div class="no-book-empty">
          <AppIcon name="notebook" :size="48" />
          <p>{{ $t('characterBook.noCharacterBook') }}</p>
        </div>
        <AppButton variant="primary" @click="createCharacterBook">{{ $t('characterBook.createCharacterBook') }}</AppButton>
      </div>
    </EditorLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTranslatorStore } from '@/stores/translator';

const { t: $t } = useI18n();
import { useToast } from '@/components/ui/useToast';
import { translateCharacterBook } from '@/services/api';
import AppButton from './ui/AppButton.vue';
import AppInput from './ui/AppInput.vue';
import AppSwitch from './ui/AppSwitch.vue';
import AppIcon from './ui/AppIcon.vue';
import EditorTabs from './ui/EditorTabs.vue';
import FormLabelWithTranslate from './ui/FormLabelWithTranslate.vue';
import EditorLayout from './common/EditorLayout.vue';

const props = defineProps({
  currentView: {
    type: String,
    default: 'character-book'
  }
});

const store = useTranslatorStore();
const toast = useToast();
const isBatchTranslating = ref(false);


// 本地视图状态用于触发标签滑动动画
const localView = ref(props.currentView);

// 同步父级传入的视图状态
watch(() => props.currentView, (val: string) => {
  localView.value = val;
});

// character_book 数据访问
const characterBook = computed(() => store.characterCard?.data?.character_book);

// 基本信息字段
const bookName = computed({
  get: () => characterBook.value?.name || '',
  set: (value) => store.updateCardField('data.character_book.name', value)
});

const bookDescription = computed({
  get: () => characterBook.value?.description || '',
  set: (value) => store.updateCardField('data.character_book.description', value)
});

const scanDepth = computed({
  get: () => characterBook.value?.scan_depth || 0,
  set: (value: number) => store.updateCardField('data.character_book.scan_depth', value)
});

const tokenBudget = computed({
  get: () => characterBook.value?.token_budget || 0,
  set: (value: number) => store.updateCardField('data.character_book.token_budget', value)
});

const recursiveScanning = computed({
  get: () => characterBook.value?.recursive_scanning || false,
  set: (value) => store.updateCardField('data.character_book.recursive_scanning', value)
});

// entries 字段
const entries = computed({
  get: () => characterBook.value?.lore || [],
  set: (value) => store.updateCardField('data.character_book.lore', value)
});

// 处理 keys 和 secondary_keys 的字符串表示
const entryKeys = computed({
  get: () => (entries.value || []).map(entry => (entry.keys || []).join(', ')),
  set: (values) => {
    const newEntries = [...(entries.value || [])];
    values.forEach((value: string, index: number) => {
      if (newEntries[index]) {
        newEntries[index].keys = value.split(',').map((k: string) => k.trim()).filter(Boolean);
      }
    });
    store.updateCardField('data.character_book.lore', newEntries);
  }
});

const entrySecondaryKeys = computed({
  get: () => (entries.value || []).map(entry => (entry.secondary_keys || []).join(', ')),
  set: (values) => {
    const newEntries = [...(entries.value || [])];
    values.forEach((value: string, index: number) => {
      if (newEntries[index]) {
        newEntries[index].secondary_keys = value.split(',').map((k: string) => k.trim()).filter(Boolean);
      }
    });
    store.updateCardField('data.character_book.lore', newEntries);
  }
});

// entries 操作方法
const addEntry = () => {
  const newEntries = [...(entries.value || [])];
  newEntries.push({
    name: '',
    keys: [],
    secondary_keys: [],
    content: '',
    enabled: true,
    insertion_order: newEntries.length,
    case_sensitive: false,
    priority: 0,
    id: Date.now() // 用于 Vue key
  });
  store.updateCardField('data.character_book.lore', newEntries);
};

const removeEntry = (index: number) => {
  const newEntries = [...(entries.value || [])];
  newEntries.splice(index, 1);
  store.updateCardField('data.character_book.lore', newEntries);
};

// 翻译 content 字段
const translateContent = async (index: number) => {
  if (!characterBook.value?.lore?.[index]?.content) {
    toast.warning($t('notifications.characterBookContentEmpty'));
    return;
  }

  if (!store.translationSettings.api_key) {
    toast.warning($t('notifications.apiKeyRequired'));
    return;
  }

  store.isLoading = true;
  try {
    const response = await translateCharacterBook({
      content: characterBook.value.lore[index].content,
      settings: {
        api_key: store.translationSettings.api_key,
        base_url: store.translationSettings.base_url,
        model_name: store.translationSettings.model_name,
        api_mode: store.translationSettings.api_mode,
      },
      prompts: store.translationSettings.prompts,
    });

    // 更新内容
    const newEntries = [...(entries.value || [])];
    newEntries[index].content = response.translated_content;
    store.updateCardField('data.character_book.lore', newEntries);

    toast.success($t('notifications.characterBookContentTranslated'));
  } catch (error: any) {
    const errorMessage = error.message || $t('notifications.translationServiceError');
    toast.error(`翻译失败: ${errorMessage}`);
  } finally {
    store.isLoading = false;
  }
};

// 视图切换：下划线 tab 无需动画延迟，直接切换
const switchView = (view: string) => {
  if (localView.value === view) return;
  localView.value = view;
  window.dispatchEvent(new CustomEvent('view-change', { detail: { view } }));
};

// 批量翻译功能
const batchTranslate = async () => {
  isBatchTranslating.value = true;
  try {
    await store.batchTranslate();
  } finally {
    isBatchTranslating.value = false;
  }
};

// 创建角色书
const createCharacterBook = () => {
  store.updateCardField('data.character_book', {
    name: '',
    description: '',
    scan_depth: 0,
    token_budget: 0,
    recursive_scanning: false,
    lore: []
  });
};
</script>

<style scoped>
.character-book-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.book-editor-content {
  height: 100%;
}

.book-form {
  flex-shrink: 0;
}

.entries-section {
  margin-top: 24px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Section header: flat, no heavy h3 weight */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--apple-text-color-secondary);
}

.entry-item {
  margin-bottom: 16px;
}

/* Flat card for each entry — thin border, no shadow */
.entry-card {
  border: 1px solid var(--apple-border-color);
  box-shadow: none;
  border-radius: 6px;
  overflow: hidden;
}

.entry-card .entry-header {
  padding: 10px 16px;
  border-bottom: 1px solid var(--apple-border-color-secondary);
  background: var(--apple-bg-color-secondary);
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--apple-text-color-secondary);
}

.entry-form {
  padding: 16px;
}

/* 两列网格表单布局 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}

.form-grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-col--full {
  grid-column: 1 / -1;
}

.form-field {
  margin-bottom: 20px;
}

.form-field__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--apple-text-color-secondary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding-bottom: 6px;
  line-height: 1.5;
}

/* 文本链接式按钮 */
.btn-link {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  color: var(--apple-color-primary);
}

.btn-link--danger {
  color: var(--apple-color-danger);
}

/* Empty state */
.no-book-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 20px;
}

.no-book-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--apple-text-color-tertiary);
}

.no-book-empty p {
  margin: 0;
  font-size: 13px;
}

/* Mobile */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .form-grid,
  .form-grid--triple {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .book-form .form-field {
    margin-bottom: 16px;
  }
}
</style>
