import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStorageStore = defineStore('storage', () => {
  // 状态
  const savedModels = ref([])
  const savedUrls = ref([])
  const savedApiKeys = ref([])

  // 加载历史记录
  const loadHistoryFromStorage = () => {
    try {
      // 加载模型名称历史记录
      const modelsData = localStorage.getItem('tavern_translator_models')
      if (modelsData) {
        savedModels.value = JSON.parse(modelsData)
      }
      
      // 加载API URL历史记录
      const urlsData = localStorage.getItem('tavern_translator_urls')
      if (urlsData) {
        savedUrls.value = JSON.parse(urlsData)
      }
    } catch (e) {
      console.error('加载历史记录失败:', e)
    }
  }

  // 保存历史记录到localStorage
  const saveHistoryToStorage = (model, url, apiKey) => {
    try {
      const currentModel = model?.trim()
      const currentUrl = url?.trim()
      const currentApiKey = apiKey?.trim()
      
      // 只保存非空值
      if (currentModel) {
        // 将当前值移到列表最前面（如果已存在则先移除）
        savedModels.value = savedModels.value.filter(m => m !== currentModel)
        savedModels.value.unshift(currentModel)
        // 限制历史记录数量为5个
        savedModels.value = savedModels.value.slice(0, 5)
        localStorage.setItem('tavern_translator_models', JSON.stringify(savedModels.value))
      }
      
      if (currentUrl) {
        // 将当前值移到列表最前面（如果已存在则先移除）
        savedUrls.value = savedUrls.value.filter(u => u !== currentUrl)
        savedUrls.value.unshift(currentUrl)
        // 限制历史记录数量为5个
        savedUrls.value = savedUrls.value.slice(0, 5)
        localStorage.setItem('tavern_translator_urls', JSON.stringify(savedUrls.value))
      }
      
      if (currentApiKey) {
        // 只保存最后一个API密钥
        localStorage.setItem('tavern_translator_api_key', currentApiKey)
      }
    } catch (e) {
      console.error('保存历史记录失败:', e)
    }
  }

  // 清除历史记录
  const clearHistory = () => {
    localStorage.removeItem('tavern_translator_models')
    localStorage.removeItem('tavern_translator_urls')
    localStorage.removeItem('tavern_translator_api_key')
    savedModels.value = []
    savedUrls.value = []
  }

  // 获取保存的API密钥
  const getSavedApiKey = () => {
    return localStorage.getItem('tavern_translator_api_key') || ''
  }

  // 获取最近使用的模型名称
  const getLastUsedModel = () => {
    return savedModels.value.length > 0 ? savedModels.value[0] : ''
  }

  // 获取最近使用的URL
  const getLastUsedUrl = () => {
    return savedUrls.value.length > 0 ? savedUrls.value[0] : ''
  }

  return {
    // 状态
    savedModels,
    savedUrls,
    savedApiKeys,
    
    // 方法
    loadHistoryFromStorage,
    saveHistoryToStorage,
    clearHistory,
    getSavedApiKey,
    getLastUsedModel,
    getLastUsedUrl
  }
})
