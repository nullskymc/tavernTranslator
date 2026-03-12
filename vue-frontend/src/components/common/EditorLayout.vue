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

/* The tabs slot already renders its own underline border via EditorTabs.
   Keep this row as a flex container for tabs + actions only — no extra border. */
.card-header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  margin-bottom: 16px;
  /* Bottom border is owned by EditorTabs; don't double it */
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 1px; /* align baseline with tab underline */
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

@media (max-width: 768px) {
  .editor-layout {
    padding: 0;
  }
}

@media (max-width: 480px) {
  .header-actions .el-button {
    font-size: 12px;
    padding: 4px 8px;
  }
}
</style>