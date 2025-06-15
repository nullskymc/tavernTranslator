<template>
  <el-card class="fade-in">
    <template #header>
      <div class="step-title">
        <span class="step-number">3</span>
        <span class="step-text">翻译过程</span>
      </div>
    </template>
    
    <div style="margin:20px 0;font-weight:500;">
      <i class="fas fa-terminal" style="margin-right:8px;"></i>翻译日志:
    </div>
    
    <div class="log-container">{{ logs || '等待开始翻译...' }}</div>
    
    <!-- 进度条 -->
    <div v-if="translationProgress > 0" class="progress-section">
      <div class="progress-info">
        <span class="progress-text">翻译进度：{{ translationProgress }}%</span>
        <span class="progress-status" :class="statusClass">{{ statusText }}</span>
      </div>
      <el-progress 
        :percentage="translationProgress" 
        :status="translationStatus"
        :stroke-width="8"
        style="margin-top: 10px;"
      />
      
      <!-- 字段完成状态 -->
      <div v-if="completedFields.length > 0 || inProgressFields.length > 0" class="fields-status">
        <h4>翻译状态：</h4>
        <div class="field-tags">
          <el-tag 
            v-for="field in completedFields" 
            :key="field" 
            type="success" 
            size="small"
            style="margin-right: 8px; margin-bottom: 8px;"
          >
            <i class="fas fa-check" style="margin-right: 4px;"></i>{{ field }}
          </el-tag>
          <el-tag 
            v-for="field in inProgressFields" 
            :key="field" 
            type="warning" 
            size="small"
            style="margin-right: 8px; margin-bottom: 8px;"
          >
            <i class="fas fa-spinner fa-spin" style="margin-right: 4px;"></i>{{ field }}
          </el-tag>
        </div>
      </div>
    </div>
    
    <el-alert
      title="翻译过程中请勿关闭或刷新页面，否则可能导致任务失败"
      type="warning"
      :closable="false"
      show-icon>
    </el-alert>
  </el-card>
</template>

<script setup>
import { computed, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTranslatorStore } from '../stores/translator'
import { useUIStore } from '../stores/ui'

const translatorStore = useTranslatorStore()
const uiStore = useUIStore()

const { 
  logs, 
  translationProgress, 
  translationStatus, 
  completedFields, 
  inProgressFields,
  isTranslationFailed 
} = storeToRefs(translatorStore)

// 计算属性
const statusClass = computed(() => {
  if (isTranslationFailed.value) return 'status-error'
  if (translationStatus.value === 'success') return 'status-success'
  if (translationProgress.value > 0) return 'status-processing'
  return 'status-waiting'
})

const statusText = computed(() => {
  if (isTranslationFailed.value) return '翻译失败'
  if (translationStatus.value === 'success') return '翻译完成'
  if (translationProgress.value > 0) return '翻译中...'
  return '等待开始'
})

// 监听翻译完成，自动跳转到下载页面
watch(() => translationStatus.value, (newStatus) => {
  if (newStatus === 'success') {
    uiStore.nextStep() // 跳转到下载结果页面
  }
})

// 监听日志变化，自动滚动到底部
watch(() => logs.value, () => {
  nextTick(() => {
    const logContainer = document.querySelector('.log-container')
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight
    }
  })
})
</script>

<style scoped>
.step-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.step-number {
  width: 30px;
  height: 30px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 14px;
  font-weight: bold;
}

.step-text {
  color: var(--text-primary);
}

.log-container {
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  margin-bottom: 20px;
}

.progress-section {
  margin: 20px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-text {
  font-weight: 600;
  color: var(--text-primary);
}

.progress-status {
  font-size: 14px;
  font-weight: 500;
}

.status-waiting {
  color: var(--text-secondary);
}

.status-processing {
  color: var(--warning-color);
}

.status-success {
  color: var(--success-color);
}

.status-error {
  color: var(--error-color);
}

.fields-status {
  margin-top: 20px;
}

.fields-status h4 {
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 16px;
}

.field-tags {
  display: flex;
  flex-wrap: wrap;
}

/* 自定义滚动条 */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: var(--background-color);
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
