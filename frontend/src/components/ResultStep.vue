<template>
  <div>
    <el-button type="success" @click="open(download.json)" :disabled="!download.json">下载JSON</el-button>
    <el-button type="success" @click="open(download.image)" :disabled="!download.image" style="margin-left: 8px">下载图片</el-button>
    <el-button style="margin-left: 8px" @click="$emit('reset')">重新翻译</el-button>
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
