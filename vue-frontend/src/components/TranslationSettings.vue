<template>
  <el-card class="fade-in">
    <template #header>
      <div class="step-title">
        <span class="step-number">2</span>
        <span class="step-text">设置翻译参数</span>
      </div>
    </template>
    
    <el-form ref="translationFormRef" :model="formData" label-width="120px">
      <el-form-item label="模型名称" required>
        <el-input 
          v-model="formData.model_name" 
          placeholder="输入模型名称，例如gemini-2.0-flash" 
          autocomplete="on" 
          name="model-name"
        >
          <template #prepend>
            <i class="fas fa-robot"></i>
          </template>
        </el-input>
        <div v-if="savedModels.length > 0" class="history-suggestions">
          <el-tag 
            v-for="model in savedModels" 
            :key="model" 
            size="small" 
            @click="selectModel(model)" 
            style="margin-right:5px;margin-top:5px;cursor:pointer" 
            effect="plain"
          >
            <i class="fas fa-history" style="margin-right:4px;"></i>{{model}}
          </el-tag>
        </div>
      </el-form-item>
      
      <el-form-item label="API地址" required>
        <el-input 
          v-model="formData.base_url" 
          placeholder="输入API基础URL，例如: https://api.example.com/v1" 
          autocomplete="on" 
          name="api-url"
        >
          <template #prepend>
            <i class="fas fa-link"></i>
          </template>
        </el-input>
        <div class="el-form-item__description" style="font-size: 13px; color: #909399; margin-top: 8px;">
          本工具仅支持兼容 OpenAI API 格式的服务
        </div>
        <div class="el-form-item__description" style="font-size: 13px; color: #909399; margin-top: 8px;">
          示例：
          <ul style="margin-top: 8px; padding-left: 20px;">
            <li>OpenAI: https://api.openai.com/v1</li>
            <li>Claude API (via OpenAI 兼容): https://api.anthropic.com/v1</li>
            <li>自建兼容服务: http://localhost:1234/v1</li>
            <li>在使用中出现问题请检查API地址是否正确,地址到v1结尾，模型名称是否正确，欢迎在github提交issue或加群1043662159反馈</li>
          </ul>
        </div>
        <div v-if="savedUrls.length > 0" class="history-suggestions"> 
          <el-tag 
            v-for="url in savedUrls" 
            :key="url" 
            size="small" 
            @click="selectUrl(url)" 
            style="margin-right:5px;margin-top:5px;cursor:pointer" 
            effect="plain"
          >
            <i class="fas fa-history" style="margin-right:4px;"></i>{{url}}
          </el-tag>
        </div>
      </el-form-item>
      
      <el-form-item label="API密钥" required>
        <el-input 
          v-model="formData.api_key" 
          placeholder="输入API密钥" 
          show-password 
          autocomplete="off" 
          name="api-key"
        >
          <template #prepend>
            <i class="fas fa-key"></i>
          </template>
        </el-input>
      </el-form-item>
      
      <el-form-item>
        <!-- 翻译失败提示 -->
        <el-alert
          v-if="isTranslationFailed"
          title="上次翻译失败"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 15px;"
        >
          <template #default>
            <p>检测到上次翻译任务失败，请检查并调整以下参数后重试：</p>
            <ul style="margin-top: 8px; padding-left: 20px;">
              <li>确认模型名称是否正确</li>
              <li>确认API地址是否可用</li>
              <li>确认API密钥是否有效</li>
              <li>检查网络连接是否正常</li>
            </ul>
          </template>
        </el-alert>
        
        <div class="action-buttons">
          <el-button 
            type="primary" 
            @click="handleStartTranslation"
            :loading="isStartingTranslation"
            :disabled="!canStartTranslation"
          >
            <el-icon v-if="!isStartingTranslation"><Check /></el-icon>
            {{ isStartingTranslation ? '启动中...' : (isTranslationFailed ? '重新开始翻译' : '开始翻译') }}
          </el-button>
          <el-button @click="goBackToUpload">
            <el-icon><Back /></el-icon>
            返回上传
          </el-button>
          <el-button type="text" @click="clearHistory" style="margin-left:10px">
            <i class="fas fa-trash-alt" style="margin-right:4px;"></i>清除历史记录
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { reactive, onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Check, Back } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUIStore } from '../stores/ui'
import { useStorageStore } from '../stores/storage'
import { useTranslatorStore } from '../stores/translator'

const uiStore = useUIStore()
const storageStore = useStorageStore()
const translatorStore = useTranslatorStore()

const { savedModels, savedUrls } = storeToRefs(storageStore)
const { isTranslationFailed } = storeToRefs(translatorStore)

// 表单数据
const formData = reactive({
  model_name: '',
  base_url: '',
  api_key: ''
})

// 控制状态
const isStartingTranslation = ref(false)

// 计算属性
const canStartTranslation = computed(() => {
  return formData.model_name.trim() && 
         formData.base_url.trim() && 
         formData.api_key.trim() && 
         !isStartingTranslation.value
})

// 组件挂载时加载历史记录
onMounted(() => {
  formData.model_name = storageStore.getLastUsedModel()
  formData.base_url = storageStore.getLastUsedUrl()
  formData.api_key = storageStore.getSavedApiKey()
  
  // 如果是翻译失败后回到此页面，清除失败状态
  if (isTranslationFailed.value) {
    ElMessage.info('请调整翻译参数后重新尝试')
  }
})

// 选择历史记录中的模型名称
const selectModel = (model) => {
  formData.model_name = model
}

// 选择历史记录中的API URL
const selectUrl = (url) => {
  formData.base_url = url
}

// 开始翻译
const handleStartTranslation = async () => {
  if (!canStartTranslation.value) {
    ElMessage.warning('请填写完整的翻译参数')
    return
  }
  
  isStartingTranslation.value = true
  
  try {
    // 保存当前参数到历史记录
    storageStore.saveHistoryToStorage(formData.model_name, formData.base_url, formData.api_key)
    
    // 如果之前翻译失败，先重置状态
    if (isTranslationFailed.value) {
      translatorStore.resetTranslation()
    }
    
    // 开始翻译
    const success = await translatorStore.startTranslation(formData)
    
    if (success) {
      uiStore.nextStep() // 进入翻译过程步骤
    } else {
      ElMessage.error('启动翻译失败，请检查参数后重试')
    }
  } catch (error) {
    console.error('启动翻译时发生错误:', error)
    ElMessage.error('启动翻译时发生错误，请重试')
  } finally {
    isStartingTranslation.value = false
  }
}

// 返回上传步骤
const goBackToUpload = () => {
  uiStore.goToStep(0)
}

// 清除历史记录
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确定要清除所有历史记录吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    storageStore.clearHistory()
    ElMessage.success('历史记录已清除')
  } catch {
    // 用户取消
  }
}
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

.history-suggestions {
  margin-top: 8px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.el-form-item__label) {
  color: var(--text-primary);
}

:deep(.el-input__inner) {
  background-color: var(--background-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

:deep(.el-input__inner:focus) {
  border-color: var(--primary-color);
}

:deep(.el-input-group__prepend) {
  background-color: var(--background-secondary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}
</style>
