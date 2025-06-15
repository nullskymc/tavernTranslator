<template>
  <el-upload
    drag
    action="/upload"
    accept="image/png"
    :on-success="onSuccess"
    :on-error="onError"
    :before-upload="beforeUpload">
    <el-icon class="el-upload__icon"><upload-filled /></el-icon>
    <div class="el-upload__text">拖拽PNG文件到此处，或 <em>点击上传</em></div>
    <template #tip>
      <div class="el-upload__tip">只能上传PNG格式的角色卡文件</div>
    </template>
  </el-upload>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const emit = defineEmits(['success'])

function beforeUpload(file) {
  const ok = file.type === 'image/png'
  if (!ok) ElMessage.error('只能上传PNG格式的角色卡文件！')
  return ok
}

function onSuccess(response) {
  if (response && response.task_id) {
    ElMessage.success('文件上传成功')
    emit('success', response.task_id)
  } else {
    ElMessage.error('上传响应异常')
  }
}

function onError() {
  ElMessage.error('文件上传失败，请重试')
}
</script>
