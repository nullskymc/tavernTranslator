<template>
  <div class="label-with-btn">
    <span>{{ label }}</span>
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

.translate-btn {
  margin-left: 10px;
}

@media (max-width: 768px) {
  .label-with-btn {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .label-with-btn .translate-btn {
    margin-left: 0;
    align-self: flex-end;
  }
}
</style>
