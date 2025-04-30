/**
 * 存储模块 - 处理本地存储和历史记录
 */

const StorageModule = {
  data() {
    return {
      savedModels: [],
      savedUrls: [],
      savedApiKeys: []
    };
  },
  
  methods: {
    // 加载历史记录
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
    }
  }
};

export default StorageModule;
