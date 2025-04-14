/**
 * 翻译模块 - 处理所有翻译相关逻辑
 */

const TranslatorModule = {
  data() {
    return {
      taskId: null,
      translationParams: {
        model_name: '',
        base_url: '',
        api_key: ''
      },
      logs: '',
      translationProgress: 0,
      translationStatus: '',
      websocket: null,
      pingInterval: null,
      downloadUrls: {
        json: '',
        image: ''
      },
      fields: [
        'first_mes', 
        'alternate_greetings', 
        'description', 
        'personality', 
        'mes_example', 
        'system_prompt', 
        'scenario'
      ],
      completedFields: [],
      inProgressFields: [],
      fieldNameMap: {
        'first_mes': '对话内容',
        'alternate_greetings': '可选问候语',
        'description': '角色描述',
        'personality': '角色性格',
        'mes_example': '对话示例',
        'system_prompt': '系统提示',
        'scenario': '场景描述'
      }
    };
  },
  
  computed: {
    // 计算WebSocket URL
    wsUrl() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/${this.taskId}`;
    }
  },
  
  methods: {
    // 开始翻译过程
    startTranslation() {
      if (!this.translationParams.model_name || !this.translationParams.base_url) {
        this.$message.warning('请填写必要的翻译参数');
        return;
      }
      
      // 保存当前参数到历史记录
      this.saveHistoryToStorage();
      
      this.translationStatus = '';
      this.translationProgress = 0;
      this.logs = '';
      this.completedFields = [];
      this.inProgressFields = [];
      this.currentStep = 2; // 进入翻译过程步骤
      
      // 向后端发送翻译请求
      axios.post('/translate', {
        task_id: this.taskId,
        model_name: this.translationParams.model_name,
        base_url: this.translationParams.base_url,
        api_key: this.translationParams.api_key
      })
      .then(response => {
        console.log('Translation started:', response.data);
      })
      .catch(error => {
        console.error('Translation error:', error);
        this.$message.error('启动翻译任务失败');
        this.translationStatus = 'exception';
      });
    },
    
    // 连接WebSocket获取实时翻译进度
    connectWebSocket() {
      if (this.taskId) {
        try {
          this.websocket = new WebSocket(this.wsUrl);
          
          this.websocket.onopen = () => {
            console.log('WebSocket connected');
            // 设置定时ping以保持连接
            this.pingInterval = setInterval(() => {
              if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send('ping');
              }
            }, 30000);
          };
          
          this.websocket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              // 处理不同类型的消息
              if (data.type === 'log') {
                this.logs += data.message + '\n';
                
                // 1. 检测HTTP请求完成消息
                if (data.message.includes('HTTP Request:') && data.message.includes('HTTP/1.1 200 OK')) {
                  if (this.inProgressFields.length > 0) {
                    const fieldToComplete = this.inProgressFields[this.inProgressFields.length - 1];
                    this.markFieldAsCompleted(fieldToComplete);
                  }
                } 
                // 2. 检测开始翻译消息
                else if (data.message.match(/开始翻译(.*?)\.\.\.$/)) {
                  const match = data.message.match(/开始翻译(.*?)\.\.\.$/);
                  if (match && match[1]) {
                    const fieldName = match[1].trim();
                    if (!this.inProgressFields.includes(fieldName)) {
                      this.inProgressFields.push(fieldName);
                      this.updateTranslationProgress();
                    }
                  }
                } 
                // 3. 检测字段为空或跳过消息
                else if (data.message.includes('跳过翻译')) {
                  const match = data.message.match(/字段 (.*?) 不存在或为空，跳过翻译/);
                  if (match && match[1]) {
                    const fieldName = match[1].trim();
                    this.markFieldAsCompleted(this.getDisplayNameForField(fieldName));
                  } else if (data.message.includes('可选问候语') && data.message.includes('跳过翻译')) {
                    this.markFieldAsCompleted('可选问候语');
                  }
                }
                // 4. 检测翻译完成消息
                else if (data.message.includes('翻译完成')) {
                  for (const field in this.fieldNameMap) {
                    const displayName = this.fieldNameMap[field];
                    if (data.message.includes(displayName) && data.message.includes('翻译完成')) {
                      this.markFieldAsCompleted(displayName);
                    }
                  }
                }
                
                // 滚动日志到底部
                this.$nextTick(() => {
                  const logContainers = document.querySelectorAll('.log-container');
                  logContainers.forEach(container => {
                    container.scrollTop = container.scrollHeight;
                  });
                });
              } else if (data.type === 'completed') {
                // 翻译完成后立即更新currentStep
                this.currentStep = 3;
                this.logs += '翻译任务完成！\n';
                
                // 确保所有字段都被标记为完成
                for (const field of this.fields) {
                  const displayName = this.fieldNameMap[field];
                  if (!this.completedFields.includes(displayName)) {
                    this.completedFields.push(displayName);
                  }
                }
                
                this.translationProgress = 100;
                this.translationStatus = 'success';
                
                // 保存下载链接
                this.downloadUrls = {
                  json: `/download/json/${this.taskId}`,
                  image: `/download/image/${this.taskId}`
                };
              } else if (data.type === 'error') {
                this.logs += '错误: ' + data.message + '\n';
                this.translationStatus = 'exception';
              }
            } catch (e) {
              console.error('Error parsing WebSocket message:', e);
            }
          };
          
          this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.translationStatus = 'exception';
          };
          
          this.websocket.onclose = () => {
            console.log('WebSocket connection closed');
            clearInterval(this.pingInterval);
          };
          
        } catch (error) {
          console.error('Failed to connect WebSocket:', error);
        }
      }
    },
    
    // 将字段标记为已完成并更新进度
    markFieldAsCompleted(fieldName) {
      if (fieldName && !this.completedFields.includes(fieldName)) {
        console.log(`标记字段为已完成: ${fieldName}`);
        this.completedFields.push(fieldName);
        this.updateTranslationProgress();
      }
    },
    
    // 获取字段显示名称
    getDisplayNameForField(fieldName) {
      return this.fieldNameMap[fieldName] || fieldName;
    },
    
    // 更新翻译进度
    updateTranslationProgress() {
      const totalFields = this.fields.length;
      let completedCount = 0;
      let inProgressCount = 0;
      
      // 计算已完成的字段数量
      for (const field of this.fields) {
        const displayName = this.fieldNameMap[field];
        if (this.completedFields.includes(displayName)) {
          completedCount++;
        } else if (this.inProgressFields.includes(displayName)) {
          inProgressCount++;
        }
      }
      
      // 用更平滑的方式计算进度
      // 1. 已完成字段权重
      const completedWeight = completedCount * (85 / totalFields);
      
      // 2. 进行中字段权重
      let inProgressWeight = 0;
      if (inProgressCount > 0 && completedCount < totalFields) {
        const baseProgress = completedWeight;
        const progressIncrement = Math.min(14, Math.log10(baseProgress + 10) * 20);
        inProgressWeight = progressIncrement;
      }
      
      // 计算总进度
      let progress = completedWeight + inProgressWeight;
      
      if (completedCount === totalFields) {
        progress = 100;
      } else {
        progress = Math.min(99, progress);
      }
      
      // 调试信息
      console.log(`进度更新: 总字段=${totalFields}, 已完成=${completedCount}(${completedWeight.toFixed(1)}%), 进行中=${inProgressCount}(+${inProgressWeight.toFixed(1)}%), 总进度=${progress.toFixed(1)}%`);
      
      // 更新进度条
      this.translationProgress = Math.round(progress);
    },
    
    // 下载翻译结果 (JSON)
    downloadJson() {
      if (this.downloadUrls.json) {
        window.open(this.downloadUrls.json, '_blank');
      } else {
        this.$message.error('JSON文件不可用');
      }
    },
    
    // 下载翻译结果 (图片)
    downloadImage() {
      if (this.downloadUrls.image) {
        window.open(this.downloadUrls.image, '_blank');
      } else {
        this.$message.error('图片文件不可用');
      }
    },
    
    // 重置翻译过程
    resetTranslation() {
      // 关闭当前WebSocket连接
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }
      
      clearInterval(this.pingInterval);
      
      // 重置所有状态
      this.taskId = null;
      this.logs = '';
      this.translationProgress = 0;
      this.translationStatus = '';
      this.currentStep = 0;
      this.completedFields = [];
      this.inProgressFields = [];
      this.downloadUrls = {
        json: '',
        image: ''
      };
    },
    
    // 清理资源
    destroyTranslator() {
      if (this.websocket) {
        this.websocket.close();
      }
      clearInterval(this.pingInterval);
    }
  }
};

export default TranslatorModule;
