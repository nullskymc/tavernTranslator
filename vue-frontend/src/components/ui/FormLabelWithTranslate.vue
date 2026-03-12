<template>
  <div class="label-with-btn">
    <span class="label-text">{{ label }}</span>
    <el-button
      v-if="showButton"
      class="translate-btn"
      type="primary"
      text
      :loading="loading"
      @click="$emit('translate')"
    >
      {{ buttonText }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    buttonText?: string;
    loading?: boolean;
    showButton?: boolean;
  }>(),
  { buttonText: 'Translate', loading: false, showButton: true }
);
</script>

<style scoped>
.label-with-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

/* The label text — inherit from el-form-item__label (uppercase micro style via index.css).
   Override font-size/weight only for the inline translate context where it may
   be rendered outside the normal form-item label slot. */
.label-text {
  font-size: inherit;
  font-weight: inherit;
  color: inherit;
}

/* Translate button: compact text link, no extra horizontal margin */
.translate-btn {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 0;
  height: auto;
  line-height: 1.4;
  color: var(--el-color-primary);
}

.translate-btn:hover {
  opacity: 0.8;
}

@media (max-width: 768px) {
  .label-with-btn {
    flex-direction: row; /* keep inline even on mobile */
    align-items: center;
  }
}
</style>
