// Tavern Translator 前端应用
window.addEventListener('load', function() {
  new Vue({
    el: '#app',
    data() {
      return {
        currentStep: 0, // 当前步骤：0-上传，1-设置参数，2-翻译过程，3-下载结果
        taskId: null, // 当前任务ID
        translationParams: {
          model_name: '',
          base_url: '',
          api_key: ''
        },
        logs: '', // 翻译日志
        translationProgress: 0, // 翻译进度
        translationStatus: '', // 翻译状态：success, exception
        websocket: null, // WebSocket连接
        pingInterval: null, // 保持WebSocket连接的定时器
        downloadUrls: {
          json: '',
          image: ''
        },
        fields: [ // 翻译的字段列表
          'first_mes', 
          'alternate_greetings', 
          'description', 
          'personality', 
          'mes_example', 
          'system_prompt', 
          'scenario'
        ],
        completedFields: [], // 已翻译完成的字段
        savedModels: [], // 保存的模型名称历史记录
        savedUrls: [], // 保存的API URL历史记录
        savedApiKeys: [], // 保存的API密钥历史记录（仅最后一个）
        welcomeDialogVisible: true, // 欢迎对话框默认显示
        isMobile: false, // 是否为移动设备
      }
    },
    created() {
      // 检测是否为移动设备
      this.checkMobile();
      
      // 页面加载时从localStorage加载历史记录
      this.loadHistoryFromStorage();
      
      // 确保欢迎对话框能够正常显示
      this.$nextTick(() => {
        // 强制重新渲染对话框，解决某些浏览器不显示的问题
        this.welcomeDialogVisible = false;
        setTimeout(() => {
          this.welcomeDialogVisible = true;
        }, 100);
      });
    },
    computed: {
      // 计算WebSocket URL
      wsUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws/${this.taskId}`;
      }
    },
    watch: {
      // 监听TaskID变化，建立WebSocket连接
      taskId(newVal) {
        if (newVal) {
          this.connectWebSocket();
        }
      }
    },
    methods: {
      // 检测是否为移动设备
      checkMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        this.isMobile = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
      },
      
      // 关闭欢迎对话框
      closeWelcomeDialog() {
        this.welcomeDialogVisible = false;
      },
      
      // 载入历史记录
      loadHistoryFromStorage() {
        try {
          // 加载模型名称历史记录
          const savedModels = localStorage.getItem('tavern_translator_models');
          if (savedModels) {
            this.savedModels = JSON.parse(savedModels);
            // 如果有历史记录，自动填充最后使用的模型名称
            if (this.savedModels.length > 0) {
              this.translationParams.model_name = this.savedModels[0];
            }
          }
          
          // 加载API URL历史记录
          const savedUrls = localStorage.getItem('tavern_translator_urls');
          if (savedUrls) {
            this.savedUrls = JSON.parse(savedUrls);
            // 如果有历史记录，自动填充最后使用的URL
            if (this.savedUrls.length > 0) {
              this.translationParams.base_url = this.savedUrls[0];
            }
          }
          
          // 加载API密钥（仅加载最后一个）
          const savedApiKey = localStorage.getItem('tavern_translator_api_key');
          if (savedApiKey) {
            this.translationParams.api_key = savedApiKey;
          }
        } catch (e) {
          console.error('加载历史记录失败:', e);
        }
      },
      
      // 保存历史记录到localStorage
      saveHistoryToStorage() {
        try {
          const currentModel = this.translationParams.model_name.trim();
          const currentUrl = this.translationParams.base_url.trim();
          const currentApiKey = this.translationParams.api_key.trim();
          
          // 只保存非空值
          if (currentModel) {
            // 将当前值移到列表最前面（如果已存在则先移除）
            this.savedModels = this.savedModels.filter(m => m !== currentModel);
            this.savedModels.unshift(currentModel);
            // 限制历史记录数量为5个
            this.savedModels = this.savedModels.slice(0, 5);
            localStorage.setItem('tavern_translator_models', JSON.stringify(this.savedModels));
          }
          
          if (currentUrl) {
            // 将当前值移到列表最前面（如果已存在则先移除）
            this.savedUrls = this.savedUrls.filter(u => u !== currentUrl);
            this.savedUrls.unshift(currentUrl);
            // 限制历史记录数量为5个
            this.savedUrls = this.savedUrls.slice(0, 5);
            localStorage.setItem('tavern_translator_urls', JSON.stringify(this.savedUrls));
          }
          
          if (currentApiKey) {
            // 只保存最后一个API密钥
            localStorage.setItem('tavern_translator_api_key', currentApiKey);
          }
        } catch (e) {
          console.error('保存历史记录失败:', e);
        }
      },
      
      // 清除历史记录
      clearHistory() {
        this.$confirm('确定要清除所有历史记录吗?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          localStorage.removeItem('tavern_translator_models');
          localStorage.removeItem('tavern_translator_urls');
          localStorage.removeItem('tavern_translator_api_key');
          this.savedModels = [];
          this.savedUrls = [];
          this.$message({
            type: 'success',
            message: '历史记录已清除'
          });
        }).catch(() => {});
      },
      
      // 选择历史记录中的模型名称
      selectModel(model) {
        this.translationParams.model_name = model;
      },
      
      // 选择历史记录中的API URL
      selectUrl(url) {
        this.translationParams.base_url = url;
      },
      
      // 上传前检查文件类型
      beforeUpload(file) {
        const isPNG = file.type === 'image/png';
        if (!isPNG) {
          this.$message.error('只能上传PNG格式的角色卡文件！');
        }
        return isPNG;
      },
      
      // 文件上传成功的回调
      onUploadSuccess(response) {
        if (response && response.task_id) {
          this.taskId = response.task_id;
          this.$message.success('文件上传成功');
          this.currentStep = 1; // 进入参数设置步骤
        } else {
          this.$message.error('上传响应异常');
        }
      },
      
      // 文件上传失败的回调
      onUploadError(err) {
        console.error('上传失败:', err);
        this.$message.error('文件上传失败，请重试');
      },
      
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
                  
                  // 更新翻译进度
                  const messageMatch = data.message.match(/开始翻译(.*?)\.\.\.$/);
                  if (messageMatch && messageMatch[1]) {
                    const fieldType = messageMatch[1];
                    if (!this.completedFields.includes(fieldType)) {
                      this.completedFields.push(fieldType);
                      this.updateTranslationProgress();
                    }
                  }
                } else if (data.type === 'completed') {
                  this.logs += '翻译任务完成！\n';
                  this.translationProgress = 100;
                  this.translationStatus = 'success';
                  
                  // 保存下载链接
                  this.downloadUrls = {
                    json: `/download/json/${this.taskId}`,
                    image: `/download/image/${this.taskId}`
                  };
                  
                  // 延迟切换到下载步骤
                  setTimeout(() => {
                    this.currentStep = 3;
                  }, 1000);
                } else if (data.type === 'error') {
                  this.logs += '错误: ' + data.message + '\n';
                  this.translationStatus = 'exception';
                }
                
                // 滚动日志到底部
                this.$nextTick(() => {
                  const logContainers = document.querySelectorAll('.log-container');
                  logContainers.forEach(container => {
                    container.scrollTop = container.scrollHeight;
                  });
                });
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
      
      // 更新翻译进度
      updateTranslationProgress() {
        // 计算已翻译字段数量占总字段的百分比
        let knownFields = 0;
        this.fields.forEach(field => {
          this.completedFields.forEach(completedField => {
            if (completedField.includes(field) || 
                (field === 'alternate_greetings' && completedField.includes('可选问候语'))) {
              knownFields++;
            }
          });
        });
        
        this.translationProgress = Math.floor((knownFields / this.fields.length) * 100);
      },
      
      // 下载JSON结果
      downloadJson() {
        if (this.downloadUrls.json) {
          window.open(this.downloadUrls.json, '_blank');
        } else {
          this.$message.error('JSON文件不可用');
        }
      },
      
      // 下载图片结果
      downloadImage() {
        if (this.downloadUrls.image) {
          window.open(this.downloadUrls.image, '_blank');
        } else {
          this.$message.error('图片文件不可用');
        }
      },
      
      // 重置翻译过程，开始新的翻译
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
        this.downloadUrls = {
          json: '',
          image: ''
        };
      }
    },
    beforeDestroy() {
      // 组件销毁前关闭WebSocket连接
      if (this.websocket) {
        this.websocket.close();
      }
      clearInterval(this.pingInterval);
    }
  });
});