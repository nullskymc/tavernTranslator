<template>
  <div>
    <el-progress :percentage="progress" style="margin-bottom: 16px" />
    <pre class="log">{{ logs }}</pre>
  </div>
</template>

<script setup>
defineProps({ progress: Number, logs: String })
</script>

<style scoped>
.log {
  max-height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #eee;
  padding: 8px;
  border-radius: 4px;
}
</style>
