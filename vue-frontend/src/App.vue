<template>
  <div id="app">
    <!-- 主题切换按钮 -->
    <ThemeToggle />
    
    <!-- 欢迎对话框 -->
    <WelcomeDialog />
    
    <!-- 顶部横幅 -->
    <HeaderBanner />

    <!-- 主要内容容器 -->
    <div class="container steps-container">
      <!-- 步骤指示器 -->
      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 40px" class="fade-in">
        <el-step title="上传文件" :icon="Upload"></el-step>
        <el-step title="设置翻译参数" :icon="Setting"></el-step>
        <el-step title="翻译过程" :icon="Refresh"></el-step>
        <el-step title="下载结果" :icon="Download"></el-step>
      </el-steps>

      <!-- 步骤1: 上传文件 -->
      <FileUpload v-show="currentStep === 0" />

      <!-- 步骤2: 设置翻译参数 -->
      <TranslationSettings v-show="currentStep === 1" />

      <!-- 步骤3: 翻译过程 -->
      <TranslationProgress v-show="currentStep === 2" />
      
      <!-- 步骤4: 下载结果 -->
      <DownloadResults v-show="currentStep === 3" />
      
      <!-- 页脚 -->
      <Footer />
    </div>
    
    <!-- 错误恢复组件 -->
    <ErrorRecovery />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Upload, Setting, Refresh, Download } from '@element-plus/icons-vue'
import { useUIStore } from './stores/ui'
import { useThemeStore } from './stores/theme'
import { useStorageStore } from './stores/storage'
import { useTranslatorStore } from './stores/translator'
import { globalErrorHandler } from './utils/errorHandler'

// 导入组件
import ThemeToggle from './components/ThemeToggle.vue'
import WelcomeDialog from './components/WelcomeDialog.vue'
import HeaderBanner from './components/HeaderBanner.vue'
import FileUpload from './components/FileUpload.vue'
import TranslationSettings from './components/TranslationSettings.vue'
import TranslationProgress from './components/TranslationProgress.vue'
import DownloadResults from './components/DownloadResults.vue'
import Footer from './components/Footer.vue'
import ErrorRecovery from './components/ErrorRecovery.vue'

// 使用 stores
const uiStore = useUIStore()
const themeStore = useThemeStore()
const storageStore = useStorageStore()
const translatorStore = useTranslatorStore()

// 获取当前步骤
const { currentStep } = storeToRefs(uiStore)

onMounted(() => {
  // 初始化全局错误处理器
  console.log('全局错误处理器已初始化')
  
  // 检测是否为移动设备
  uiStore.checkMobile()
  
  // 初始化主题
  themeStore.initializeTheme()
  themeStore.setupThemeChangeListener()
  
  // 加载历史记录
  storageStore.loadHistoryFromStorage()
  
  // 监听TaskID变化，建立WebSocket连接
  watch(() => translatorStore.taskId, (newVal) => {
    if (newVal) {
      translatorStore.connectWebSocket()
    }
  })
})

onBeforeUnmount(() => {
  // 组件销毁前关闭WebSocket连接
  translatorStore.closeWebSocket()
})
</script>
