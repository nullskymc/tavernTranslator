<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('settings.title')"
    :width="isMobile ? '95%' : '500px'"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form label-position="top" :model="settings">
      <el-form-item :label="$t('settings.api')">
        <el-input v-model="settings.api_key" :placeholder="$t('settings.apiPlaceholder')" show-password />
      </el-form-item>
      <el-form-item :label="$t('settings.baseUrl')">
        <el-input v-model="settings.base_url" :placeholder="$t('settings.baseUrlPlaceholder')" />
      </el-form-item>
      <el-form-item :label="$t('settings.model')">
        <el-input v-model="settings.model_name" :placeholder="$t('settings.modelPlaceholder')" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">{{ $t('settings.cancel') }}</el-button>
        <el-button type="primary" @click="saveSettings">
          {{ $t('settings.save') }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useTranslatorStore } from '@/stores/translator';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: Boolean, // 用于 v-model
});

const emit = defineEmits(['update:modelValue']);

const store = useTranslatorStore();

// 移动端检测
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const handleResize = () => {
  checkMobile();
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// 将 store 的设置绑定到本地 ref，以便在表单中编辑
const settings = ref({ ...store.translationSettings });

const dialogVisible = ref(props.modelValue);

// 监听 v-model 的变化来更新对话框可见性
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val;
  // 每次打开对话框时，都从 store 同步最新的设置
  if (val) {
    settings.value = { ...store.translationSettings };
  }
});

// 监听对话框可见性的变化来更新 v-model
watch(dialogVisible, (val) => {
  emit('update:modelValue', val);
});

const saveSettings = () => {
  // 将本地的设置保存回 store
  store.translationSettings.api_key = settings.value.api_key;
  store.translationSettings.base_url = settings.value.base_url;
  store.translationSettings.model_name = settings.value.model_name;
  
  ElMessage.success($t('settings.saveSuccess'));
  dialogVisible.value = false;
};
</script>
