<template>
  <div v-if="store.characterCard && characterBook" class="character-book-editor">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <EditorTabs
            :tabs="[
              { label: $t('sidebar.viewSwitch.character'), value: 'character' },
              { label: $t('sidebar.viewSwitch.characterBook'), value: 'character-book' },
            ]"
            :model-value="currentView"
            @update:modelValue="switchView"
          />
          <div class="header-actions">
            <el-button 
              type="primary" 
              @click="batchTranslate" 
              :loading="isBatchTranslating"
              size="small"
            >
              {{ $t('editor.batchTranslate') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- character_book 基本信息 -->
      <el-form label-position="top" class="book-form">
        <el-row :gutter="20">
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="`${$t('characterBook.name')} (Name)`">
              <el-input v-model="bookName" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="`${$t('characterBook.description')} (Description)`">
              <el-input v-model="bookDescription" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 8">
            <el-form-item :label="`${$t('characterBook.scanDepth')} (Scan Depth)`">
              <el-input-number v-model="scanDepth" :min="0" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 8">
            <el-form-item :label="`${$t('characterBook.tokenBudget')} (Token Budget)`">
              <el-input-number v-model="tokenBudget" :min="0" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 8">
            <el-form-item :label="`${$t('characterBook.recursiveScanning')} (Recursive Scanning)`">
              <el-switch v-model="recursiveScanning" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- entries 列表 -->
      <div class="entries-section">
        <div class="section-header">
          <h3>{{ $t('characterBook.entries') }}</h3>
          <el-button @click="addEntry" type="primary" plain :disabled="store.isLoading">{{ $t('characterBook.addEntry') }}</el-button>
        </div>

        <div v-for="(entry, index) in entries" :key="entry.id || index" class="entry-item">
          <el-card class="entry-card">
            <template #header>
              <div class="entry-header">
                <span>{{ $t('characterBook.entry') }} {{ index + 1 }}</span>
                <el-button @click="removeEntry(index)" type="danger" text :disabled="store.isLoading">{{ $t('characterBook.removeEntry') }}</el-button>
              </div>
            </template>

            <el-form label-position="top" class="entry-form">
              <el-row :gutter="20">
                <el-col :span="isMobile ? 24 : 12">
                  <el-form-item :label="`${$t('characterBook.entryName')} (Name)`">
                    <el-input v-model="entry.name" :disabled="store.isLoading" />
                  </el-form-item>
                </el-col>
                <el-col :span="isMobile ? 24 : 12">
                  <el-form-item :label="`${$t('characterBook.entryKeys')} (Keys)`">
                    <el-input v-model="entryKeys[index]" :disabled="store.isLoading" />
                  </el-form-item>
                </el-col>
                <el-col :span="isMobile ? 24 : 12">
                  <el-form-item :label="`${$t('characterBook.entrySecondaryKeys')} (Secondary Keys)`">
                    <el-input v-model="entrySecondaryKeys[index]" :disabled="store.isLoading" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item>
                    <template #label>
                      <FormLabelWithTranslate
                        :label="`${$t('characterBook.entryContent')} (Content)`"
                        :button-text="$t('editor.translate')"
                        :loading="store.isLoading"
                        @translate="translateContent(index)"
                      />
                    </template>
                    <el-input 
                      v-model="entry.content" 
                      type="textarea" 
                      :rows="6" 
                      :placeholder="$t('characterBook.contentPlaceholder')"
                      :disabled="store.isLoading"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="isMobile ? 24 : 8">
                  <el-form-item :label="`${$t('characterBook.entryEnabled')} (Enabled)`">
                    <el-switch v-model="entry.enabled" :disabled="store.isLoading" />
                  </el-form-item>
                </el-col>
                <el-col :span="isMobile ? 24 : 8">
                  <el-form-item :label="`${$t('characterBook.entryCaseSensitive')} (Case Sensitive)`">
                    <el-switch v-model="entry.case_sensitive" :disabled="store.isLoading" />
                  </el-form-item>
                </el-col>
                <el-col :span="isMobile ? 24 : 8">
                  <el-form-item :label="`${$t('characterBook.entryPriority')} (Priority)`">
                    <el-input-number v-model="entry.priority" :min="0" :disabled="store.isLoading" />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </el-card>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { get } from 'lodash-es';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import EditorTabs from './ui/EditorTabs.vue';
import FormLabelWithTranslate from './ui/FormLabelWithTranslate.vue';
import { useResponsive } from '@/composables/useResponsive';

const props = defineProps({
  currentView: {
    type: String,
    default: 'character-book'
  }
});

const store = useTranslatorStore();
const isBatchTranslating = ref(false);

// 移动端检测（复用）
const { isMobile } = useResponsive();

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
  set: (value) => store.updateCardField('data.character_book.scan_depth', value)
});

const tokenBudget = computed({
  get: () => characterBook.value?.token_budget || 0,
  set: (value) => store.updateCardField('data.character_book.token_budget', value)
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
    ElMessage.warning('内容为空，无需翻译');
    return;
  }
  
  if (!store.translationSettings.api_key) {
    ElMessage.warning('请先在设置中提供您的 API Key');
    return;
  }
  
  store.isLoading = true;
  try {
    const response = await axios.post('/api/v1/character/translate-character-book', {
      content: characterBook.value.lore[index].content,
      settings: {
        api_key: store.translationSettings.api_key,
        base_url: store.translationSettings.base_url,
        model_name: store.translationSettings.model_name,
      },
      prompts: store.translationSettings.prompts,
    });
    
    // 更新内容
    const newEntries = [...(entries.value || [])];
    newEntries[index].content = response.data.translated_content;
    store.updateCardField('data.character_book.lore', newEntries);
    
    ElMessage.success('内容翻译成功');
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || '翻译服务出错';
    ElMessage.error(`翻译失败: ${errorMessage}`);
  } finally {
    store.isLoading = false;
  }
};

  // 视图切换方法
  const switchView = (view: string) => {
    // 通过事件将视图切换请求传递给父组件
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
</script>

<style scoped>
.character-book-editor {
  padding: 20px 0;
}

.card-header {
  font-size: 1.2em;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.editor-tabs {
  display: flex;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.tab {
  padding: 8px 16px;
  cursor: pointer;
  background-color: var(--el-fill-color-light);
  transition: all 0.3s;
  border-right: 1px solid var(--el-border-color-light);
  position: relative;
}

.tab:last-child {
  border-right: none;
}

.tab:hover {
  background-color: var(--el-fill-color);
}

.tab.active {
  background-color: var(--el-color-primary);
  color: white;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: white;
}

.entries-section {
  margin-top: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
}

.entry-item {
  margin-bottom: 20px;
}

.entry-card {
  border: 1px solid var(--el-border-color-light);
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-with-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.label-with-btn .translate-btn {
  margin-left: 10px;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .character-book-editor {
    padding: 0;
  }
  
  .card-header {
    font-size: 1.1em;
  }
  
  .book-form .el-col {
    padding: 0 5px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .label-with-btn {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .label-with-btn .translate-btn {
    margin-left: 0;
    align-self: flex-end;
  }
}

@media (max-width: 480px) {
  .card-header {
    font-size: 1em;
  }
  
  .book-form .el-form-item {
    margin-bottom: 16px;
  }
  
  .book-form .el-col {
    padding: 0 2px;
  }
  
  .translate-btn {
    font-size: 12px;
    padding: 2px 6px;
  }
}
</style>