/**
 * UI模块 - 处理用户界面交互
 */

const UIModule = {
  data() {
    return {
      currentStep: 0,
      welcomeDialogVisible: true,
      isMobile: false,
      uploadedFile: null
    };
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
    
    // 上传前检查文件类型
    beforeUpload(file) {
      const isPNG = file.type === 'image/png';
      if (!isPNG) {
        this.$message.error('只能上传PNG格式的角色卡文件！');
      }
      return isPNG;
    },
    
    // 处理文件上传
    onFileUpload(file) {
      try {
        if (this.beforeUpload(file)) {
          this.uploadedFile = file;
          this.$message.success('文件上传成功');
          
          // 调用translator模块的handleFileUpload方法
          this.handleFileUpload(file);
        }
      } catch (error) {
        console.error('处理文件上传失败:', error);
        this.$message.error('处理文件失败，请重试');
      }
    },
    
    // 处理上传区域拖拽事件
    handleDrop(event) {
      event.preventDefault();
      event.stopPropagation();
      
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        this.onFileUpload(file);
      }
    },
    
    // 处理上传区域拖拽进入事件
    handleDragOver(event) {
      event.preventDefault();
      event.stopPropagation();
    },
    
    // 处理文件输入变化事件
    handleFileInputChange(event) {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        this.onFileUpload(file);
      }
    },
    
    // 触发文件选择对话框
    triggerFileInput() {
      document.getElementById('file-input').click();
    }
  }
};

export default UIModule;
