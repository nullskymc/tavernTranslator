import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage, ElNotification } from 'element-plus'

export const useTranslatorStore = defineStore('translator', () => {
  // 状态
  const taskId = ref(null)
  const translationParams = ref({
    model_name: '',
    base_url: '',
    api_key: ''
  })
  const logs = ref('')
  const translationProgress = ref(0)
  const translationStatus = ref('')
  const websocket = ref(null)
  const pingInterval = ref(null)
  const downloadUrls = ref({
    json: '',
    image: ''
  })
  const isTranslationFailed = ref(false)

  // 字段相关
  const fields = [
    'first_mes', 
    'alternate_greetings', 
    'description', 
    'personality', 
    'mes_example', 
    'system_prompt', 
    'scenario'
  ]

  const fieldNameMap = {
    'first_mes': '对话内容',
    'alternate_greetings': '可选问候语',
    'description': '角色描述',
    'personality': '角色性格',
    'mes_example': '对话示例',
    'system_prompt': '系统提示',
    'scenario': '场景描述'
  }

  const completedFields = ref([])
  const inProgressFields = ref([])

  // 计算属性
  const wsUrl = computed(() => {
    if (!taskId.value) return ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/${taskId.value}`
  })

  // 方法
  const startTranslation = async (params) => {
    if (!params.model_name || !params.base_url) {
      ElMessage.warning('请填写必要的翻译参数')
      return false
    }
    
    // 更新翻译参数
    translationParams.value = { ...params }
    
    // 重置状态
    translationStatus.value = ''
    translationProgress.value = 0
    logs.value = ''
    completedFields.value = []
    inProgressFields.value = []
    isTranslationFailed.value = false
    
    try {
      // 向后端发送翻译请求
      const response = await axios.post('/translate', {
        task_id: taskId.value,
        model_name: params.model_name,
        base_url: params.base_url,
        api_key: params.api_key
      })
      
      console.log('Translation started:', response.data)
      return true
    } catch (error) {
      console.error('Translation error:', error)
      handleTranslationError('启动翻译任务失败: ' + (error.response?.data?.error || error.message))
      return false
    }
  }

  // 处理翻译错误
  const handleTranslationError = (errorMessage) => {
    // 标记翻译失败
    isTranslationFailed.value = true
    translationStatus.value = 'exception'
    
    // 添加到日志
    logs.value += '错误: ' + errorMessage + '\n'
    
    // 显示错误通知
    ElNotification({
      title: '翻译失败',
      message: errorMessage,
      type: 'error',
      duration: 8000
    })
  }

  // 连接WebSocket获取实时翻译进度
  const connectWebSocket = () => {
    if (!taskId.value) return
    
    try {
      websocket.value = new WebSocket(wsUrl.value)
      
      websocket.value.onopen = () => {
        console.log('WebSocket connected')
        // 设置定时ping以保持连接
        pingInterval.value = setInterval(() => {
          if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
            websocket.value.send('ping')
          }
        }, 30000)
      }
      
      websocket.value.onmessage = (event) => {
        try {
          // 检查是否是简单的pong响应
          if (event.data === 'pong') {
            console.log('收到pong响应')
            return
          }
          
          const data = JSON.parse(event.data)
          
          // 处理不同类型的消息
          if (data.type === 'log') {
            logs.value += data.message + '\n'
            
            // 检查日志消息是否包含ERROR
            if (data.message.toLowerCase().includes('error') || data.message.toLowerCase().includes('错误')) {
              handleTranslationError(data.message)
              return
            }
            
            // 处理翻译进度
            handleTranslationProgress(data.message)
            
          } else if (data.type === 'completed') {
            handleTranslationComplete()
          } else if (data.type === 'error') {
            handleTranslationError(data.message)
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e)
          handleTranslationError('解析WebSocket消息时发生错误: ' + e.message)
        }
      }
      
      websocket.value.onerror = (error) => {
        console.error('WebSocket error:', error)
        handleTranslationError('WebSocket连接错误')
      }
      
      websocket.value.onclose = () => {
        console.log('WebSocket connection closed')
        clearInterval(pingInterval.value)
        
        // 如果连接意外关闭且任务未完成，显示错误
        if (translationStatus.value !== 'success' && !isTranslationFailed.value && translationProgress.value < 100) {
          handleTranslationError('WebSocket连接意外关闭')
        }
      }
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      handleTranslationError('无法连接到WebSocket: ' + error.message)
    }
  }

  // 处理翻译进度消息
  const handleTranslationProgress = (message) => {
    // 1. 检测HTTP请求完成消息
    if (message.includes('HTTP Request:') && message.includes('HTTP/1.1 200 OK')) {
      if (inProgressFields.value.length > 0) {
        const fieldToComplete = inProgressFields.value[inProgressFields.value.length - 1]
        markFieldAsCompleted(fieldToComplete)
      }
    } 
    // 2. 检测开始翻译消息
    else if (message.match(/开始翻译(.*?)\.\.\.$/)) {
      const match = message.match(/开始翻译(.*?)\.\.\.$/)
      if (match && match[1]) {
        const fieldName = match[1].trim()
        if (!inProgressFields.value.includes(fieldName)) {
          inProgressFields.value.push(fieldName)
          updateTranslationProgress()
        }
      }
    } 
    // 3. 检测字段为空或跳过消息
    else if (message.includes('跳过翻译')) {
      const match = message.match(/字段 (.*?) 不存在或为空，跳过翻译/)
      if (match && match[1]) {
        const fieldName = match[1].trim()
        markFieldAsCompleted(getDisplayNameForField(fieldName))
      } else if (message.includes('可选问候语') && message.includes('跳过翻译')) {
        markFieldAsCompleted('可选问候语')
      }
    }
    // 4. 检测翻译完成消息
    else if (message.includes('翻译完成')) {
      for (const field in fieldNameMap) {
        const displayName = fieldNameMap[field]
        if (message.includes(displayName) && message.includes('翻译完成')) {
          markFieldAsCompleted(displayName)
        }
      }
    }
  }

  // 处理翻译完成
  const handleTranslationComplete = () => {
    logs.value += '翻译任务完成！\n'
    
    // 确保所有字段都被标记为完成
    for (const field of fields) {
      const displayName = fieldNameMap[field]
      if (!completedFields.value.includes(displayName)) {
        completedFields.value.push(displayName)
      }
    }
    
    translationProgress.value = 100
    translationStatus.value = 'success'
    
    // 保存下载链接
    downloadUrls.value = {
      json: `/download/json/${taskId.value}`,
      image: `/download/image/${taskId.value}`
    }
    
    // 显示成功通知
    ElNotification({
      title: '翻译成功',
      message: '角色卡翻译完成，请下载结果文件',
      type: 'success',
      duration: 5000
    })
    
    // 翻译完成后立即关闭WebSocket连接
    closeWebSocket()
  }

  // 将字段标记为已完成并更新进度
  const markFieldAsCompleted = (fieldName) => {
    if (fieldName && !completedFields.value.includes(fieldName)) {
      console.log(`标记字段为已完成: ${fieldName}`)
      completedFields.value.push(fieldName)
      updateTranslationProgress()
    }
  }

  // 获取字段显示名称
  const getDisplayNameForField = (fieldName) => {
    return fieldNameMap[fieldName] || fieldName
  }

  // 更新翻译进度
  const updateTranslationProgress = () => {
    const totalFields = fields.length
    let completedCount = 0
    let inProgressCount = 0
    
    // 计算已完成的字段数量
    for (const field of fields) {
      const displayName = fieldNameMap[field]
      if (completedFields.value.includes(displayName)) {
        completedCount++
      } else if (inProgressFields.value.includes(displayName)) {
        inProgressCount++
      }
    }
    
    // 用更平滑的方式计算进度
    const completedWeight = completedCount * (85 / totalFields)
    
    let inProgressWeight = 0
    if (inProgressCount > 0 && completedCount < totalFields) {
      const baseProgress = completedWeight
      const progressIncrement = Math.min(14, Math.log10(baseProgress + 10) * 20)
      inProgressWeight = progressIncrement
    }
    
    let progress = completedWeight + inProgressWeight
    
    if (completedCount === totalFields) {
      progress = 100
    } else {
      progress = Math.min(99, progress)
    }
    
    console.log(`进度更新: 总字段=${totalFields}, 已完成=${completedCount}(${completedWeight.toFixed(1)}%), 进行中=${inProgressCount}(+${inProgressWeight.toFixed(1)}%), 总进度=${progress.toFixed(1)}%`)
    
    translationProgress.value = Math.round(progress)
  }

  // 下载文件
  const downloadJson = () => {
    if (downloadUrls.value.json) {
      window.open(downloadUrls.value.json, '_blank')
    } else {
      ElMessage.error('JSON文件不可用')
    }
  }

  const downloadImage = () => {
    if (downloadUrls.value.image) {
      window.open(downloadUrls.value.image, '_blank')
    } else {
      ElMessage.error('图片文件不可用')
    }
  }

  // 关闭WebSocket连接
  const closeWebSocket = () => {
    if (websocket.value && websocket.value.readyState !== WebSocket.CLOSED) {
      try {
        websocket.value.close()
        console.log('WebSocket连接已关闭')
      } catch (e) {
        console.error('关闭WebSocket时出错:', e)
      } finally {
        websocket.value = null
        clearInterval(pingInterval.value)
      }
    }
  }

  // 重置翻译状态
  const resetTranslation = () => {
    // 关闭当前WebSocket连接
    closeWebSocket()
    
    // 重置所有状态
    taskId.value = null
    logs.value = ''
    translationProgress.value = 0
    translationStatus.value = ''
    completedFields.value = []
    inProgressFields.value = []
    isTranslationFailed.value = false
    downloadUrls.value = {
      json: '',
      image: ''
    }
  }

  // 设置任务ID
  const setTaskId = (id) => {
    taskId.value = id
  }

  return {
    // 状态
    taskId,
    translationParams,
    logs,
    translationProgress,
    translationStatus,
    downloadUrls,
    isTranslationFailed,
    completedFields,
    inProgressFields,
    fields,
    fieldNameMap,
    
    // 计算属性
    wsUrl,
    
    // 方法
    startTranslation,
    handleTranslationError,
    connectWebSocket,
    closeWebSocket,
    resetTranslation,
    downloadJson,
    downloadImage,
    setTaskId
  }
})
