<template>
  <el-card class="fade-in">
    <template #header>
      <div class="step-title">
        <span class="step-number">1</span>
        <span class="step-text">上传角色卡图片</span>
      </div>
    </template>
    
    <el-upload
      class="upload-demo"
      drag
      action="/upload"
      :on-success="onUploadSuccess"
      :on-error="onUploadError"
      :before-upload="beforeUpload"
      accept="image/png"
    >
      <el-icon class="el-icon--upload" style="font-size:48px;color:var(--primary-color);margin-bottom:10px">
        <Upload />
      </el-icon>
      <div class="el-upload__text">拖拽PNG文件到此处，或 <em>点击上传</em></div>
      <template #tip>
        <div class="el-upload__tip">只能上传PNG格式的角色卡文件</div>
      </template>
    </el-upload>
  </el-card>
</template>

<script setup>
import { Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUIStore } from '../stores/ui'
import { useTranslatorStore } from '../stores/translator'

const uiStore = useUIStore()
const translatorStore = useTranslatorStore()

// 上传前检查文件类型
const beforeUpload = (file) => {
  const isPNG = file.type === 'image/png'
  if (!isPNG) {
    ElMessage.error('只能上传PNG格式的角色卡文件！')
  }
  return isPNG
}

// 文件上传成功的回调
const onUploadSuccess = (response) => {
  if (response && response.task_id) {
    translatorStore.setTaskId(response.task_id)
    ElMessage.success('文件上传成功')
    uiStore.nextStep() // 进入参数设置步骤
  } else {
    ElMessage.error('上传响应异常')
  }
}

// 文件上传失败的回调
const onUploadError = (err) => {
  console.error('上传失败:', err)
  ElMessage.error('文件上传失败，请重试')
}
</script>

<style scoped>
.step-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.step-number {
  width: 30px;
  height: 30px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 14px;
  font-weight: bold;
}

.step-text {
  color: var(--text-primary);
}

.upload-demo {
  margin: 20px 0;
}

:deep(.el-upload-dragger) {
  background-color: var(--background-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-upload-dragger:hover) {
  border-color: var(--primary-color);
  background-color: var(--background-hover);
}

:deep(.el-upload__text) {
  color: var(--text-primary);
  font-size: 16px;
}

:deep(.el-upload__text em) {
  color: var(--primary-color);
  font-style: normal;
}

:deep(.el-upload__tip) {
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 8px;
}
</style>
