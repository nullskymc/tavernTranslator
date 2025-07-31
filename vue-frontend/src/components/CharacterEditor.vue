
<template>
  <div v-if="store.characterCard" class="character-editor">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <div class="editor-tabs">
            <div 
              class="tab" 
              :class="{ active: currentView === 'character' }"
              @click="switchView('character')"
            >
              {{ $t('sidebar.viewSwitch.character') }}
            </div>
            <div 
              class="tab" 
              :class="{ active: currentView === 'character-book' }"
              @click="switchView('character-book')"
            >
              {{ $t('sidebar.viewSwitch.characterBook') }}
            </div>
          </div>
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
                <div class="label-with-btn">
                  <span>{{ $t('editor.description') }} (Description)</span>
                  <el-button 
                    class="translate-btn" 
                    type="primary" 
                    text 
                    @click="store.translateField('data.description')" 
                    :loading="store.isLoading"
                  >
                    {{ $t('editor.translate') }}
                  </el-button>
                </div>
              </template>
              <el-input v-model="description" type="textarea" :rows="8" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <div class="label-with-btn">
                  <span>{{ $t('editor.personality') }} (Personality)</span>
                  <el-button 
                    class="translate-btn" 
                    type="primary" 
                    text 
                    @click="store.translateField('data.personality')" 
                    :loading="store.isLoading"
                  >
                    {{ $t('editor.translate') }}
                  </el-button>
                </div>
              </template>
              <el-input v-model="personality" type="textarea" :rows="5" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <div class="label-with-btn">
                  <span>{{ $t('editor.scenario') }} (Scenario)</span>
                  <el-button 
                    class="translate-btn" 
                    type="primary" 
                    text 
                    @click="store.translateField('data.scenario')" 
                    :loading="store.isLoading"
                  >
                    {{ $t('editor.translate') }}
                  </el-button>
                </div>
              </template>
              <el-input v-model="scenario" type="textarea" :rows="5" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <div class="label-with-btn">
                  <span>{{ $t('editor.firstMessage') }} (First Message)</span>
                  <el-button 
                    class="translate-btn" 
                    type="primary" 
                    text 
                    @click="store.translateField('data.first_mes')" 
                    :loading="store.isLoading"
                  >
                    {{ $t('editor.translate') }}
                  </el-button>
                </div>
              </template>
              <el-input v-model="first_mes" type="textarea" :rows="6" :disabled="store.isLoading" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item>
              <template #label>
                <div class="label-with-btn">
                  <span>{{ $t('editor.exampleMessages') }} (Message Example)</span>
                  <el-button 
                    class="translate-btn" 
                    type="primary" 
                    text 
                    @click="store.translateField('data.mes_example')" 
                    :loading="store.isLoading"
                  >
                    {{ $t('editor.translate') }}
                  </el-button>
                </div>
              </template>
              <el-input v-model="mes_example" type="textarea" :rows="12" :placeholder="$t('editor.messageExamplePlaceholder')" :disabled="store.isLoading" />
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
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { get, set } from 'lodash-es';

const props = defineProps({
  currentView: {
    type: String,
    default: 'character'
  }
});

const store = useTranslatorStore();
const isBatchTranslating = ref(false);

// 移动端检测
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const handleResize = () => {
  checkMobile();
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const useVModel = (path, defaultValue = '') => computed({
  get: () => get(store.characterCard, path, defaultValue),
  set: (value) => store.updateCardField(path, value),
});

const name = useVModel('data.name');
const description = useVModel('data.description');
const personality = useVModel('data.personality');
const scenario = useVModel('data.scenario');
const first_mes = useVModel('data.first_mes');
const mes_example = useVModel('data.mes_example');
const alternate_greetings = useVModel('data.alternate_greetings', []);
const tags = computed({
  get: () => (get(store.characterCard, 'data.tags', []) || []).join(', '),
  set: (value) => store.updateCardField('data.tags', value.split(',').map(t => t.trim()).filter(Boolean))
});

const addGreeting = () => {
  const greetings = alternate_greetings.value || [];
  greetings.push('');
  store.updateCardField('data.alternate_greetings', greetings);
};

const removeGreeting = (index) => {
  const greetings = alternate_greetings.value || [];
  greetings.splice(index, 1);
  store.updateCardField('data.alternate_greetings', greetings);
};

// 视图切换方法
const switchView = (view) => {
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
.character-editor {
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
}  .greeting-actions { 
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
  
  .card-header {
    font-size: 1.1em;
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
  }    .translate-btn {
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
  .card-header {
    font-size: 1em;
  }
  
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
