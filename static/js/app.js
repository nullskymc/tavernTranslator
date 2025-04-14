// Tavern Translator 前端应用 - 主入口

// 引入模块
import TranslatorModule from './modules/translator.js';
import StorageModule from './modules/storage.js'; 
import UIModule from './modules/ui.js';
import ThemeManagerModule from './modules/themeManager.js';
import { mixinModules } from './utils/helpers.js';

// 等待DOM加载完成
window.addEventListener('load', function() {
  // 混合所有模块
  const AppMixin = mixinModules(
    TranslatorModule, 
    StorageModule, 
    UIModule, 
    ThemeManagerModule
  );
  
  // 创建Vue应用
  new Vue({
    el: '#app',
    mixins: [AppMixin],
    
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
    
    watch: {
      // 监听TaskID变化，建立WebSocket连接
      taskId(newVal) {
        if (newVal) {
          this.connectWebSocket();
        }
      }
    },
    
    beforeDestroy() {
      // 组件销毁前关闭WebSocket连接
      this.destroyTranslator();
    }
  });
});