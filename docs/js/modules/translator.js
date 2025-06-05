/**
 * 翻译模块 - 处理所有翻译相关逻辑
 */

import PngProcessor from './pngProcessor.js';
import TranslatorClient from './translatorClient.js';

const TranslatorModule = {
  data() {
    return {
      originalFile: null,
      translationParams: {
        model_name: '',
        base_url: '',
        api_key: ''
      },
      logs: '',
      translationProgress: 0,
      translationStatus: '',
      downloadUrls: {
        json: null,
        image: null
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
      },
      isTranslationFailed: false,
      originalCardData: null,
      translatedCardData: null
    };
  },
  
  methods: {
    // 处理文件上传
    handleFileUpload(file) {
      // 保存原始文件以供后续使用
      this.originalFile = file;
      this.currentStep = 1; // 进入参数设置步骤
      return true;
    },
    
    // 开始翻译过程
    async startTranslation() {
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
      this.isTranslationFailed = false;
      this.currentStep = 2; // 进入翻译过程步骤
      
      try {
        // 初始化翻译客户端
        TranslatorClient.init(
          this.translationParams.model_name,
          this.translationParams.base_url,
          this.translationParams.api_key
        );
        
        // 设置事件监听
        this.setupTranslatorEvents();
        
        // 从PNG文件中提取文本数据
        this.addToLog('正在从PNG文件中提取角色卡数据...');
        const cardData = await PngProcessor.extractTextFromPng(this.originalFile);
        this.originalCardData = cardData;
        this.addToLog('成功提取角色卡数据');
        
        // 翻译角色卡
        this.addToLog('开始翻译角色卡内容...');
        const translatedCardData = await TranslatorClient.translateCharacterCard(JSON.parse(JSON.stringify(cardData)));
        this.translatedCardData = translatedCardData;
        this.addToLog('角色卡翻译完成');
        
        // 将翻译后的数据嵌入到PNG文件
        this.addToLog('正在生成翻译后的角色卡图片...');
        const translatedPngBlob = await PngProcessor.embedTextIntoPng(this.originalFile, translatedCardData);
        this.addToLog('生成译文图片完成');
        
        // 生成下载链接
        this.generateDownloadUrls(translatedPngBlob, translatedCardData);
        
        // 更新状态为完成
        this.translationProgress = 100;
        this.translationStatus = 'success';
        this.currentStep = 3; // 进入下载结果步骤
        
        // 显示成功通知
        this.$notify({
          title: '翻译成功',
          message: '角色卡翻译完成，请下载结果文件',
          type: 'success',
          duration: 5000
        });
      } catch (error) {
        this.handleTranslationError(error.message || '翻译过程中出现错误');
      }
    },
    
    // 设置翻译客户端的事件监听
    setupTranslatorEvents() {
      // 日志事件
      TranslatorClient.on('log', (message) => {
        this.addToLog(message);
        
        // 检查日志消息，更新进度状态
        this.processLogMessage(message);
      });
      
      // 错误事件
      TranslatorClient.on('error', (message) => {
        this.handleTranslationError(message);
      });
    },
    
    // 处理日志消息，更新进度状态
    processLogMessage(message) {
      // 1. 检测HTTP请求完成消息
      if (message.includes('HTTP Request:') && message.includes('200 OK')) {
        if (this.inProgressFields.length > 0) {
          const fieldToComplete = this.inProgressFields[this.inProgressFields.length - 1];
          this.markFieldAsCompleted(fieldToComplete);
        }
      } 
      // 2. 检测开始翻译消息
      else if (message.match(/开始翻译(.*?)\.\.\.$/)) {
        const match = message.match(/开始翻译(.*?)\.\.\.$/);
        if (match && match[1]) {
          const fieldName = match[1].trim();
          if (!this.inProgressFields.includes(fieldName)) {
            this.inProgressFields.push(fieldName);
            this.updateTranslationProgress();
          }
        }
      } 
      // 3. 检测字段为空或跳过消息
      else if (message.includes('跳过翻译')) {
        const match = message.match(/字段 (.*?) 不存在或为空，跳过翻译/);
        if (match && match[1]) {
          const fieldName = match[1].trim();
          this.markFieldAsCompleted(this.getDisplayNameForField(fieldName));
        } else if (message.includes('可选问候语') && message.includes('跳过翻译')) {
          this.markFieldAsCompleted('可选问候语');
        }
      }
      // 4. 检测翻译完成消息
      else if (message.includes('翻译完成')) {
        for (const field in this.fieldNameMap) {
          const displayName = this.fieldNameMap[field];
          if (message.includes(displayName) && message.includes('翻译完成')) {
            this.markFieldAsCompleted(displayName);
          }
        }
      }
    },
    
    // 将日志消息添加到日志区域
    addToLog(message) {
      this.logs += message + '\n';
      
      // 滚动日志到底部
      this.$nextTick(() => {
        const logContainers = document.querySelectorAll('.log-container');
        logContainers.forEach(container => {
          container.scrollTop = container.scrollHeight;
        });
      });
    },
    
    // 处理翻译错误
    handleTranslationError(errorMessage) {
      // 标记翻译失败
      this.isTranslationFailed = true;
      this.translationStatus = 'exception';
      
      // 添加到日志
      this.logs += '错误: ' + errorMessage + '\n';
      
      // 只显示一个错误提示 - 使用通知框而非消息提示，因为通知框更醒目
      this.$notify({
        title: '翻译失败',
        message: errorMessage,
        type: 'error',
        duration: 8000,
        showClose: true
      });
      
      // 滚动日志到底部
      this.$nextTick(() => {
        const logContainers = document.querySelectorAll('.log-container');
        logContainers.forEach(container => {
          container.scrollTop = container.scrollHeight;
        });
      });
    },
    
    // 生成下载链接
    generateDownloadUrls(pngBlob, jsonData) {
      // 创建PNG文件的URL
      this.downloadUrls.image = URL.createObjectURL(pngBlob);
      
      // 创建JSON文件的URL
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], {type: 'application/json'});
      this.downloadUrls.json = URL.createObjectURL(jsonBlob);
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
        const link = document.createElement('a');
        link.href = this.downloadUrls.json;
        link.download = this.getFilenameWithoutExtension(this.originalFile.name) + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        this.$message.error('JSON文件不可用');
      }
    },
    
    // 下载翻译结果 (图片)
    downloadImage() {
      if (this.downloadUrls.image) {
        const link = document.createElement('a');
        link.href = this.downloadUrls.image;
        link.download = this.getFilenameWithoutExtension(this.originalFile.name) + '_translated.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        this.$message.error('图片文件不可用');
      }
    },
    
    // 获取不包含扩展名的文件名
    getFilenameWithoutExtension(filename) {
      return filename.replace(/\.[^/.]+$/, '');
    },
    
    // 重置翻译过程
    resetTranslation() {
      // 重置所有状态
      this.originalFile = null;
      this.logs = '';
      this.translationProgress = 0;
      this.translationStatus = '';
      this.currentStep = 0;
      this.completedFields = [];
      this.inProgressFields = [];
      this.isTranslationFailed = false;
      this.downloadUrls = {
        json: null,
        image: null
      };
      this.originalCardData = null;
      this.translatedCardData = null;
      
      // 释放之前创建的Blob URL
      if (this.downloadUrls.json) {
        URL.revokeObjectURL(this.downloadUrls.json);
      }
      if (this.downloadUrls.image) {
        URL.revokeObjectURL(this.downloadUrls.image);
      }
    }
  }
};

export default TranslatorModule;
