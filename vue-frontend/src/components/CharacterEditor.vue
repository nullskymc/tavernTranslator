
<template>
  <div v-if="store.characterCard" class="character-editor">
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
        <el-button 
          type="primary" 
          @click="batchTranslate" 
          :loading="isBatchTranslating"
          size="small"
        >
          {{ $t('editor.batchTranslate') }}
        </el-button>
      </template>

      <!-- 表单内容 -->
      <el-form label-position="top" class="editor-form">
        <el-row :gutter="20">
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="`${$t('editor.name')} (Name)`">
              <el-input v-model="name" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="`${$t('editor.tags')} (Tags)`">
              <el-input v-model="tags" :placeholder="$t('editor.tagsPlaceholder')" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <FormLabelWithTranslate
                  :label="`${$t('editor.description')} (Description)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.description')"
                />
              </template>
              <el-input v-model="description" type="textarea" :rows="8" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <FormLabelWithTranslate
                  :label="`${$t('editor.personality')} (Personality)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.personality')"
                />
              </template>
              <el-input v-model="personality" type="textarea" :rows="5" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <FormLabelWithTranslate
                  :label="`${$t('editor.scenario')} (Scenario)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.scenario')"
                />
              </template>
              <el-input v-model="scenario" type="textarea" :rows="5" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <FormLabelWithTranslate
                  :label="`${$t('editor.firstMessage')} (First Message)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.first_mes')"
                />
              </template>
              <el-input v-model="first_mes" type="textarea" :rows="6" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <FormLabelWithTranslate
                  :label="`${$t('editor.exampleMessages')} (Message Example)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.mes_example')"
                />
              </template>
              <el-input v-model="mes_example" type="textarea" :rows="12" :placeholder="$t('editor.messageExamplePlaceholder')" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <FormLabelWithTranslate
                  :label="`${$t('editor.creatorNotes')} (Creator Notes)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.creator_notes')"
                />
              </template>
              <el-input v-model="creator_notes" type="textarea" :rows="6" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <span>{{ $t('editor.alternateGreetings') }} (Alternate Greetings)</span>
              </template>
              <div v-for="(greeting, index) in alternate_greetings" :key="index" class="greeting-item">
                <el-input v-model="alternate_greetings[index]" type="textarea" :rows="2" :disabled="store.isLoading" />
                <div class="greeting-actions">
                  <el-button 
                    class="translate-btn" 
                    type="primary" 
                    text 
                    @click="store.translateField(`data.alternate_greetings[${index}]`)" 
                    :loading="store.isLoading"
                  >
                    {{ $t('editor.translate') }}
                  </el-button>
                  <el-button type="danger" text @click="removeGreeting(index)" :disabled="store.isLoading">{{ $t('editor.removeGreeting') }}</el-button>
                </div>
              </div>
              <el-button @click="addGreeting" type="primary" plain :disabled="store.isLoading">{{ $t('editor.addGreeting') }}</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </EditorLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { get } from 'lodash-es';
import EditorTabs from './ui/EditorTabs.vue';
import FormLabelWithTranslate from './ui/FormLabelWithTranslate.vue';
import EditorLayout from './common/EditorLayout.vue';
import { useResponsive } from '@/composables/useResponsive';

const props = defineProps({
  currentView: {
    type: String,
    default: 'character'
  }
});

const store = useTranslatorStore();
const isBatchTranslating = ref(false);

// 移动端检测（复用）
const { isMobile } = useResponsive();

// 本地视图状态用于触发标签滑动动画
const localView = ref(props.currentView);

// 同步父级传入的视图状态
watch(() => props.currentView, (val: string) => {
  localView.value = val;
});

const useVModel = <T = string>(path: string, defaultValue?: T) => computed<T>({
  get: () => get(store.characterCard as any, path, (defaultValue as any) ?? ('' as any)) as T,
  set: (value: T) => store.updateCardField(path, value as any),
});

const name = useVModel('data.name');
const description = useVModel('data.description');
const personality = useVModel('data.personality');
const scenario = useVModel('data.scenario');
const first_mes = useVModel('data.first_mes');
const mes_example = useVModel('data.mes_example');
const creator_notes = useVModel('data.creator_notes');
const alternate_greetings = useVModel<string[]>('data.alternate_greetings', []);
const tags = computed({
  get: () => (get(store.characterCard, 'data.tags', []) || []).join(', '),
  set: (value) => store.updateCardField('data.tags', value.split(',').map(t => t.trim()).filter(Boolean))
});

const addGreeting = () => {
  const greetings = alternate_greetings.value || [];
  greetings.push('');
  store.updateCardField('data.alternate_greetings', greetings);
};

const removeGreeting = (index: number) => {
  const greetings = alternate_greetings.value || [];
  greetings.splice(index, 1);
  store.updateCardField('data.alternate_greetings', greetings);
};

// 删除旧的直接切换方法，改为延迟切换以展示动画

// 批量翻译功能
const batchTranslate = async () => {
  isBatchTranslating.value = true;
  try {
    await store.batchTranslate();
  } finally {
    isBatchTranslating.value = false;
  }
};
// 视图切换：先更新本地视图让指示条动画，再延迟通知父级切换
function switchView(view: string) {
  if (localView.value === view) return;
  localView.value = view;
  // 等待指示条动画 (~200ms) 完成后再切换父视图
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('view-change', { detail: { view } }));
  }, 220);
}

</script>

<style scoped>
.character-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-form {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.translate-btn { 
  margin-left: 10px; 
}

.greeting-item { 
  display: flex; 
  align-items: center; 
  margin-bottom: 10px; 
  width: 100%; 
}

.greeting-item .el-input { 
  flex-grow: 1; 
}

.greeting-actions { 
  display: flex; 
  flex-direction: column; 
  margin-left: 8px; 
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
  .character-editor {
    padding: 0;
  }
  
  .editor-form .el-col {
    padding: 0 5px;
  }
  
  .greeting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .greeting-actions {
    flex-direction: row;
    justify-content: space-between;
    margin-left: 0;
    gap: 8px;
  }
  
  .translate-btn {
    margin-left: 0;
    margin-top: 4px;
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
  .editor-form .el-form-item {
    margin-bottom: 16px;
  }
  
  .editor-form .el-col {
    padding: 0 2px;
  }
  
  .greeting-actions .el-button {
    font-size: 12px;
    padding: 4px 8px;
  }
  
  .translate-btn {
    font-size: 12px;
    padding: 2px 6px;
  }
}
</style>
