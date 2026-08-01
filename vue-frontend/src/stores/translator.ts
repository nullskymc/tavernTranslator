import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useToast } from '@/components/ui/useToast';
import { useConfirm } from '@/components/ui/useConfirm';
import { getCardField, setCardField } from '@/utils/card-path';
import type { CharacterCard, TranslationSettings, GlossaryEntry } from '@/types';
import { useGlossaryStore } from './glossary';
import i18n from '@/i18n';
import {
  uploadCharacterCard as apiUpload,
  translateField as apiTranslate,
  batchTranslate as apiBatchTranslate,
  exportCardAsImage as apiExportImage,
} from '@/services/api';

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



export const defaultPromptsJa = {
  base_template: `あなたはプロの翻訳者です。翻訳の際は以下の要件に従ってください：
1. 特殊な書式（数字、記号、絵文字など）を維持する
2. 訳文が自然で読みやすいものにする
3. 原文の感情や語気を保つ
4. 小説的な翻訳スタイルを採用する
5. 原文の意味を正確に理解する
6. 内容テキストのみを翻訳する
7. 翻訳結果のみを出力する
8. キャラクター名などの識別情報を保持する
9. リンクは翻訳・置換せず、元のリンクを保持する`,
  description_template: `あなたはプロのキャラクター設定翻訳者です。キャラクター説明を翻訳する際は以下の要件に従ってください：
1. 角括弧[]内の書式マーカーを維持する
2. プラス記号+で連結された属性リストを保持する
3. キャラクターの特徴を正確に伝える
4. 説明の詳細を完全に保持する
5. 説明テキストのみを翻訳する
6. キャラクター名や{{char}}などのプレースホルダーを保持する
7. 訳文が自然で読みやすいものにする
8. リンクは翻訳・置換せず、元のリンクを保持する`,
  dialogue_template: `あなたはプロの会話翻訳者です。会話を翻訳する際は以下の要件に従ってください：
1. 会話が自然に流れるようにする
2. 原文の感情と語気を伝える
3. 会話のマーカーや書式を保持する
4. 日常的な表現を採用する
5. キャラクターの性格特徴を保つ
6. キャラクター名やプレースホルダーを保持する
7. 心理描写を正確に翻訳する
8. 会話の一貫性を保つ
9. リンクは翻訳・置換せず、元のリンクを保持する`,
};

/** 按提示词语言返回对应默认提示词（zh/en/ja，未知值回退中文） */
export const getDefaultPrompts = (lang: string | undefined) => {
  if (lang === 'en') return { ...defaultPromptsEn }
  if (lang === 'ja') return { ...defaultPromptsJa }
  return { ...defaultPromptsZh }
}

export const useTranslatorStore = defineStore('translator', () => {
  // --- State ---
  const characterCard = ref<CharacterCard | null>(null);
  const characterImageB64 = ref<string | null>(null);
  const isLoading = ref(false);
  const toast = useToast();
  const { confirm } = useConfirm();
  const translationSettings = ref<TranslationSettings>({
    api_key: '',
    base_url: 'https://api.openai.com',
    model_name: 'gpt-4-1106-preview',
    api_mode: 'chat',
    prompt_language: 'zh',
    prompts: { ...defaultPromptsZh },
  });

  // --- Glossary Store (委托) ---
  const glossaryStore = useGlossaryStore();

  // 向外暴露 glossaryEntries 以兼容旧组件引用
  const glossaryEntries = glossaryStore.entries;

  // --- Actions ---
  const loadFromStorage = () => {
    const savedCard = localStorage.getItem(CARD_STORAGE_KEY);
    if (savedCard) try { characterCard.value = JSON.parse(savedCard); } catch { localStorage.removeItem(CARD_STORAGE_KEY); }

    const savedImg = localStorage.getItem(IMAGE_STORAGE_KEY);
    if (savedImg) characterImageB64.value = savedImg;

    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) try {
      const parsedSettings = JSON.parse(savedSettings);
      Object.assign(translationSettings.value, parsedSettings);
      if (parsedSettings.api_mode !== 'chat' && parsedSettings.api_mode !== 'responses') {
        translationSettings.value.api_mode = 'chat';
      }
      if (!parsedSettings.prompts) {
        translationSettings.value.prompts = getDefaultPrompts(parsedSettings.prompt_language);
      }
    } catch {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  };

  // --- Glossary 委托方法（保持向后兼容） ---
  const addGlossaryEntry = (entry: Omit<GlossaryEntry, 'id'>) => glossaryStore.addEntry(entry);
  const removeGlossaryEntry = (id: string) => glossaryStore.removeEntry(id);
  const updateGlossaryEntry = (id: string, updates: Partial<GlossaryEntry>) => glossaryStore.updateEntry(id, updates);
  const clearGlossary = () => glossaryStore.clear();
  const importGlossary = (entries: GlossaryEntry[]) => glossaryStore.importEntries(entries);
  const exportGlossary = () => glossaryStore.exportEntries();
  const buildGlossaryPromptText = () => glossaryStore.buildPromptText();

  const _getSettingsPayload = () => ({
    api_key: translationSettings.value.api_key,
    base_url: translationSettings.value.base_url,
    model_name: translationSettings.value.model_name,
    api_mode: translationSettings.value.api_mode,
  });

  const handleCardUpload = async (file: File) => {
    isLoading.value = true;
    try {
      const data = await apiUpload(file);
      characterCard.value = data.character_data as unknown as CharacterCard;
      characterImageB64.value = data.image_b64;
      toast.success(i18n.global.t('notifications.uploadSuccess'));
    } catch (error: any) {
      toast.error(`${i18n.global.t('notifications.uploadFailed')}：${error.message || i18n.global.t('notifications.cardParseFailed')}`);
    } finally {
      isLoading.value = false;
    }
  };

  const updateBaseImage = (base64String: string) => {
    characterImageB64.value = base64String;
    toast.success(i18n.global.t('notifications.imageUpdated'));
  };

  const translateField = async (path: string) => {
    if (!characterCard.value) return;
    const textToTranslate = getCardField(characterCard.value, path);
    if (!textToTranslate || typeof textToTranslate !== 'string' || !textToTranslate.trim()) return;
    if (!translationSettings.value.api_key) {
      toast.warning(i18n.global.t('notifications.apiKeyRequired'));
      return;
    }
    const fieldName = path.split('.').pop()!;
    isLoading.value = true;
    try {
      const data = await apiTranslate({
        text: textToTranslate,
        field_name: fieldName,
        settings: _getSettingsPayload(),
        prompts: translationSettings.value.prompts,
        glossary: buildGlossaryPromptText(),
      });
      setCardField(characterCard.value, path, data.translated_text);
      toast.success(i18n.global.t('notifications.fieldTranslated', { field: fieldName }));
    } catch (error: any) {
      toast.error(`${i18n.global.t('notifications.translationFailed')}：${error.message || i18n.global.t('notifications.translationServiceError')}`);
    } finally {
      isLoading.value = false;
    }
  };

  const batchTranslate = async () => {
    if (!characterCard.value) return;
    if (!translationSettings.value.api_key) {
      toast.warning(i18n.global.t('notifications.apiKeyRequired'));
      return;
    }

    // 收集所有需要翻译的字段
    const fieldsToTranslate: { field_name: string; text: string }[] = [];

    const mainFields = [
      'data.description', 'data.personality', 'data.scenario',
      'data.first_mes', 'data.mes_example', 'data.creator_notes',
    ];

    for (const field of mainFields) {
      const text = getCardField(characterCard.value, field);
      if (text && typeof text === 'string' && text.trim()) {
        fieldsToTranslate.push({ field_name: field.split('.').pop() || field, text });
      }
    }

    const greetings = getCardField(characterCard.value, 'data.alternate_greetings') ?? [] as string[];
    if (Array.isArray(greetings)) {
      for (let i = 0; i < greetings.length; i++) {
        const greeting = greetings[i] as string;
        if (greeting && typeof greeting === 'string' && greeting.trim()) {
          fieldsToTranslate.push({ field_name: `alternate_greetings[${i}]`, text: greeting });
        }
      }
    }

    const characterBook = getCardField(characterCard.value, 'data.character_book');
    if (characterBook && typeof characterBook === 'object') {
      const bookDescription = getCardField(characterBook, 'description');
      if (bookDescription && typeof bookDescription === 'string' && bookDescription.trim()) {
        fieldsToTranslate.push({ field_name: 'character_book.description', text: bookDescription });
      }
      const lore = getCardField(characterBook, 'lore') ?? [];
      if (Array.isArray(lore)) {
        for (let i = 0; i < lore.length; i++) {
          const loreItem = lore[i];
          if (loreItem?.content && typeof loreItem.content === 'string' && loreItem.content.trim()) {
            fieldsToTranslate.push({ field_name: `character_book.lore[${i}].content`, text: loreItem.content });
          }
        }
      }
    }

    if (fieldsToTranslate.length === 0) {
      toast.info(i18n.global.t('notifications.noFieldsToTranslate'));
      return;
    }

    isLoading.value = true;

    const notificationId = toast.info(
      `${i18n.global.t('notifications.batchTranslating')}：${i18n.global.t('notifications.translatingFields', { count: fieldsToTranslate.length })}`,
      0
    );

    try {
      const data = await apiBatchTranslate({
        fields: fieldsToTranslate,
        settings: _getSettingsPayload(),
        prompts: translationSettings.value.prompts,
        glossary: buildGlossaryPromptText(),
      });

      let successCount = 0;
      let completedCount = 0;

      for (const result of data.results) {
        if (result.success) {
          const path = `data.${result.field_name}`;
          setCardField(characterCard.value, path, result.translated_text);
          successCount++;
        }
        completedCount++;
      }

      toast.close(notificationId);
      toast.success(`${i18n.global.t('notifications.batchTranslateCompleted')}：${i18n.global.t('notifications.fieldsTranslated', { success: successCount, total: fieldsToTranslate.length })}`);
    } catch (error: any) {
      toast.close(notificationId);
      toast.error(`${i18n.global.t('notifications.batchTranslateFailed')}：${error.message || i18n.global.t('notifications.batchTranslationServiceError')}`, 0);
    } finally {
      isLoading.value = false;
    }
  };

  const exportCardAsImage = async () => {
    if (!characterCard.value || !characterImageB64.value) {
      toast.error(i18n.global.t('notifications.missingCardImage'));
      return;
    }
    isLoading.value = true;
    try {
      const imageBlob = base64ToBlob(characterImageB64.value, 'image/png');
      const blob = await apiExportImage({
        json_data: JSON.stringify(characterCard.value),
        image_blob: imageBlob,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${getCardField(characterCard.value, 'data.name') ?? 'character'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(i18n.global.t('notifications.imageExportSuccess'));
    } catch (error: any) {
      toast.error(`${i18n.global.t('notifications.exportFailed')}：${error.message || i18n.global.t('notifications.imageExportError')}`);
    } finally {
      isLoading.value = false;
    }
  };

  const resetStore = () => {
    characterCard.value = null;
    characterImageB64.value = null;
    localStorage.removeItem(CARD_STORAGE_KEY);
    localStorage.removeItem(IMAGE_STORAGE_KEY);
    toast.info(i18n.global.t('notifications.cardCleared'));
  };

  const exportCardAsJson = () => {
    if (!characterCard.value) {
      toast.error(i18n.global.t('notifications.missingCard'));
      return;
    }
    try {
      const jsonString = JSON.stringify(characterCard.value, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${getCardField(characterCard.value, 'data.name') ?? 'character'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(i18n.global.t('notifications.jsonExportSuccess'));
    } catch {
      toast.error(`${i18n.global.t('notifications.exportFailed')}：${i18n.global.t('notifications.jsonExportFailed')}`);
    }
  };

  const handleJsonUpload = async (file: File) => {
    const confirmed = await confirm({
      title: i18n.global.t('notifications.confirmUpload'),
      message: i18n.global.t('notifications.uploadJsonConfirm'),
      confirmText: i18n.global.t('messages.confirm.confirm'),
      cancelText: i18n.global.t('messages.confirm.cancel'),
    });
    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const jsonData = JSON.parse(e.target!.result as string);
        characterCard.value = jsonData;
        characterImageB64.value = null;
        toast.success(i18n.global.t('notifications.jsonParseSuccess'));
      } catch {
        toast.error(i18n.global.t('notifications.jsonParseFailed'));
      }
    };
    reader.onerror = () => {
      toast.error(i18n.global.t('notifications.jsonReadFailed'));
    };
    reader.readAsText(file);
  };

  const updateCardField = (path: string, value: any) => {
    if (!characterCard.value) return;
    setCardField(characterCard.value, path, value);
  };

  const createNewCard = () => {
    characterCard.value = {
      data: {
        name: i18n.global.t('editor.newCharacter'),
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',
        creator_notes: '',
        system_prompt: '',
        post_history_instructions: '',
        tags: [],
        alternate_greetings: [],
        character_book: {
          name: '',
          description: '',
          scan_depth: 0,
          token_budget: 0,
          recursive_scanning: false,
          extensions: {},
          lore: [],
        },
        extensions: {},
        spec: 'chara_card_v2',
        spec_version: '2.0',
      },
      last_update: Date.now(),
      last_update_human: new Date().toLocaleString(),
    } as CharacterCard;
    characterImageB64.value = null;
    toast.success(i18n.global.t('notifications.blankCardCreated'));
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
    glossaryEntries,
    handleCardUpload,
    updateBaseImage,
    translateField,
    batchTranslate,
    exportCardAsImage,
    resetStore,
    exportCardAsJson,
    handleJsonUpload,
    createNewCard,
    updateCardField,
    addGlossaryEntry,
    removeGlossaryEntry,
    updateGlossaryEntry,
    clearGlossary,
    importGlossary,
    exportGlossary,
    buildGlossaryPromptText,
  };
});
