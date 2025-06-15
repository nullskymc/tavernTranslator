<template>
  <el-card class="fade-in">
    <template #header>
      <div class="step-title">
        <span class="step-number">3</span>
        <span class="step-text">翻译过程</span>
      </div>
    </template>
    
    <div style="margin:20px 0;font-weight:500;">
      <i class="fas fa-cogs" style="margin-right:8px;"></i>翻译进度:
    </div>
    
    <!-- 进度条 -->
    <div v-if="translationStatus || translationProgress > 0 || isTranslationFailed" class="progress-section">
      <div class="progress-info">
        <span class="progress-text">翻译进度：{{ translationProgress }}%</span>
        <span class="progress-status" :class="statusClass">{{ statusText }}</span>
      </div>
      <el-progress 
        :percentage="translationProgress" 
        :status="progressStatus"
        :stroke-width="8"
        style="margin-top: 10px;"
      />
      
      <!-- 错误状态操作按钮 -->
      <div v-if="isTranslationFailed" class="error-actions">
        <el-alert
          title="翻译任务失败"
          type="error"
          :closable="false"
          show-icon
          style="margin: 15px 0;"
        >
          <template #default>
            <p>翻译过程中出现错误，任务已自动中断。</p>
            <p>请检查翻译参数是否正确，或稍后重试。</p>
          </template>
        </el-alert>
        
        <div class="action-buttons">
          <el-button type="primary" @click="handleRetryTranslation">
            <i class="fas fa-redo" style="margin-right: 4px;"></i>
            重新翻译
          </el-button>
          <el-button @click="handleBackToSettings">
            <i class="fas fa-cog" style="margin-right: 4px;"></i>
            重新设置参数
          </el-button>
          <el-button @click="handleBackToUpload">
            <i class="fas fa-upload" style="margin-right: 4px;"></i>
            重新上传文件
          </el-button>
        </div>
      </div>
      
      <!-- 翻译进行中的控制按钮 -->
      <div v-else-if="translationProgress > 0 && translationProgress < 100" class="processing-actions">
        <el-button type="danger" size="small" @click="handleStopTranslation">
          <i class="fas fa-stop" style="margin-right: 4px;"></i>
          中断翻译
        </el-button>
      </div>
      
      <!-- 字段完成状态 -->
      <div v-if="translationStatus === 'processing' || completedFields.length > 0 || inProgressFields.length > 0" class="fields-status">
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
      show-icon
      v-if="!isTranslationFailed">
    </el-alert>
  </el-card>
</template>

<script setup>
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessageBox } from 'element-plus'
import { useTranslatorStore } from '../stores/translator'
import { useUIStore } from '../stores/ui'

const translatorStore = useTranslatorStore()
const uiStore = useUIStore()

const { 
  translationProgress, 
  translationStatus, 
  completedFields, 
  inProgressFields,
  isTranslationFailed,
  canContinueOperation,
  getTranslationStatusDescription
} = storeToRefs(translatorStore)

// 计算属性
const statusClass = computed(() => {
  if (isTranslationFailed.value) return 'status-error'
  if (translationStatus.value === 'success') return 'status-success'
  if (translationStatus.value === 'processing' || translationProgress.value > 0) return 'status-processing'
  if (translationStatus.value === 'starting') return 'status-starting'
  return 'status-waiting'
})

const statusText = computed(() => {
  if (isTranslationFailed.value) return '翻译失败'
  if (translationStatus.value === 'success') return '翻译完成'
  if (translationStatus.value === 'processing' || translationProgress.value > 0) return '翻译中...'
  if (translationStatus.value === 'starting') return '正在启动翻译...'
  return '等待开始'
})

const progressStatus = computed(() => {
  if (isTranslationFailed.value) return 'exception'
  return translationStatus.value
})

// 错误处理方法
const handleRetryTranslation = () => {
  // 重置翻译状态，保持在当前步骤重新开始
  translatorStore.resetTranslation()
  // 回到设置步骤，让用户可以调整参数
  uiStore.goToStep(1)
}

const handleBackToSettings = () => {
  // 回到设置参数步骤
  uiStore.goToStep(1)
}

const handleBackToUpload = () => {
  // 重置翻译状态并回到上传步骤
  translatorStore.resetTranslation()
  uiStore.goToStep(0)
}

const handleStopTranslation = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要中断当前翻译任务吗？中断后需要重新开始翻译。',
      '确认中断',
      {
        confirmButtonText: '确定中断',
        cancelButtonText: '继续翻译',
        type: 'warning'
      }
    )
    
    // 强制停止翻译
    translatorStore.forceStopTranslation()
  } catch {
    // 用户取消，继续翻译
  }
}

// 监听翻译完成，自动跳转到下载页面
watch(() => translationStatus.value, (newStatus) => {
  if (newStatus === 'success') {
    uiStore.nextStep() // 跳转到下载结果页面
  }
})

// 监听字段状态变化
watch(() => completedFields.value, (newFields) => {
  console.log('已完成字段:', newFields)
}, { deep: true })

// 监听翻译失败，确保状态同步
watch(() => isTranslationFailed.value, (isFailed) => {
  if (isFailed) {
    console.log('翻译失败，任务已中断')
  }
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

.status-starting {
  color: var(--primary-color);
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

.error-actions {
  margin-top: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 15px;
}

.processing-actions {
  margin-top: 15px;
  text-align: center;
}
</style>
