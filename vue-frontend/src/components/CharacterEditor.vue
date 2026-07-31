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
        <AppButton
          variant="primary"
          size="sm"
          :loading="isBatchTranslating"
          @click="batchTranslate"
        >
          {{ $t('editor.batchTranslate') }}
        </AppButton>
      </template>

      <!-- 表单内容 -->
      <div class="editor-form">
        <div class="form-grid">
          <div class="form-col">
            <div class="form-field">
              <label class="form-field__label">{{ $t('editor.name') }} (Name)</label>
              <AppInput v-model="name" :disabled="store.isLoading" />
            </div>
          </div>
          <div class="form-col">
            <div class="form-field">
              <label class="form-field__label">{{ $t('editor.tags') }} (Tags)</label>
              <AppInput v-model="tags" :placeholder="$t('editor.tagsPlaceholder')" :disabled="store.isLoading" />
            </div>
          </div>
          <div class="form-col form-col--full">
            <div class="form-field">
              <div class="form-field__label">
                <FormLabelWithTranslate
                  :label="`${$t('editor.description')} (Description)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.description')"
                />
              </div>
              <AppInput v-model="description" type="textarea" :rows="8" :disabled="store.isLoading" />
            </div>
          </div>
          <div class="form-col form-col--full">
            <div class="form-field">
              <div class="form-field__label">
                <FormLabelWithTranslate
                  :label="`${$t('editor.personality')} (Personality)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.personality')"
                />
              </div>
              <AppInput v-model="personality" type="textarea" :rows="5" :disabled="store.isLoading" />
            </div>
          </div>
          <div class="form-col form-col--full">
            <div class="form-field">
              <div class="form-field__label">
                <FormLabelWithTranslate
                  :label="`${$t('editor.scenario')} (Scenario)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.scenario')"
                />
              </div>
              <AppInput v-model="scenario" type="textarea" :rows="5" :disabled="store.isLoading" />
            </div>
          </div>
          <div class="form-col form-col--full">
            <div class="form-field">
              <div class="form-field__label">
                <FormLabelWithTranslate
                  :label="`${$t('editor.firstMessage')} (First Message)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.first_mes')"
                />
              </div>
              <AppInput v-model="first_mes" type="textarea" :rows="6" :disabled="store.isLoading" />
            </div>
          </div>
          <div class="form-col form-col--full">
            <div class="form-field">
              <div class="form-field__label">
                <FormLabelWithTranslate
                  :label="`${$t('editor.exampleMessages')} (Message Example)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.mes_example')"
                />
              </div>
              <AppInput v-model="mes_example" type="textarea" :rows="12" :placeholder="$t('editor.messageExamplePlaceholder')" :disabled="store.isLoading" />
            </div>
          </div>
          <div class="form-col form-col--full">
            <div class="form-field">
              <div class="form-field__label">
                <FormLabelWithTranslate
                  :label="`${$t('editor.creatorNotes')} (Creator Notes)`"
                  :button-text="$t('editor.translate')"
                  :loading="store.isLoading"
                  @translate="store.translateField('data.creator_notes')"
                />
              </div>
              <AppInput v-model="creator_notes" type="textarea" :rows="6" :disabled="store.isLoading" />
            </div>
          </div>
          <div class="form-col form-col--full">
            <div class="form-field">
              <div class="form-field__label">
                <span>{{ $t('editor.alternateGreetings') }} (Alternate Greetings)</span>
              </div>
              <div v-for="(greeting, index) in alternate_greetings" :key="index" class="greeting-item">
                <AppInput v-model="alternate_greetings[index]" type="textarea" :rows="2" :disabled="store.isLoading" />
                <div class="greeting-actions">
                  <AppButton
                    class="btn-link"
                    variant="text"
                    size="sm"
                    :loading="store.isLoading"
                    @click="store.translateField(`data.alternate_greetings[${index}]`)"
                  >
                    {{ $t('editor.translate') }}
                  </AppButton>
                  <AppButton
                    class="btn-link btn-link--danger"
                    variant="text"
                    size="sm"
                    :disabled="store.isLoading"
                    @click="removeGreeting(index)"
                  >
                    {{ $t('editor.removeGreeting') }}
                  </AppButton>
                </div>
              </div>
              <AppButton variant="primary" plain :disabled="store.isLoading" @click="addGreeting">{{ $t('editor.addGreeting') }}</AppButton>
            </div>
          </div>
        </div>
      </div>
    </EditorLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { getCardField } from '@/utils/card-path';
import AppButton from './ui/AppButton.vue';
import AppInput from './ui/AppInput.vue';
import EditorTabs from './ui/EditorTabs.vue';
import FormLabelWithTranslate from './ui/FormLabelWithTranslate.vue';
import EditorLayout from './common/EditorLayout.vue';

const props = defineProps({
  currentView: {
    type: String,
    default: 'character'
  }
});

const store = useTranslatorStore();
const isBatchTranslating = ref(false);


// 本地视图状态用于触发标签滑动动画
const localView = ref(props.currentView);

// 同步父级传入的视图状态
watch(() => props.currentView, (val: string) => {
  localView.value = val;
});

const useVModel = <T = string>(path: string, defaultValue?: T) => computed<T>({
  get: () => (getCardField(store.characterCard, path) ?? (defaultValue as any) ?? ('' as any)) as T,
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
  get: () => (getCardField(store.characterCard, 'data.tags') ?? []).join(', '),
  set: (value) => store.updateCardField('data.tags', value.split(',').map((t: string) => t.trim()).filter(Boolean))
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

// 批量翻译功能
const batchTranslate = async () => {
  isBatchTranslating.value = true;
  try {
    await store.batchTranslate();
  } finally {
    isBatchTranslating.value = false;
  }
};

// 视图切换：下划线 tab 无需动画延迟，直接切换
function switchView(view: string) {
  if (localView.value === view) return;
  localView.value = view;
  window.dispatchEvent(new CustomEvent('view-change', { detail: { view } }));
}
</script>

<style scoped>
.character-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: fadeSlideUp 0.35s var(--tt-smooth) both;
}

.editor-form {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 两列网格表单布局 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}

.form-col--full {
  grid-column: 1 / -1;
}

/* Each form field animates in with stagger */
.editor-form .form-field {
  animation: fadeSlideUp 0.3s var(--tt-smooth) both;
}

.editor-form .form-col:nth-child(1) .form-field { animation-delay: 0s; }
.editor-form .form-col:nth-child(2) .form-field { animation-delay: 0.03s; }
.editor-form .form-col:nth-child(3) .form-field { animation-delay: 0.06s; }
.editor-form .form-col:nth-child(4) .form-field { animation-delay: 0.09s; }
.editor-form .form-col:nth-child(5) .form-field { animation-delay: 0.12s; }
.editor-form .form-col:nth-child(6) .form-field { animation-delay: 0.15s; }
.editor-form .form-col:nth-child(7) .form-field { animation-delay: 0.18s; }
.editor-form .form-col:nth-child(8) .form-field { animation-delay: 0.21s; }

/* 表单标签：小写微型标签风格（与原生设计一致） */
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

/* Alternate greeting row */
.greeting-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
  width: 100%;
  padding: 8px;
  border-radius: var(--apple-border-radius-medium);
  border: 1px solid transparent;
  transition: all 0.2s var(--tt-smooth);
}

.greeting-item:hover {
  border-color: var(--apple-border-color);
  background-color: var(--apple-bg-color-secondary);
}

.greeting-item .app-input-wrapper {
  flex: 1;
  min-width: 0;
}

.greeting-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

/* 文本链接式按钮（翻译 / 删除） */
.btn-link {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  color: var(--apple-color-primary);
}

.btn-link--danger {
  color: var(--apple-color-danger);
}

/* Mobile */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .greeting-item {
    flex-direction: column;
    align-items: stretch;
    padding: 6px;
  }

  .greeting-actions {
    flex-direction: row;
    justify-content: flex-end;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .editor-form .form-field {
    margin-bottom: 16px;
  }

  .greeting-actions .app-btn {
    font-size: 12px;
    padding: 4px 8px;
  }
}
</style>
