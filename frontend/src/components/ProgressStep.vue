<template>
  <div>
    <el-progress :percentage="progress" style="margin-bottom: 16px" />
    <pre class="log-container">{{ logs }}</pre>
  </div>
</template>

<script setup>
defineProps({ progress: Number, logs: String })
</script>

