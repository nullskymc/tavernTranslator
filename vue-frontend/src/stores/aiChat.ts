import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { useTranslatorStore } from './translator';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ApplyFieldInfo {
  key: string;
  path: string;
  label: string;
  value: any;
  preview: string; // truncated preview
}

const CHAT_STORAGE_KEY = 'aiChatMessages';
const CHAT_SIDEBAR_VISIBLE_KEY = 'aiChatSidebarVisible';

export const useAIChatStore = defineStore('aiChat', () => {
  // --- State ---
  const messages = ref<ChatMessage[]>([]);
  const isLoading = ref(false);
  const sidebarVisible = ref(false);

  // --- Actions ---
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const loadFromStorage = () => {
    const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedMessages) {
      try {
        messages.value = JSON.parse(savedMessages);
      } catch (e) {
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    }
    const savedVisible = localStorage.getItem(CHAT_SIDEBAR_VISIBLE_KEY);
    if (savedVisible) {
      sidebarVisible.value = savedVisible === 'true';
    }
  };

  const toggleSidebar = () => {
    sidebarVisible.value = !sidebarVisible.value;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const translatorStore = useTranslatorStore();
    const settings = translatorStore.translationSettings;

    if (!settings.api_key) {
      ElMessage.warning('请先在设置中提供您的 API Key');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    messages.value.push(userMessage);

    // Send to API
    isLoading.value = true;
    try {
      const response = await axios.post('/api/v1/character/ai-chat', {
        messages: messages.value
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content })),
        settings: {
          api_key: settings.api_key,
          base_url: settings.base_url,
          model_name: settings.model_name,
        },
        character_card: translatorStore.characterCard,
      });

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.data.reply,
        timestamp: Date.now(),
      };
      messages.value.push(assistantMessage);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'AI 对话服务出错';
      ElMessage.error(errorMessage);
      // Remove user message on error
      messages.value.pop();
    } finally {
      isLoading.value = false;
    }
  };

  const clearMessages = () => {
    messages.value = [];
  };

  /**
   * Parse JSON from AI response and return a list of field info for preview.
   */
  const getApplyFieldsInfo = (jsonContent: Record<string, any>): ApplyFieldInfo[] => {
    const fieldMap: Record<string, { path: string; label: string }> = {
      name:                       { path: 'data.name',                       label: 'Name / 名称' },
      description:                { path: 'data.description',                label: 'Description / 描述' },
      personality:                { path: 'data.personality',                label: 'Personality / 性格' },
      scenario:                   { path: 'data.scenario',                   label: 'Scenario / 场景' },
      first_mes:                  { path: 'data.first_mes',                  label: 'First Message / 第一条消息' },
      mes_example:                { path: 'data.mes_example',                label: 'Example Messages / 示例对话' },
      creator_notes:              { path: 'data.creator_notes',              label: 'Creator Notes / 创作者笔记' },
      system_prompt:              { path: 'data.system_prompt',              label: 'System Prompt / 系统提示' },
      post_history_instructions:  { path: 'data.post_history_instructions',  label: 'Post History / 历史指令' },
    };

    const fields: ApplyFieldInfo[] = [];

    for (const [key, meta] of Object.entries(fieldMap)) {
      const val = jsonContent[key];
      if (val !== undefined && val !== null && val !== '') {
        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        fields.push({
          key,
          path: meta.path,
          label: meta.label,
          value: val,
          preview: strVal.length > 60 ? strVal.slice(0, 60) + '...' : strVal,
        });
      }
    }

    // Handle tags
    if (jsonContent.tags && Array.isArray(jsonContent.tags)) {
      fields.push({
        key: 'tags',
        path: 'data.tags',
        label: 'Tags / 标签',
        value: jsonContent.tags,
        preview: jsonContent.tags.join(', '),
      });
    }

    // Handle alternate_greetings
    if (jsonContent.alternate_greetings && Array.isArray(jsonContent.alternate_greetings) && jsonContent.alternate_greetings.length > 0) {
      const greetings = jsonContent.alternate_greetings.filter((g: any) => typeof g === 'string' && g.trim());
      if (greetings.length > 0) {
        const previewText = greetings.length === 1
          ? greetings[0]
          : `${greetings.length} 条备用问候语`;
        fields.push({
          key: 'alternate_greetings',
          path: 'data.alternate_greetings',
          label: 'Alternate Greetings / 备用问候语',
          value: greetings,
          preview: previewText.length > 60 ? previewText.slice(0, 60) + '...' : previewText,
        });
      }
    }

    return fields;
  };

  /**
   * Apply selected fields to character card. Returns count of applied fields.
   */
  const applyToCard = (jsonContent: Record<string, any>, selectedKeys?: string[]) => {
    const translatorStore = useTranslatorStore();
    if (!translatorStore.characterCard) {
      translatorStore.createNewCard();
    }

    const allFields = getApplyFieldsInfo(jsonContent);
    const fieldsToApply = selectedKeys
      ? allFields.filter(f => selectedKeys.includes(f.key))
      : allFields;

    let appliedCount = 0;
    for (const field of fieldsToApply) {
      translatorStore.updateCardField(field.path, field.value);
      appliedCount++;
    }

    return appliedCount;
  };

  /**
   * Apply a single field to the card by key.
   */
  const applySingleField = (field: ApplyFieldInfo) => {
    const translatorStore = useTranslatorStore();
    if (!translatorStore.characterCard) {
      translatorStore.createNewCard();
    }
    translatorStore.updateCardField(field.path, field.value);
  };

  /**
   * Extract JSON blocks from AI response text.
   */
  const extractJsonFromResponse = (text: string): Record<string, any> | null => {
    // Try to find JSON block in markdown code fence
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e) {
        // Not valid JSON
      }
    }

    // Try to parse the whole text as JSON
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      // Not valid JSON
    }

    return null;
  };

  // --- Watchers ---
  watch(messages, (val) => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(val));
  }, { deep: true });

  watch(sidebarVisible, (val) => {
    localStorage.setItem(CHAT_SIDEBAR_VISIBLE_KEY, String(val));
  });

  // --- Initial Load ---
  loadFromStorage();

  return {
    messages,
    isLoading,
    sidebarVisible,
    toggleSidebar,
    sendMessage,
    clearMessages,
    applyToCard,
    applySingleField,
    getApplyFieldsInfo,
    extractJsonFromResponse,
  };
});
