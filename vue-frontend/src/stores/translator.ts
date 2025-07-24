import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import axios from 'axios';
import { ElMessage, ElNotification } from 'element-plus';
import { get, set } from 'lodash-es';
import type { CharacterCard, TranslationSettings } from '@/types';

// --- Helper ---
function base64ToBlob(base64: string, mimeType: string): Blob {
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

export const defaultPromptsZh = {
  base_template: `你是一个专业的翻译专家。请按照以下要求进行翻译：
1. 保持特殊格式（数字、符号、表情等）
2. 确保译文通顺自然
3. 保留原文的情感色彩和语气
4. 采用小说化翻译风格
5. 确保理解原文含义
6. 仅翻译内容文本
7. 仅输出翻译结果
8. 保留角色名等标识信息
9. 不要翻译或替换任何链接，保留原有链接`,
  description_template: `你是一个专业的角色设定翻译专家。请按照以下要求翻译角色描述：
1. 保持方括号[]内的格式标记
2. 保留所有加号+连接的属性列表
3. 确保人物特征的准确传达
4. 保持描述的细节完整性
5. 仅翻译描述文本
6. 保留角色名和占位符{{char}}
7. 确保译文通顺自然
8. 不要翻译或替换任何链接，保留原有链接`,
  dialogue_template: `你是一个专业的对话翻译专家。请按照以下要求翻译对话内容：
1. 保持对话的自然流畅
2. 传达原文的情感和语气
3. 保留对话标记和格式
4. 采用贴近日常的表达
5. 保持人物性格特征
6. 保留角色名和占位符
7. 准确翻译心理活动
8. 确保对话的连贯性
9. 不要翻译或替换任何链接，保留原有链接`,
};

export const defaultPromptsEn = {
  base_template: `You are a professional translator. Please follow these requirements for translation:
1. Maintain special formats (numbers, symbols, emojis, etc.).
2. Ensure the translation is fluent and natural.
3. Preserve the emotional tone and mood of the original text.
4. Adopt a novelistic translation style.
5. Ensure understanding of the original meaning.
6. Translate only the content text.
7. Output only the translation result.
8. Retain identifiers such as character names.
9. Do not translate or replace any links; keep the original links.`,
  description_template: `You are a professional character setting translator. Please follow these requirements when translating character descriptions:
1. Maintain the format markers within square brackets [].
2. Retain all attribute lists connected by plus signs +.
3. Ensure accurate conveyance of character traits.
4. Maintain the integrity of descriptive details.
5. Translate only the descriptive text.
6. Retain character names and placeholders like {{char}}.
7. Ensure the translation is fluent and natural.
8. Do not translate or replace any links; keep the original links.`,
  dialogue_template: `You are a professional dialogue translator. Please follow these requirements when translating dialogue:
1. Maintain the natural flow of the conversation.
2. Convey the emotion and tone of the original text.
3. Retain dialogue markers and formatting.
4. Use expressions that are close to daily language.
5. Maintain character personality traits.
6. Retain character names and placeholders.
7. Accurately translate psychological activities.
8. Ensure the coherence of the dialogue.
9. Do not translate or replace any links; keep the original links.`,
};

export const useTranslatorStore = defineStore('translator', () => {
  // --- State ---
  const characterCard = ref<CharacterCard | null>(null);
  const characterImageB64 = ref<string | null>(null);
  const isLoading = ref(false);
  const translationSettings = ref<TranslationSettings>({
    api_key: '',
    base_url: 'https://api.openai.com/v1',
    model_name: 'gpt-4-1106-preview',
    prompt_language: 'zh',
    prompts: { ...defaultPromptsZh },
  });

  // --- Actions ---
  const loadFromStorage = () => {
    const savedCard = localStorage.getItem(CARD_STORAGE_KEY);
    if (savedCard) try { characterCard.value = JSON.parse(savedCard); } catch (e) { localStorage.removeItem(CARD_STORAGE_KEY); }

    const savedImg = localStorage.getItem(IMAGE_STORAGE_KEY);
    if (savedImg) characterImageB64.value = savedImg;

    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) try { 
      const parsedSettings = JSON.parse(savedSettings);
      Object.assign(translationSettings.value, parsedSettings);
      if (!parsedSettings.prompts) {
        translationSettings.value.prompts = parsedSettings.prompt_language === 'en' ? { ...defaultPromptsEn } : { ...defaultPromptsZh };
      }
    } catch (e) { 
      localStorage.removeItem(SETTINGS_STORAGE_KEY); 
    }
  };

  const handleCardUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    isLoading.value = true;
    try {
      const response = await axios.post('/api/v1/character/upload', formData);
      characterCard.value = response.data.character_data;
      characterImageB64.value = response.data.image_b64;
      ElMessage.success('角色卡解析成功！');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || '解析角色卡失败';
      ElNotification.error({ title: '上传失败', message: errorMessage });
    } finally {
      isLoading.value = false;
    }
  };

  const updateBaseImage = (base64String: string) => {
    characterImageB64.value = base64String;
    ElMessage.success('基础图片已更新');
  };

  const translateField = async (path: string) => {
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
        settings: {
          api_key: translationSettings.value.api_key,
          base_url: translationSettings.value.base_url,
          model_name: translationSettings.value.model_name,
        },
        prompts: translationSettings.value.prompts,
      });
      set(characterCard.value, path, response.data.translated_text);
      ElMessage.success(`字段 ${fieldName} 翻译成功`);
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      ElNotification.error({ title: '导出失败', message: '导出 JSON 文件失败' });
    }
  };

  const handleJsonUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const jsonData = JSON.parse(e.target!.result as string);
        characterCard.value = jsonData;
        characterImageB64.value = null;
        ElMessage.success('JSON 文件解析成功！');
      } catch (error: any) {
        ElMessage.error('解析 JSON 文件失败，请确保文件格式正确。');
      }
    };
    reader.onerror = () => {
      ElMessage.error('读取 JSON 文件失败。');
    };
    reader.readAsText(file);
  };

  const updateCardField = (path: string, value: any) => {
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
    exportCardAsJson,
    handleJsonUpload,
    createNewCard,
    updateCardField,
  };
});
