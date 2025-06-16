import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage, ElNotification } from 'element-plus'
import { handleTranslationError, handleWebSocketError, handleNetworkError, handleApiError } from '../utils/errorHandler'

export const useTranslatorStore = defineStore('translator', () => {
  // 状态
  const taskId = ref(null)
  const translationParams = ref({
    model_name: '',
    base_url: '',
    api_key: ''
  })
  const translationProgress = ref(0)
  const translationStatus = ref('')
  const websocket = ref(null)
  const pingInterval = ref(null)
  const isClosingWebSocket = ref(false)  // 标记是否正在主动关闭WebSocket
  const progressMonitoringInterval = ref(null)  // 备用进度监控
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
    'personality': '性格设定',
    'mes_example': '对话示例',
    'system_prompt': '系统提示词',
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
    translationStatus.value = 'starting'  // 标记翻译正在启动
    translationProgress.value = 0
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
      
      // 启动翻译成功后立即连接WebSocket
      translationStatus.value = 'processing'  // 标记翻译正在进行
      translationProgress.value = 5  // 设置初始进度
      connectWebSocket()
      
      // 如果WebSocket已连接，立即启动心跳和进度监控
      if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
        startHeartbeat()
        startProgressMonitoring()
      }
      
      return true
    } catch (error) {
      console.error('Translation error:', error)
      
      let errorMessage = '启动翻译任务失败'
      
      if (error.response) {
        // 服务器响应错误
        const statusCode = error.response.status
        const serverMessage = error.response.data?.error || error.response.data?.message
        errorMessage = serverMessage || `服务器错误 (${statusCode})`
        
        handleApiError(errorMessage, statusCode, error)
      } else if (error.request) {
        // 网络错误
        errorMessage = '网络连接失败，请检查网络连接'
        handleNetworkError(errorMessage, error)
      } else {
        // 其他错误
        errorMessage = error.message || '未知错误'
        handleTranslationError(errorMessage, error)
      }
      
      handleTranslationError(errorMessage)
      return false
    }
  }

  // 处理翻译错误
  const handleTranslationError = (errorMessage) => {
    // 停止心跳和进度监控
    stopHeartbeat()
    stopProgressMonitoring()
    
    // 标记翻译失败
    isTranslationFailed.value = true
    translationStatus.value = 'exception'
    
    // 立即中断进度更新
    translationProgress.value = 0
    
    // 清空进行中的字段状态
    inProgressFields.value = []
    
    // 立即关闭WebSocket连接以阻止后续操作
    closeWebSocket()
    
    // 显示错误通知并提供操作指导
    ElNotification({
      title: '翻译失败',
      message: errorMessage + '\n\n请检查翻译参数后重试，或返回上一步重新设置',
      type: 'error',
      duration: 10000,
      dangerouslyUseHTMLString: false
    })
  }

  // 强制中断翻译任务
  const forceStopTranslation = () => {
    if (translationStatus.value === 'success' || isTranslationFailed.value) {
      return // 已完成或已失败，无需中断
    }
    
    // 停止心跳和进度监控
    stopHeartbeat()
    stopProgressMonitoring()
    
    // 标记为失败状态
    isTranslationFailed.value = true
    translationStatus.value = 'exception'
    
    // 重置进度和状态
    translationProgress.value = 0
    inProgressFields.value = []
    
    // 关闭连接
    closeWebSocket()
    
    ElMessage.warning('翻译任务已中断')
  }

  // 连接WebSocket获取实时翻译进度
  const connectWebSocket = () => {
    if (!taskId.value) return
    
    try {
      websocket.value = new WebSocket(wsUrl.value)
      
      websocket.value.onopen = () => {
        console.log('WebSocket connected')
        
        // 只有在翻译进行中时才启动心跳和进度监控
        if (translationStatus.value === 'processing' || translationStatus.value === 'starting') {
          startProgressMonitoring()
          startHeartbeat()
        }
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
          if (data.type === 'progress') {
            // 处理进度更新消息
            handleProgressUpdate(data)
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
      // 只有在翻译进行中时才处理错误
      if (translationStatus.value !== 'success' && !isTranslationFailed.value && translationProgress.value < 100) {
        handleTranslationError('WebSocket连接错误')
      } else {
        console.log('WebSocket error occurred after translation completion, ignoring')
      }
    }
    
    websocket.value.onclose = (event) => {
      console.log('WebSocket connection closed, code:', event.code, 'reason:', event.reason, 'wasClosing:', isClosingWebSocket.value)
      stopHeartbeat() // 连接关闭时停止心跳
        
        // 如果是主动关闭或者翻译已完成，不视为错误
        if (isClosingWebSocket.value || 
            translationStatus.value === 'success' || 
            translationProgress.value === 100) {
          console.log('WebSocket正常关闭')
          isClosingWebSocket.value = false
          return
        }
        
        // 只有在以下情况才认为是异常关闭：
        // 1. 翻译未成功完成
        // 2. 没有标记为失败
        // 3. 进度小于100%
        // 4. 关闭码不是正常关闭(1000)或服务器主动关闭(1001)
        const isAbnormalClose = translationStatus.value !== 'success' && 
                               !isTranslationFailed.value && 
                               translationProgress.value < 100 &&
                               event.code !== 1000 && 
                               event.code !== 1001
        
        if (isAbnormalClose) {
          handleTranslationError('WebSocket连接意外关闭')
        } else {
          console.log('WebSocket关闭，但翻译可能已完成或接近完成')
        }
      }
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      handleTranslationError('无法连接到WebSocket: ' + error.message)
    }
  }

  // 处理后端发送的进度更新
  const handleProgressUpdate = (progressData) => {
    const { current_field, field_status, completed_count, total_count, progress_percentage } = progressData
    
    console.log('收到进度更新:', progressData)
    
    if (field_status === 'starting') {
      // 字段开始翻译
      if (!inProgressFields.value.includes(current_field)) {
        inProgressFields.value.push(current_field)
        // 不在此处添加日志，因为后端已经发送了日志消息
      }
    } else if (field_status === 'completed') {
      // 字段翻译完成
      const inProgressIndex = inProgressFields.value.indexOf(current_field)
      if (inProgressIndex !== -1) {
        inProgressFields.value.splice(inProgressIndex, 1)
      }
      if (!completedFields.value.includes(current_field)) {
        completedFields.value.push(current_field)
        // 不在此处添加日志，因为后端已经发送了日志消息
      }
    } else if (field_status === 'skipped') {
      // 字段被跳过
      const inProgressIndex = inProgressFields.value.indexOf(current_field)
      if (inProgressIndex !== -1) {
        inProgressFields.value.splice(inProgressIndex, 1)
      }
      if (!completedFields.value.includes(current_field)) {
        completedFields.value.push(current_field)
        // 不在此处添加日志，因为后端已经发送了日志消息
      }
    }
    
    // 直接使用后端计算的进度
    translationProgress.value = progress_percentage
    
    console.log(`进度更新: ${completed_count}/${total_count} (${progress_percentage}%)`)
    console.log('已完成字段:', completedFields.value)
    console.log('进行中字段:', inProgressFields.value)
  }

  // 启动备用进度监控
  const startProgressMonitoring = () => {
    if (progressMonitoringInterval.value) {
      clearInterval(progressMonitoringInterval.value)
    }
    
    let lastProgressTime = Date.now()
    
    progressMonitoringInterval.value = setInterval(() => {
      const now = Date.now()
      const timeSinceLastProgress = now - lastProgressTime
      
      // 如果超过30秒没有进度更新，尝试估算进度
      if (timeSinceLastProgress > 30000 && translationStatus.value === 'processing') {
        console.log('长时间无进度更新，启用备用进度估算')
        
        // 简单的基于时间的进度估算
        const elapsedTime = (now - lastProgressTime) / 1000
        const estimatedProgress = Math.min(95, translationProgress.value + (elapsedTime / 10))
        
        if (estimatedProgress > translationProgress.value) {
          translationProgress.value = Math.round(estimatedProgress)
          console.log(`备用进度估算: ${translationProgress.value}%`)
        }
      }
      
      // 更新最后进度时间
      if (translationProgress.value > 0) {
        lastProgressTime = now
      }
    }, 10000) // 每10秒检查一次
  }

  // 启动心跳机制
  const startHeartbeat = () => {
    if (pingInterval.value) {
      clearInterval(pingInterval.value)
    }
    
    pingInterval.value = setInterval(() => {
      if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
        // 只在翻译进行中时发送心跳
        if (translationStatus.value === 'processing' || translationStatus.value === 'starting') {
          websocket.value.send('ping')
        }
      }
    }, 30000) // 每30秒发送一次心跳
  }

  // 停止心跳机制
  const stopHeartbeat = () => {
    if (pingInterval.value) {
      clearInterval(pingInterval.value)
      pingInterval.value = null
    }
  }

  // 停止进度监控
  const stopProgressMonitoring = () => {
    if (progressMonitoringInterval.value) {
      clearInterval(progressMonitoringInterval.value)
      progressMonitoringInterval.value = null
    }
  }

  // 处理翻译完成
  const handleTranslationComplete = () => {
    // 停止心跳和进度监控
    stopHeartbeat()
    stopProgressMonitoring()
    
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
        isClosingWebSocket.value = true  // 标记为主动关闭
        websocket.value.close()
        console.log('主动关闭WebSocket连接')
      } catch (e) {
        console.error('关闭WebSocket时出错:', e)
      } finally {
        websocket.value = null
        stopHeartbeat() // 确保停止心跳
      }
    }
  }

  // 重置翻译状态
  const resetTranslation = () => {
    // 停止心跳和进度监控
    stopHeartbeat()
    stopProgressMonitoring()
    
    // 关闭当前WebSocket连接
    closeWebSocket()
    
    // 重置所有状态
    taskId.value = null
    translationProgress.value = 0
    translationStatus.value = ''
    completedFields.value = []
    inProgressFields.value = []
    isTranslationFailed.value = false
    isClosingWebSocket.value = false
    downloadUrls.value = {
      json: '',
      image: ''
    }
  }

  // 检查是否可以继续操作（未失败且未成功的状态）
  const canContinueOperation = computed(() => {
    return !isTranslationFailed.value && translationStatus.value !== 'exception'
  })

  // 获取当前翻译状态的详细描述
  const getTranslationStatusDescription = computed(() => {
    if (isTranslationFailed.value || translationStatus.value === 'exception') {
      return {
        type: 'error',
        text: '翻译失败',
        canRetry: true,
        canDownload: false
      }
    }
    if (translationStatus.value === 'success') {
      return {
        type: 'success',
        text: '翻译完成',
        canRetry: false,
        canDownload: true
      }
    }
    if (translationProgress.value > 0) {
      return {
        type: 'processing',
        text: '翻译进行中',
        canRetry: false,
        canDownload: false
      }
    }
    return {
      type: 'waiting',
      text: '等待开始',
      canRetry: false,
      canDownload: false
    }
  })

  // 设置任务ID
  const setTaskId = (id) => {
    taskId.value = id
  }

  return {
    // 状态
    taskId,
    translationParams,
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
    canContinueOperation,
    getTranslationStatusDescription,
    
    // 方法
    startTranslation,
    handleTranslationError,
    forceStopTranslation,
    connectWebSocket,
    closeWebSocket,
    resetTranslation,
    downloadJson,
    downloadImage,
    setTaskId
  }
})
