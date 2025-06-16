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
      // 1. 首先建立WebSocket连接
      console.log('步骤1: 建立WebSocket连接')
      translationStatus.value = 'connecting'  // 连接状态
      
      // 等待WebSocket连接建立
      await connectWebSocket()
      console.log('WebSocket连接已建立')
      
      // 2. WebSocket连接成功后，启动翻译任务
      console.log('步骤2: 启动翻译任务')
      translationStatus.value = 'starting'
      
      const response = await axios.post('/translate', {
        task_id: taskId.value,
        model_name: params.model_name,
        base_url: params.base_url,
        api_key: params.api_key
      })
      
      console.log('Translation started:', response.data)
      
      // 3. 翻译任务启动成功，开始处理状态
      translationStatus.value = 'processing'
      translationProgress.value = 5  // 设置初始进度
      
      // 启动心跳机制
      startHeartbeat()
      
      return true
      
    } catch (error) {
      console.error('启动翻译失败:', error)
      
      // WebSocket连接失败时的处理
      if (error.message && error.message.includes('WebSocket')) {
        console.log('WebSocket连接失败，尝试无WebSocket模式')
        
        // 尝试直接启动翻译任务（无WebSocket模式）
        try {
          translationStatus.value = 'starting'
          
          const response = await axios.post('/translate', {
            task_id: taskId.value,
            model_name: params.model_name,
            base_url: params.base_url,
            api_key: params.api_key
          })
          
          console.log('Translation started (no WebSocket):', response.data)
          translationStatus.value = 'processing'
          translationProgress.value = 5
          
          // 启动备用进度监控
          console.log('启动备用进度监控')
          startProgressMonitoring()
          
          // 定期检查结果
          const checkInterval = setInterval(async () => {
            try {
              await checkTranslationResult()
              if (translationStatus.value === 'success' || translationStatus.value === 'failed') {
                clearInterval(checkInterval)
              }
            } catch (e) {
              console.error('检查结果失败:', e)
            }
          }, 10000) // 每10秒检查一次
          
          return true
        } catch (translateError) {
          console.error('翻译启动失败:', translateError)
          handleTranslationError('启动翻译失败: ' + translateError.message)
          return false
        }
      }
      
      // 其他错误的处理
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
    
    // 先尝试通过API取消任务
    if (taskId.value) {
      axios.post(`/cancel/${taskId.value}`).then(response => {
        console.log('任务取消请求已发送:', response.data)
      }).catch(error => {
        console.error('取消任务请求失败:', error)
      })
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
    
    ElMessage.warning('翻译任务已手动停止')
  }

  // 连接WebSocket获取实时翻译进度
  const connectWebSocket = () => {
    if (!taskId.value) return Promise.reject(new Error('没有任务ID'))
    
    return new Promise((resolve, reject) => {
      try {
        websocket.value = new WebSocket(wsUrl.value)
        
        websocket.value.onopen = () => {
          console.log('WebSocket connected')
          resolve() // 连接成功时resolve
          
          // 只有在翻译真正开始时才启动监控机制
          if (translationStatus.value === 'processing' && translationProgress.value > 0) {
            console.log('翻译进行中，启动心跳')
            startHeartbeat()
          } else if (translationStatus.value === 'starting' || translationStatus.value === 'connecting') {
            console.log('翻译启动中，准备启动心跳')
            // 连接建立后会在startTranslation中启动心跳
          } else {
            console.log('WebSocket已连接，等待翻译开始')
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
          console.log('收到WebSocket消息:', data)
          
          // 处理不同类型的消息
          if (data.type === 'connected') {
            console.log('WebSocket连接确认:', data.message)
          } else if (data.type === 'progress') {
            // 处理进度更新消息
            handleProgressUpdate(data)
          } else if (data.type === 'completed') {
            console.log('收到翻译完成消息')
            handleTranslationComplete()
          } else if (data.type === 'error') {
            console.error('收到错误消息:', data.message)
            handleTranslationError(data.message)
          } else if (data.type === 'cancelled') {
            console.log('收到任务取消消息')
            handleTranslationCancelled()
          } else if (data.type === 'heartbeat') {
            console.log('收到服务器心跳')
            // 响应服务器心跳
            if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
              websocket.value.send('pong')
            }
          } else {
            console.warn('未知的消息类型:', data.type)
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e)
          console.error('原始消息:', event.data)
          handleTranslationError('解析WebSocket消息时发生错误: ' + e.message)
        }
      }
    
        websocket.value.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error) // 连接错误时reject
          
          // 只有在翻译早期阶段且确实有问题时才处理错误
          if (translationStatus.value === 'starting' || translationStatus.value === 'connecting' ||
              (translationStatus.value === 'processing' && translationProgress.value < 10)) {
            console.log('WebSocket连接错误')
          } else {
            console.log('WebSocket连接错误，但翻译可能正在进行，继续等待')
          }
        }
        
        websocket.value.onclose = (event) => {
          console.log('WebSocket connection closed, code:', event.code, 'reason:', event.reason, 'wasClosing:', isClosingWebSocket.value)
          
          // 如果还在连接阶段就关闭了，说明连接失败
          if (translationStatus.value === 'connecting') {
            reject(new Error(`WebSocket连接失败，错误代码: ${event.code}`))
            return
          }
          
          stopHeartbeat() // 连接关闭时停止心跳
            
          // 如果是主动关闭或者翻译已完成，不视为错误
          if (isClosingWebSocket.value || 
              translationStatus.value === 'success' || 
              translationStatus.value === 'cancelled' ||
              translationProgress.value >= 100) {
            console.log('WebSocket正常关闭')
            isClosingWebSocket.value = false
            return
          }
          
          // 检查是否是异常关闭
          const isAbnormalClose = translationStatus.value === 'processing' && 
                                 !isTranslationFailed.value && 
                                 translationProgress.value < 50 && // 只有在前50%进度时才重连
                                 event.code === 1006 // 1006是异常关闭
          
          if (isAbnormalClose) {
            console.log('WebSocket异常关闭，尝试重新连接')
            // 尝试重新连接，但不要立即启动翻译
            setTimeout(() => {
              if (translationStatus.value === 'processing' && 
                  !isTranslationFailed.value && 
                  translationProgress.value < 50) {
                console.log('重新连接WebSocket（仅连接，不重新启动翻译）')
                connectWebSocket()
              }
            }, 2000) // 2秒后重试连接
          } else {
            console.log('WebSocket关闭，但不认为是错误')
            // 如果是在处理过程中断开但进度已经很高，启动结果检查
            if (translationStatus.value === 'processing' && translationProgress.value >= 50) {
              console.log('翻译接近完成，启动结果检查')
              setTimeout(checkTranslationResult, 3000)
            }
          }
        }
        
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        reject(error)
      }
    })
  }

  // 检查翻译结果（用于WebSocket断开时的备用检查）
  const checkTranslationResult = async () => {
    if (!taskId.value) return
    
    try {
      console.log('检查翻译结果状态')
      const response = await axios.get(`/status/${taskId.value}`)
      const taskStatus = response.data
      
      console.log('任务状态:', taskStatus)
      
      if (taskStatus.status === 'completed') {
        console.log('发现任务已完成，触发完成处理')
        // 更新下载链接
        downloadUrls.value = {
          json: `/download/json/${taskId.value}`,
          image: `/download/image/${taskId.value}`
        }
        handleTranslationComplete()
      } else if (taskStatus.status === 'failed') {
        console.log('发现任务失败')
        handleTranslationError(taskStatus.error || '翻译任务失败')
      } else if (taskStatus.status === 'cancelled') {
        console.log('发现任务已取消')
        handleTranslationCancelled()
      } else {
        console.log('任务仍在进行中，状态:', taskStatus.status)
        // 如果任务仍在进行，更新进度信息
        if (taskStatus.progress_percentage > translationProgress.value) {
          translationProgress.value = taskStatus.progress_percentage
        }
        // 继续检查
        if (taskStatus.status === 'processing') {
          setTimeout(checkTranslationResult, 5000)
        }
      }
    } catch (error) {
      console.error('检查翻译结果失败:', error)
      // 检查失败时给出提示
      ElNotification({
        title: '状态检查',
        message: '无法获取翻译状态，请手动刷新页面或重新开始',
        type: 'warning',
        duration: 5000
      })
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

  // 启动备用进度监控 - 只在真正需要时启用
  const startProgressMonitoring = () => {
    // 如果已经有WebSocket连接且工作正常，不需要备用监控
    if (websocket.value && websocket.value.readyState === WebSocket.OPEN) {
      console.log('WebSocket连接正常，跳过备用进度监控')
      return
    }
    
    if (progressMonitoringInterval.value) {
      clearInterval(progressMonitoringInterval.value)
    }
    
    let lastProgressTime = Date.now()
    let noProgressCount = 0 // 记录无进度更新的次数
    
    progressMonitoringInterval.value = setInterval(() => {
      // 检查翻译状态，只在翻译进行中时才继续监控
      if (translationStatus.value !== 'processing') {
        console.log('翻译状态已改变，停止备用进度监控')
        stopProgressMonitoring()
        return
      }
      
      const now = Date.now()
      const timeSinceLastProgress = now - lastProgressTime
      
      // 延长无进度检查时间到10分钟，给翻译更多时间
      if (timeSinceLastProgress > 600000) { // 10分钟
        noProgressCount++
        console.log(`长时间无进度更新 (${noProgressCount}次)，但继续等待...`)
        
        // 延长到连续6次无进度（60分钟）才认为异常
        if (noProgressCount > 6) {
          console.log('超长时间无进度更新，可能连接异常')
          // 改为警告而不是错误，让用户选择是否继续等待
          ElNotification({
            title: '进度提醒',
            message: '翻译进度长时间无更新，可能是复杂内容需要更多时间处理。如果确认有问题，请手动停止任务。',
            type: 'warning',
            duration: 8000
          })
          // 重置计数器，继续监控而不是直接报错
          noProgressCount = 0
          return
        }
        
        // 简单的基于时间的进度估算，但更保守
        const elapsedTime = (now - lastProgressTime) / 1000
        const estimatedProgress = Math.min(90, translationProgress.value + (elapsedTime / 60)) // 更保守的估算
        
        if (estimatedProgress > translationProgress.value) {
          translationProgress.value = Math.round(estimatedProgress)
          console.log(`备用进度估算: ${translationProgress.value}%`)
        }
      }
      
      // 更新最后进度时间
      if (translationProgress.value > 0) {
        lastProgressTime = now
        noProgressCount = 0 // 重置计数器
      }
    }, 60000) // 改为每60秒检查一次
  }

  // 启动心跳机制 - 只在翻译进行时发送
  const startHeartbeat = () => {
    if (pingInterval.value) {
      clearInterval(pingInterval.value)
    }
    
    console.log('启动WebSocket心跳机制')
    
    pingInterval.value = setInterval(() => {
      // 严格检查翻译状态和WebSocket状态
      if (!websocket.value || websocket.value.readyState !== WebSocket.OPEN) {
        console.log('WebSocket未连接，停止心跳')
        stopHeartbeat()
        return
      }
      
      // 只在翻译进行中时发送心跳
      if (translationStatus.value === 'processing' || translationStatus.value === 'starting') {
        try {
          console.log('发送WebSocket心跳包')
          websocket.value.send('ping')
        } catch (error) {
          console.error('发送心跳包失败:', error)
          stopHeartbeat()
        }
      } else {
        console.log(`翻译状态: ${translationStatus.value}, 停止心跳`)
        stopHeartbeat()
      }
    }, 30000) // 30秒间隔，与后端超时时间匹配
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

  // 处理翻译取消
  const handleTranslationCancelled = () => {
    // 停止心跳和进度监控
    stopHeartbeat()
    stopProgressMonitoring()
    
    translationStatus.value = 'cancelled'
    translationProgress.value = 0
    
    // 清空已完成字段
    completedFields.value = []
    inProgressFields.value = []
    
    // 显示取消通知
    ElNotification({
      title: '任务已取消',
      message: '翻译任务已被取消',
      type: 'warning',
      duration: 3000
    })
    
    // 关闭WebSocket连接
    closeWebSocket()
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
    setTaskId,
    checkTranslationResult
  }
})
