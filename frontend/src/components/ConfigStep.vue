<template>
  <el-form :model="params" label-width="100px">
    <el-form-item label="模型名称" required>
      <el-input v-model="params.model_name" placeholder="模型名称"></el-input>
    </el-form-item>
    <el-form-item label="API地址" required>
      <el-input v-model="params.base_url" placeholder="API Base URL"></el-input>
    </el-form-item>
    <el-form-item label="API Key">
      <el-input v-model="params.api_key" placeholder="API Key"></el-input>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="start">开始翻译</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
const props = defineProps({
  params: Object
})
const emit = defineEmits(['start'])
function start() {
  emit('start')
}
</script>
