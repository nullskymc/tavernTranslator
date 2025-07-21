import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import axios from 'axios';
import { ElMessage, ElNotification } from 'element-plus';
import { get, set } from 'lodash-es';

// --- Helper ---
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// --- Store Definition ---
const CARD_STORAGE_KEY = 'characterCard';
const SETTINGS_STORAGE_KEY = 'translationSettings';
const IMAGE_STORAGE_KEY = 'characterImageB64';

export const useTranslatorStore = defineStore('translator', () => {
  // --- State ---
  const characterCard = ref(null);
  const characterImageB64 = ref(null); // 保存图片 base64
  const isLoading = ref(false);
  const translationSettings = ref({
    api_key: '',
    base_url: 'https://api.openai.com/v1',
    model_name: 'gpt-4-1106-preview',
  });

  // --- Actions ---
  const loadFromStorage = () => {
    const savedCard = localStorage.getItem(CARD_STORAGE_KEY);
    if (savedCard) try { characterCard.value = JSON.parse(savedCard); } catch (e) { localStorage.removeItem(CARD_STORAGE_KEY); }

    const savedImg = localStorage.getItem(IMAGE_STORAGE_KEY);
    if (savedImg) characterImageB64.value = savedImg;

    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) try { Object.assign(translationSettings.value, JSON.parse(savedSettings)); } catch (e) { localStorage.removeItem(SETTINGS_STORAGE_KEY); }
  };

  const handleCardUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    isLoading.value = true;
    try {
      const response = await axios.post('/api/v1/character/upload', formData);
      characterCard.value = response.data.character_data;
      characterImageB64.value = response.data.image_b64;
      ElMessage.success('角色卡解析成功！');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || '解析角色卡失败';
      ElNotification.error({ title: '上传失败', message: errorMessage });
    } finally {
      isLoading.value = false;
    }
  };

  const updateBaseImage = (base64String) => {
    characterImageB64.value = base64String;
    ElMessage.success('基础图片已更新');
  };

  const translateField = async (path) => {
    if (!characterCard.value) return;
    const textToTranslate = get(characterCard.value, path);
    if (!textToTranslate || typeof textToTranslate !== 'string' || !textToTranslate.trim()) return;
    if (!translationSettings.value.api_key) {
      ElMessage.warning('请先在设置中提供您的 API Key');
      return;
    }
    const fieldName = path.split('.').pop();
    isLoading.value = true;
    try {
      const response = await axios.post('/api/v1/character/translate', {
        text: textToTranslate,
        field_name: fieldName,
        settings: translationSettings.value,
      });
      set(characterCard.value, path, response.data.translated_text);
      ElMessage.success(`字段 ${fieldName} 翻译成功`);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || '翻译服务出错';
      ElNotification.error({ title: '翻译失败', message: errorMessage });
    } finally {
      isLoading.value = false;
    }
  };

  const exportCardAsImage = async () => {
    if (!characterCard.value || !characterImageB64.value) {
      ElMessage.error('没有角色卡数据或基础图片可供导出');
      return;
    }
    isLoading.value = true;
    try {
      const formData = new FormData();
      formData.append('json_data', JSON.stringify(characterCard.value));
      const imageBlob = base64ToBlob(characterImageB64.value, 'image/png');
      formData.append('image_file', imageBlob, 'character_base.png');

      const response = await axios.post('/api/v1/character/export', formData, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${get(characterCard.value, 'data.name', 'character')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      ElMessage.success('角色卡已成功导出为图片！');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || '无法生成角色卡图片';
      ElNotification.error({ title: '导出失败', message: errorMessage });
    } finally {
      isLoading.value = false;
    }
  };
  
  const resetStore = () => {
    characterCard.value = null;
    characterImageB64.value = null;
    localStorage.removeItem(CARD_STORAGE_KEY);
    localStorage.removeItem(IMAGE_STORAGE_KEY);
    ElMessage.info('已清除当前角色卡数据');
  };

  const exportCardAsJson = () => {
    if (!characterCard.value) {
      ElMessage.error('没有角色卡数据可供导出');
      return;
    }
    try {
      const jsonString = JSON.stringify(characterCard.value, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${get(characterCard.value, 'data.name', 'character')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      ElMessage.success('角色卡已成功导出为 JSON！');
    } catch (error) {
      ElNotification.error({ title: '导出失败', message: '导出 JSON 文件失败' });
    }
  };

  const handleJsonUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        characterCard.value = jsonData;
        characterImageB64.value = null; // JSON上传不包含图片，清空图片
        ElMessage.success('JSON 文件解析成功！');
      } catch (error) {
        ElMessage.error('解析 JSON 文件失败，请确保文件格式正确。');
      }
    };
    reader.onerror = () => {
      ElMessage.error('读取 JSON 文件失败。');
    };
    reader.readAsText(file);
  };

  const updateCardField = (path, value) => {
    if (!characterCard.value) return;
    set(characterCard.value, path, value);
  };

  const createNewCard = () => {
    characterCard.value = {
      "data": {
        "name": "新角色",
        "description": "",
        "personality": "",
        "scenario": "",
        "first_mes": "",
        "mes_example": "",
        "creator_notes": "",
        "system_prompt": "",
        "post_history_instructions": "",
        "tags": [],
        "character_book": {
          "name": "",
          "description": "",
          "scan_depth": 0,
          "token_budget": 0,
          "recursive_scanning": false,
          "extensions": {},
          "lore": []
        },
        "extensions": {},
        "spec": "chara_card_v2",
        "spec_version": "2.0"
      },
      "last_update": Date.now(),
      "last_update_human": new Date().toLocaleString()
    };
    characterImageB64.value = null;
    ElMessage.success('已创建新的空白角色卡！');
  };

  // --- Watchers ---
  watch(characterCard, (val) => {
    if (val) localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(val));
    else localStorage.removeItem(CARD_STORAGE_KEY);
  }, { deep: true });

  watch(characterImageB64, (val) => {
    if (val) localStorage.setItem(IMAGE_STORAGE_KEY, val);
    else localStorage.removeItem(IMAGE_STORAGE_KEY);
  });

  watch(translationSettings, (val) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(val));
  }, { deep: true });

  // --- Initial Load ---
  loadFromStorage();

  return {
    characterCard,
    characterImageB64,
    isLoading,
    translationSettings,
    handleCardUpload,
    updateBaseImage,
    translateField,
    exportCardAsImage,
    resetStore,
    exportCardAsJson, // 导出新方法
    handleJsonUpload, // 导出新方法
    createNewCard,    // 导出新方法
    updateCardField,  // 导出新方法
  };
});
