<template>
  <div class="action-buttons">
    <el-button type="success" @click="open(download.json)" :disabled="!download.json">下载JSON</el-button>
    <el-button type="success" @click="open(download.image)" :disabled="!download.image">下载图片</el-button>
    <el-button @click="$emit('reset')">重新翻译</el-button>
  </div>
</template>

<script setup>
const props = defineProps({
  download: Object
})
function open(url) {
  if (url) window.open(url, '_blank')
}
</script>
