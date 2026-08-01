import { defineStore } from 'pinia';
import { nextTick, ref, watch } from 'vue';
import { useToast } from '@/components/ui/useToast';
import { streamChat, chatSync } from '@/services/chat';
import i18n from '@/i18n';
import { useTranslatorStore } from './translator';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** 服务端校验后的可应用角色卡字段（assistant 消息可选） */
  fields?: Record<string, unknown> | null;
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
  const toast = useToast();
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

  /** 中断当前流式请求 */
  let streamAbort: AbortController | null = null;
  const stopStreaming = () => {
    if (streamAbort) { streamAbort.abort(); streamAbort = null; }
    isLoading.value = false;
  };

  /** 收集发送给模型的对话历史（排除占位 assistant 消息） */
  const buildHistory = (assistantId: string): { role: 'user' | 'assistant'; content: string }[] => {
    return messages.value
      .filter(m => m.role !== 'system' && m.id !== assistantId)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const translatorStore = useTranslatorStore();
    const settings = translatorStore.translationSettings;

    if (!settings.api_key) {
      toast.warning(i18n.global.t('notifications.apiKeyRequired'));
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

    // 创建占位 assistant 消息（流式追加）
    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      fields: null,
      timestamp: Date.now(),
    };
    messages.value.push(assistantMessage);

    isLoading.value = true;
    streamAbort = new AbortController();

    const requestParams = {
      messages: buildHistory(assistantMessage.id),
      settings: {
        api_key: settings.api_key,
        base_url: settings.base_url,
        model_name: settings.model_name,
        api_mode: settings.api_mode,
      },
      character_card: translatorStore.characterCard,
    };

    try {
      // 流式请求：文本增量实时追加，fields 由服务端校验后下发
      const streamResult = await streamChat(
        { ...requestParams, signal: streamAbort.signal },
        async (delta) => {
          assistantMessage.content += delta;
          // 确保每个增量都能先落到 DOM，再继续消费下一段流。
          await nextTick();
        }
      );
      assistantMessage.content = streamResult.reply || assistantMessage.content;
      assistantMessage.fields = streamResult.fields ?? null;

      // 流式返回为空时降级到 sync 端点
      if (!assistantMessage.content) {
        const fallback = await chatSync(requestParams);
        assistantMessage.content = fallback.reply;
        assistantMessage.fields = fallback.fields ?? null;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户主动中断，保留已收到的内容
      } else {
        const errorMessage = error.response?.data?.detail || error.message || i18n.global.t('aiChat.serviceError');
        toast.error(errorMessage);
        // 移除空的 assistant 消息和 user 消息
        if (!assistantMessage.content) {
          messages.value.pop(); // assistant
          messages.value.pop(); // user
        }
      }
    } finally {
      isLoading.value = false;
      streamAbort = null;
    }
  };

  const clearMessages = () => {
    messages.value = [];
  };

  /**
   * 将服务端校验后的字段对象转为可预览/可应用的字段列表。
   */
  const getApplyFieldsInfo = (fields: Record<string, any> | null | undefined): ApplyFieldInfo[] => {
    if (!fields || typeof fields !== 'object') return [];

    const fieldMap: Record<string, { path: string; label: string }> = {
      name:                       { path: 'data.name',                       label: i18n.global.t('aiChat.fields.name') },
      description:                { path: 'data.description',                label: i18n.global.t('aiChat.fields.description') },
      personality:                { path: 'data.personality',                label: i18n.global.t('aiChat.fields.personality') },
      scenario:                   { path: 'data.scenario',                   label: i18n.global.t('aiChat.fields.scenario') },
      first_mes:                  { path: 'data.first_mes',                  label: i18n.global.t('aiChat.fields.firstMessage') },
      mes_example:                { path: 'data.mes_example',                label: i18n.global.t('aiChat.fields.exampleMessages') },
      creator_notes:              { path: 'data.creator_notes',              label: i18n.global.t('aiChat.fields.creatorNotes') },
      system_prompt:              { path: 'data.system_prompt',              label: i18n.global.t('aiChat.fields.systemPrompt') },
      post_history_instructions:  { path: 'data.post_history_instructions',  label: i18n.global.t('aiChat.fields.postHistoryInstructions') },
    };

    const result: ApplyFieldInfo[] = [];

    for (const [key, meta] of Object.entries(fieldMap)) {
      const val = fields[key];
      if (val !== undefined && val !== null && val !== '') {
        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        result.push({
          key,
          path: meta.path,
          label: meta.label,
          value: val,
          preview: strVal.length > 60 ? strVal.slice(0, 60) + '...' : strVal,
        });
      }
    }

    // Handle tags
    if (Array.isArray(fields.tags) && fields.tags.length > 0) {
      result.push({
        key: 'tags',
        path: 'data.tags',
        label: i18n.global.t('aiChat.fields.tags'),
        value: fields.tags,
        preview: fields.tags.join(', '),
      });
    }

    // Handle alternate_greetings
    if (Array.isArray(fields.alternate_greetings) && fields.alternate_greetings.length > 0) {
      const greetings = fields.alternate_greetings.filter((g: any) => typeof g === 'string' && g.trim());
      if (greetings.length > 0) {
        const previewText = greetings.length === 1
          ? greetings[0]
          : i18n.global.t('aiChat.alternateGreetingsCount', { count: greetings.length });
        result.push({
          key: 'alternate_greetings',
          path: 'data.alternate_greetings',
          label: i18n.global.t('aiChat.fields.alternateGreetings'),
          value: greetings,
          preview: previewText.length > 60 ? previewText.slice(0, 60) + '...' : previewText,
        });
      }
    }

    return result;
  };

  /**
   * Apply selected fields to character card. Returns count of applied fields.
   */
  const applyToCard = (fields: Record<string, any>, selectedKeys?: string[]) => {
    const translatorStore = useTranslatorStore();
    if (!translatorStore.characterCard) {
      translatorStore.createNewCard();
    }

    const allFields = getApplyFieldsInfo(fields);
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
    stopStreaming,
    clearMessages,
    applyToCard,
    applySingleField,
    getApplyFieldsInfo,
  };
});
