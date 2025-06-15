<template>
  <div class="error-recovery" v-if="showRecovery">
    <el-dialog
      v-model="dialogVisible"
      title="操作失败"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="error-content">
        <el-icon class="error-icon" size="48px" color="#F56C6C">
          <WarningFilled />
        </el-icon>
        
        <h3>{{ errorTitle }}</h3>
        <p class="error-message">{{ errorMessage }}</p>
        
        <div class="suggestions">
          <h4>建议操作：</h4>
          <ul>
            <li v-for="suggestion in suggestions" :key="suggestion">{{ suggestion }}</li>
          </ul>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleRetry" v-if="canRetry">
            <i class="fas fa-redo" style="margin-right: 4px;"></i>
            重试
          </el-button>
          <el-button @click="handleBackToSettings" v-if="canBackToSettings">
            <i class="fas fa-cog" style="margin-right: 4px;"></i>
            调整参数
          </el-button>
          <el-button @click="handleRestart">
            <i class="fas fa-home" style="margin-right: 4px;"></i>
            重新开始
          </el-button>
          <el-button type="text" @click="handleDismiss">
            <i class="fas fa-times" style="margin-right: 4px;"></i>
            我知道了
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { WarningFilled } from '@element-plus/icons-vue'
import { useTranslatorStore } from '../stores/translator'
import { useUIStore } from '../stores/ui'

const translatorStore = useTranslatorStore()
const uiStore = useUIStore()

const { isTranslationFailed, getTranslationStatusDescription } = storeToRefs(translatorStore)

const dialogVisible = ref(false)
const errorDismissed = ref(false)

// 计算属性
const showRecovery = computed(() => {
  return isTranslationFailed.value && !errorDismissed.value
})

const errorTitle = computed(() => {
  return '翻译任务失败'
})

const errorMessage = computed(() => {
  return '翻译过程中出现错误，任务已自动中断。这可能是由于网络问题、API 配置错误或服务器异常导致的。'
})

const suggestions = computed(() => {
  return [
    '检查网络连接是否正常',
    '确认API密钥是否有效且有足够额度',
    '验证模型名称和API地址是否正确',
    '稍后重试，可能是临时的服务器问题',
    '如果问题持续，请尝试更换API服务提供商'
  ]
})

const canRetry = computed(() => {
  return getTranslationStatusDescription.value?.canRetry || false
})

const canBackToSettings = computed(() => {
  return true
})

// 监听翻译失败状态
watch(() => isTranslationFailed.value, (isFailed) => {
  if (isFailed && !errorDismissed.value) {
    dialogVisible.value = true
  }
})

// 监听翻译状态重置
watch(() => translatorStore.translationStatus, (status) => {
  if (status === '' || status === 'success') {
    errorDismissed.value = false
    dialogVisible.value = false
  }
})

// 处理方法
const handleRetry = () => {
  // 重置状态并保持在翻译设置页面
  translatorStore.resetTranslation()
  uiStore.goToStep(1)
  dialogVisible.value = false
  errorDismissed.value = true
}

const handleBackToSettings = () => {
  // 回到设置页面
  uiStore.goToStep(1)
  dialogVisible.value = false
  errorDismissed.value = true
}

const handleRestart = () => {
  // 完全重新开始
  translatorStore.resetTranslation()
  uiStore.resetSteps()
  dialogVisible.value = false
  errorDismissed.value = true
}

const handleDismiss = () => {
  // 关闭对话框但保持失败状态
  dialogVisible.value = false
  errorDismissed.value = true
}
</script>

<style scoped>
.error-recovery {
  position: relative;
}

.error-content {
  text-align: center;
  padding: 20px 0;
}

.error-icon {
  margin-bottom: 16px;
}

.error-content h3 {
  color: var(--text-primary);
  margin: 16px 0;
  font-size: 20px;
  font-weight: 600;
}

.error-message {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}

.suggestions {
  text-align: left;
  background: var(--background-secondary);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.suggestions h4 {
  color: var(--text-primary);
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.suggestions ul {
  margin: 0;
  padding-left: 20px;
  color: var(--text-secondary);
}

.suggestions li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.dialog-footer {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

:deep(.el-dialog__header) {
  padding: 20px 20px 10px;
  border-bottom: 1px solid var(--border-color);
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 15px 20px 20px;
  border-top: 1px solid var(--border-color);
}
</style>
