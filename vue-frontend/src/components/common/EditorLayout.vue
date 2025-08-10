<template>
  <div class="editor-layout">
    <div class="card-header">
      <slot name="tabs"></slot>
      <div class="header-actions">
        <slot name="actions"></slot>
      </div>
    </div>
    
    <div class="editor-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.editor-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  font-size: 1.2em;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--apple-border-color);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .editor-layout {
    padding: 0;
  }
  
  .card-header {
    font-size: 1.1em;
  }
}

@media (max-width: 480px) {
  .card-header {
    font-size: 1em;
  }
  
  .header-actions .el-button {
    font-size: 12px;
    padding: 4px 8px;
  }
}
</style>