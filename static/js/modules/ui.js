/**
 * UI模块 - 处理用户界面交互
 */

const UIModule = {
  data() {
    return {
      currentStep: 0,
      welcomeDialogVisible: true,
      isMobile: false
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
    }
  }
};

export default UIModule;
