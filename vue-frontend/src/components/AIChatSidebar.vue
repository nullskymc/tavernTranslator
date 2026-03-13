<template>
  <div class="ai-chat-sidebar" :class="{ 'is-visible': visible }">
    <!-- Header -->
    <div class="chat-header">
      <div class="chat-header-left">
        <el-icon class="chat-icon"><ChatDotRound /></el-icon>
        <h3>{{ $t('aiChat.title') }}</h3>
      </div>
      <div class="chat-header-actions">
        <el-tooltip :content="$t('aiChat.clearChat')" placement="bottom">
          <button class="header-btn" @click="handleClear" :disabled="chatStore.messages.length === 0">
            <el-icon><Delete /></el-icon>
          </button>
        </el-tooltip>
        <button class="header-btn close-btn" @click="$emit('close')">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </div>

    <!-- Messages area -->
    <div class="chat-messages" ref="messagesContainer">
      <!-- Welcome message when empty -->
      <div v-if="chatStore.messages.length === 0" class="chat-welcome">
        <div class="welcome-icon">
          <el-icon :size="32"><MagicStick /></el-icon>
        </div>
        <h4>{{ $t('aiChat.welcome.title') }}</h4>
        <p>{{ $t('aiChat.welcome.subtitle') }}</p>
        <div class="quick-prompts">
          <button
            v-for="(prompt, index) in quickPrompts"
            :key="index"
            class="quick-prompt-btn"
            @click="sendQuickPrompt(prompt.text)"
          >
            <el-icon><prompt.icon /></el-icon>
            <span>{{ prompt.label }}</span>
          </button>
        </div>
      </div>

      <!-- Chat messages -->
      <div
        v-for="message in chatStore.messages"
        :key="message.id"
        class="chat-message"
        :class="`chat-message--${message.role}`"
      >
        <div class="message-avatar">
          <el-icon v-if="message.role === 'user'"><User /></el-icon>
          <el-icon v-else><MagicStick /></el-icon>
        </div>
        <div class="message-body">
          <div class="message-content" v-html="renderMarkdown(message.content)"></div>

          <!-- ===== Enhanced Apply-to-Card Panel ===== -->
          <div
            v-if="message.role === 'assistant' && hasJsonContent(message.content)"
            class="apply-panel"
            :class="{ 'apply-panel--expanded': expandedPanelId === message.id }"
          >
            <!-- Collapsed: trigger button -->
            <button
              v-if="expandedPanelId !== message.id && !appliedMessageIds.has(message.id)"
              class="apply-trigger-btn"
              @click="expandPanel(message)"
            >
              <span class="apply-trigger-icon">
                <el-icon><DocumentChecked /></el-icon>
              </span>
              <span class="apply-trigger-text">{{ $t('aiChat.applyToCard') }}</span>
              <span class="apply-trigger-arrow">
                <el-icon><ArrowDown /></el-icon>
              </span>
            </button>

            <!-- Already applied badge -->
            <div v-if="appliedMessageIds.has(message.id) && expandedPanelId !== message.id" class="applied-badge">
              <span class="applied-badge-icon">
                <el-icon><CircleCheckFilled /></el-icon>
              </span>
              <span>{{ $t('aiChat.alreadyApplied') }}</span>
            </div>

            <!-- Expanded: field preview list -->
            <Transition name="panel-expand">
              <div v-if="expandedPanelId === message.id" class="apply-fields-panel">
                <div class="apply-fields-header">
                  <span class="apply-fields-title">{{ $t('aiChat.selectFields') }}</span>
                  <button class="apply-fields-close" @click="collapsePanel">
                    <el-icon><ArrowUp /></el-icon>
                  </button>
                </div>

                <!-- Field list -->
                <div class="apply-fields-list">
                  <label
                    v-for="(field, idx) in currentFields"
                    :key="field.key"
                    class="apply-field-row"
                    :class="{
                      'apply-field-row--applied': appliedFieldKeys.has(field.key),
                      'apply-field-row--applying': applyingFieldKey === field.key,
                    }"
                    :style="{ transitionDelay: `${idx * 0.04}s` }"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedFieldKeys.has(field.key)"
                      :disabled="isApplying"
                      @change="toggleFieldSelection(field.key)"
                      class="apply-field-checkbox"
                    />
                    <div class="apply-field-info">
                      <span class="apply-field-label">{{ field.label }}</span>
                      <span class="apply-field-preview">{{ field.preview }}</span>
                    </div>
                    <!-- Per-field status icon -->
                    <Transition name="field-check">
                      <span v-if="appliedFieldKeys.has(field.key)" class="apply-field-check">
                        <el-icon><CircleCheckFilled /></el-icon>
                      </span>
                    </Transition>
                  </label>
                </div>

                <!-- Progress bar -->
                <Transition name="fade">
                  <div v-if="isApplying" class="apply-progress">
                    <div class="apply-progress-bar">
                      <div
                        class="apply-progress-fill"
                        :style="{ width: `${applyProgress}%` }"
                      ></div>
                    </div>
                    <span class="apply-progress-text">
                      {{ appliedFieldKeys.size }} / {{ selectedFieldKeys.size }}
                    </span>
                  </div>
                </Transition>

                <!-- Action buttons -->
                <div class="apply-fields-actions">
                  <button class="apply-select-all-btn" @click="toggleSelectAll" :disabled="isApplying">
                    {{ isAllSelected ? $t('aiChat.deselectAll') : $t('aiChat.selectAll') }}
                  </button>
                  <button
                    class="apply-confirm-btn"
                    :class="{ 'apply-confirm-btn--applying': isApplying }"
                    :disabled="selectedFieldKeys.size === 0 || isApplying"
                    @click="handleAnimatedApply(message)"
                  >
                    <span v-if="!isApplying" class="apply-confirm-content">
                      <el-icon><Check /></el-icon>
                      {{ $t('aiChat.applySelected') }} ({{ selectedFieldKeys.size }})
                    </span>
                    <span v-else class="apply-confirm-content">
                      <span class="apply-spinner"></span>
                      {{ $t('aiChat.applying') }}
                    </span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="chatStore.isLoading" class="chat-message chat-message--assistant">
        <div class="message-avatar">
          <el-icon><MagicStick /></el-icon>
        </div>
        <div class="message-body">
          <div class="message-content loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="chat-input-area">
      <div class="input-wrapper">
        <el-input
          v-model="inputText"
          type="textarea"
          :placeholder="$t('aiChat.inputPlaceholder')"
          :rows="1"
          :autosize="{ minRows: 1, maxRows: 4 }"
          :disabled="chatStore.isLoading"
          @keydown="handleKeydown"
          ref="inputRef"
        />
        <button
          class="send-btn"
          :disabled="!inputText.trim() || chatStore.isLoading"
          @click="handleSend"
        >
          <el-icon><Promotion /></el-icon>
        </button>
      </div>
    </div>

    <!-- ===== Success Celebration Overlay ===== -->
    <Transition name="celebration">
      <div v-if="showCelebration" class="celebration-overlay" @click="dismissCelebration">
        <!-- Particles -->
        <div class="celebration-particles">
          <span
            v-for="i in 24"
            :key="i"
            class="particle"
            :style="particleStyle(i)"
          ></span>
        </div>
        <!-- Center content -->
        <div class="celebration-content">
          <div class="celebration-check">
            <svg viewBox="0 0 52 52" class="celebration-check-svg">
              <circle class="celebration-check-circle" cx="26" cy="26" r="24" />
              <path class="celebration-check-path" d="M14 27l8 8 16-16" />
            </svg>
          </div>
          <h3 class="celebration-title">{{ $t('aiChat.applySuccess') }}</h3>
          <p class="celebration-subtitle">
            {{ $t('aiChat.appliedFields', { count: lastAppliedCount }) }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, watch, computed } from 'vue';
import { useAIChatStore, type ApplyFieldInfo, type ChatMessage } from '@/stores/aiChat';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import {
  ChatDotRound,
  Close,
  Delete,
  MagicStick,
  User,
  Promotion,
  DocumentChecked,
  Edit,
  Star,
  ChatLineSquare,
  Notebook,
  ArrowDown,
  ArrowUp,
  Check,
  CircleCheckFilled,
} from '@element-plus/icons-vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['close']);
const chatStore = useAIChatStore();
const { t: $t } = useI18n();

const inputText = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = ref<any>(null);

// --- Apply animation state ---
const expandedPanelId = ref<string | null>(null);
const currentFields = ref<ApplyFieldInfo[]>([]);
const selectedFieldKeys = reactive(new Set<string>());
const appliedFieldKeys = reactive(new Set<string>());
const appliedMessageIds = reactive(new Set<string>());
const applyingFieldKey = ref<string | null>(null);
const isApplying = ref(false);
const showCelebration = ref(false);
const lastAppliedCount = ref(0);

const applyProgress = computed(() => {
  if (selectedFieldKeys.size === 0) return 0;
  return Math.round((appliedFieldKeys.size / selectedFieldKeys.size) * 100);
});

const isAllSelected = computed(() => {
  return currentFields.value.length > 0 && selectedFieldKeys.size === currentFields.value.length;
});

// Quick prompt suggestions
const quickPrompts = computed(() => [
  {
    icon: Star,
    label: $t('aiChat.quickPrompts.createCharacter'),
    text: $t('aiChat.quickPrompts.createCharacterPrompt'),
  },
  {
    icon: Edit,
    label: $t('aiChat.quickPrompts.improveDescription'),
    text: $t('aiChat.quickPrompts.improveDescriptionPrompt'),
  },
  {
    icon: ChatLineSquare,
    label: $t('aiChat.quickPrompts.generateDialogue'),
    text: $t('aiChat.quickPrompts.generateDialoguePrompt'),
  },
  {
    icon: Notebook,
    label: $t('aiChat.quickPrompts.writeScenario'),
    text: $t('aiChat.quickPrompts.writeScenarioPrompt'),
  },
]);

// --- Panel expand / collapse ---
const expandPanel = (message: ChatMessage) => {
  const json = chatStore.extractJsonFromResponse(message.content);
  if (!json) return;

  const fields = chatStore.getApplyFieldsInfo(json);
  currentFields.value = fields;
  selectedFieldKeys.clear();
  appliedFieldKeys.clear();
  applyingFieldKey.value = null;
  fields.forEach(f => selectedFieldKeys.add(f.key));
  expandedPanelId.value = message.id;
};

const collapsePanel = () => {
  expandedPanelId.value = null;
  currentFields.value = [];
  selectedFieldKeys.clear();
  appliedFieldKeys.clear();
  applyingFieldKey.value = null;
  isApplying.value = false;
};

const toggleFieldSelection = (key: string) => {
  if (selectedFieldKeys.has(key)) {
    selectedFieldKeys.delete(key);
  } else {
    selectedFieldKeys.add(key);
  }
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedFieldKeys.clear();
  } else {
    currentFields.value.forEach(f => selectedFieldKeys.add(f.key));
  }
};

// --- Animated apply ---
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const handleAnimatedApply = async (message: ChatMessage) => {
  if (isApplying.value || selectedFieldKeys.size === 0) return;
  isApplying.value = true;
  appliedFieldKeys.clear();

  const fieldsToApply = currentFields.value.filter(f => selectedFieldKeys.has(f.key));

  // Staggered per-field apply
  for (const field of fieldsToApply) {
    applyingFieldKey.value = field.key;
    await sleep(180); // brief pause for visual stagger
    chatStore.applySingleField(field);
    appliedFieldKeys.add(field.key);
    applyingFieldKey.value = null;
    await sleep(120); // brief pause to see checkmark appear
  }

  lastAppliedCount.value = fieldsToApply.length;
  appliedMessageIds.add(message.id);

  // small pause then show celebration
  await sleep(300);
  isApplying.value = false;
  expandedPanelId.value = null;
  showCelebration.value = true;

  // auto dismiss after 2s
  await sleep(2000);
  showCelebration.value = false;
};

const dismissCelebration = () => {
  showCelebration.value = false;
};

// --- Particle positions for celebration ---
const particleStyle = (i: number) => {
  const angle = (i / 24) * 360;
  const distance = 60 + Math.random() * 80;
  const size = 4 + Math.random() * 6;
  const duration = 0.6 + Math.random() * 0.5;
  const delay = Math.random() * 0.3;
  const hue = Math.round(Math.random() * 360);
  return {
    '--angle': `${angle}deg`,
    '--distance': `${distance}px`,
    '--size': `${size}px`,
    '--duration': `${duration}s`,
    '--delay': `${delay}s`,
    '--hue': hue,
    backgroundColor: `hsl(${hue}, 80%, 60%)`,
  } as Record<string, string>;
};

// --- Basic chat functions ---
const handleSend = async () => {
  if (!inputText.value.trim() || chatStore.isLoading) return;
  const text = inputText.value;
  inputText.value = '';
  await chatStore.sendMessage(text);
  scrollToBottom();
};

const sendQuickPrompt = async (text: string) => {
  await chatStore.sendMessage(text);
  scrollToBottom();
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleClear = () => {
  ElMessageBox.confirm(
    $t('aiChat.clearConfirm'),
    $t('messages.confirm.title'),
    {
      confirmButtonText: $t('messages.confirm.confirm'),
      cancelButtonText: $t('messages.confirm.cancel'),
      type: 'warning',
    }
  ).then(() => {
    chatStore.clearMessages();
    appliedMessageIds.clear();
  }).catch(() => {});
};

const hasJsonContent = (content: string): boolean => {
  return chatStore.extractJsonFromResponse(content) !== null;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// Simple markdown renderer
const renderMarkdown = (text: string): string => {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  return html;
};

watch(() => chatStore.messages.length, () => {
  scrollToBottom();
});

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      inputRef.value?.focus?.();
    });
  }
});
</script>

<style scoped>
/* ================================
   Sidebar container
   ================================ */
.ai-chat-sidebar {
  width: 380px;
  min-width: 320px;
  max-width: 420px;
  height: 100vh;
  background-color: var(--apple-bg-color);
  border-left: 1px solid var(--apple-border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: width 0.2s ease;
}

/* ================================
   Header
   ================================ */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--apple-border-color);
  flex-shrink: 0;
}
.chat-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chat-icon {
  font-size: 18px;
  color: var(--apple-color-primary);
}
.chat-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--apple-text-color-primary);
}
.chat-header-actions {
  display: flex;
  gap: 4px;
}
.header-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--apple-border-radius-medium);
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--apple-text-color-secondary);
  font-size: 14px;
  transition: all var(--apple-transition-duration) var(--apple-transition-easing);
}
.header-btn:hover {
  background-color: var(--apple-color-gray-5);
  color: var(--apple-text-color-primary);
}
.header-btn:disabled {
  color: var(--apple-text-color-tertiary);
  cursor: not-allowed;
}
.header-btn:disabled:hover {
  background: transparent;
}

/* ================================
   Messages area
   ================================ */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scrollbar-width: thin;
  scrollbar-color: var(--apple-color-gray-4) transparent;
}
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background-color: var(--apple-color-gray-4); border-radius: 2px; }

/* ================================
   Welcome state
   ================================ */
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 20px;
}
.welcome-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--apple-border-radius-large);
  background: var(--apple-color-primary-alpha);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: var(--apple-color-primary);
}
.chat-welcome h4 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--apple-text-color-primary);
}
.chat-welcome p {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--apple-text-color-secondary);
  line-height: 1.5;
}
.quick-prompts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.quick-prompt-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--apple-border-radius-medium);
  border: 1px solid var(--apple-border-color);
  background: var(--apple-bg-color);
  cursor: pointer;
  color: var(--apple-text-color-primary);
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  transition: all var(--apple-transition-duration) var(--apple-transition-easing);
}
.quick-prompt-btn:hover {
  border-color: var(--apple-color-primary);
  background-color: var(--apple-color-primary-alpha);
}
.quick-prompt-btn .el-icon {
  color: var(--apple-color-primary);
  font-size: 16px;
  flex-shrink: 0;
}

/* ================================
   Chat messages
   ================================ */
.chat-message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--apple-border-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}
.chat-message--user .message-avatar {
  background-color: var(--apple-color-primary);
  color: white;
}
.chat-message--assistant .message-avatar {
  background-color: var(--apple-color-gray-5);
  color: var(--apple-text-color-secondary);
}
.message-body {
  flex: 1;
  min-width: 0;
}
.message-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--apple-text-color-primary);
  word-break: break-word;
}
.message-content :deep(pre) {
  background-color: var(--apple-color-gray-6);
  border: 1px solid var(--apple-border-color);
  border-radius: var(--apple-border-radius-medium);
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  margin: 8px 0;
}
.message-content :deep(code) {
  background-color: var(--apple-color-gray-5);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Courier New', monospace;
}
.message-content :deep(pre code) {
  background: none;
  padding: 0;
}
.message-content :deep(strong) {
  font-weight: 600;
}

/* ================================
   Apply Panel  (the new animated panel)
   ================================ */
.apply-panel {
  margin-top: 10px;
}

/* -- Trigger button (collapsed state) -- */
.apply-trigger-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border-radius: var(--apple-border-radius-medium);
  border: 1px solid var(--apple-color-primary);
  background: linear-gradient(135deg, var(--apple-color-primary-alpha), transparent);
  cursor: pointer;
  color: var(--apple-color-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.apply-trigger-btn:hover {
  background: linear-gradient(135deg, var(--apple-color-primary-alpha), var(--apple-color-primary-alpha));
  box-shadow: 0 2px 12px rgba(16, 163, 127, 0.18);
  transform: translateY(-1px);
}
.apply-trigger-btn:active {
  transform: translateY(0);
}
.apply-trigger-icon {
  display: flex;
  font-size: 16px;
}
.apply-trigger-text {
  flex: 1;
  text-align: left;
}
.apply-trigger-arrow {
  display: flex;
  font-size: 12px;
  opacity: 0.6;
  transition: transform 0.2s ease;
}
.apply-trigger-btn:hover .apply-trigger-arrow {
  transform: translateY(2px);
}

/* -- Already-applied badge -- */
.applied-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--apple-border-radius-medium);
  background-color: var(--apple-color-primary-alpha);
  color: var(--apple-color-primary);
  font-size: 12px;
  font-weight: 500;
}
.applied-badge-icon {
  display: flex;
  font-size: 15px;
}

/* -- Panel expand transition -- */
.panel-expand-enter-active {
  animation: panelSlideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.panel-expand-leave-active {
  animation: panelSlideDown 0.2s ease reverse;
}
@keyframes panelSlideDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-8px) scaleY(0.95);
  }
  to {
    opacity: 1;
    max-height: 600px;
    transform: translateY(0) scaleY(1);
  }
}

/* -- Expanded field panel -- */
.apply-fields-panel {
  border: 1px solid var(--apple-border-color);
  border-radius: var(--apple-border-radius-large);
  background-color: var(--apple-bg-color-secondary);
  overflow: hidden;
}
.apply-fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--apple-border-color);
}
.apply-fields-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--apple-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.apply-fields-close {
  width: 24px;
  height: 24px;
  border-radius: var(--apple-border-radius-small);
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--apple-text-color-tertiary);
  font-size: 13px;
  transition: all 0.15s ease;
}
.apply-fields-close:hover {
  background-color: var(--apple-color-gray-5);
  color: var(--apple-text-color-primary);
}

/* -- Field rows -- */
.apply-fields-list {
  max-height: 260px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.apply-field-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.25s ease, opacity 0.25s ease;
  position: relative;
  opacity: 1;
}
.apply-field-row:hover {
  background-color: var(--apple-color-gray-5);
}
.apply-field-row--applying {
  background-color: var(--apple-color-primary-alpha) !important;
}
.apply-field-row--applied {
  background-color: transparent;
}

/* -- Checkbox -- */
.apply-field-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--apple-color-gray-3);
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 2px;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
  background-color: var(--apple-bg-color);
}
.apply-field-checkbox:checked {
  background-color: var(--apple-color-primary);
  border-color: var(--apple-color-primary);
}
.apply-field-checkbox:checked::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 4.5px;
  width: 5px;
  height: 8px;
  border: solid white;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}
.apply-field-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* -- Field info -- */
.apply-field-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.apply-field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--apple-text-color-primary);
  line-height: 1.3;
}
.apply-field-preview {
  font-size: 11px;
  color: var(--apple-text-color-tertiary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* -- Per-field check animation -- */
.apply-field-check {
  color: var(--apple-color-primary);
  font-size: 17px;
  flex-shrink: 0;
  display: flex;
}
.field-check-enter-active {
  animation: fieldCheckPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes fieldCheckPop {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); }
}

/* -- Progress bar -- */
.apply-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 8px;
}
.apply-progress-bar {
  flex: 1;
  height: 4px;
  background-color: var(--apple-color-gray-4);
  border-radius: 2px;
  overflow: hidden;
}
.apply-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--apple-color-primary), var(--apple-color-primary-light));
  border-radius: 2px;
  transition: width 0.25s ease;
}
.apply-progress-text {
  font-size: 11px;
  color: var(--apple-text-color-tertiary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* -- Action buttons -- */
.apply-fields-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--apple-border-color);
}
.apply-select-all-btn {
  padding: 5px 10px;
  border-radius: var(--apple-border-radius-small);
  border: 1px solid var(--apple-border-color);
  background: var(--apple-bg-color);
  cursor: pointer;
  color: var(--apple-text-color-secondary);
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.apply-select-all-btn:hover {
  border-color: var(--apple-border-color-strong);
  color: var(--apple-text-color-primary);
}
.apply-select-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.apply-confirm-btn {
  flex: 1;
  padding: 7px 14px;
  border-radius: var(--apple-border-radius-medium);
  border: none;
  background-color: var(--apple-color-primary);
  color: white;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.apply-confirm-btn:hover:not(:disabled) {
  background-color: var(--apple-color-primary-dark);
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.3);
}
.apply-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.apply-confirm-btn--applying {
  background: linear-gradient(90deg, var(--apple-color-primary), var(--apple-color-primary-light));
  background-size: 200% 100%;
  animation: applyShimmer 1.5s ease infinite;
}
@keyframes applyShimmer {
  0% { background-position: 0% 0%; }
  50% { background-position: 100% 0%; }
  100% { background-position: 0% 0%; }
}
.apply-confirm-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* -- Spinner -- */
.apply-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ================================
   Celebration Overlay
   ================================ */
.celebration-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* celebration transition */
.celebration-enter-active {
  animation: celebrationIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.celebration-leave-active {
  animation: celebrationOut 0.25s ease forwards;
}
@keyframes celebrationIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes celebrationOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* -- Particles -- */
.celebration-particles {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
}
.particle {
  position: absolute;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  animation: particleBurst var(--duration) var(--delay) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  opacity: 0;
}
@keyframes particleBurst {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  30% {
    opacity: 1;
  }
  100% {
    transform: translate(
      calc(-50% + cos(var(--angle)) * var(--distance)),
      calc(-50% + sin(var(--angle)) * var(--distance))
    );
    opacity: 0;
  }
}
/* Fallback: random scatter since cos/sin in CSS is limited */
.particle:nth-child(1)  { --tx:  50px; --ty: -90px; }
.particle:nth-child(2)  { --tx:  80px; --ty: -40px; }
.particle:nth-child(3)  { --tx:  95px; --ty:  20px; }
.particle:nth-child(4)  { --tx:  70px; --ty:  70px; }
.particle:nth-child(5)  { --tx:  30px; --ty:  95px; }
.particle:nth-child(6)  { --tx: -20px; --ty:  88px; }
.particle:nth-child(7)  { --tx: -65px; --ty:  60px; }
.particle:nth-child(8)  { --tx: -90px; --ty:  15px; }
.particle:nth-child(9)  { --tx: -80px; --ty: -45px; }
.particle:nth-child(10) { --tx: -45px; --ty: -85px; }
.particle:nth-child(11) { --tx:   5px; --ty: -98px; }
.particle:nth-child(12) { --tx:  60px; --ty: -70px; }
.particle:nth-child(13) { --tx: 100px; --ty:   0px; }
.particle:nth-child(14) { --tx:  55px; --ty:  80px; }
.particle:nth-child(15) { --tx: -10px; --ty: 100px; }
.particle:nth-child(16) { --tx: -70px; --ty:  55px; }
.particle:nth-child(17) { --tx:-100px; --ty: -10px; }
.particle:nth-child(18) { --tx: -60px; --ty: -75px; }
.particle:nth-child(19) { --tx:  15px; --ty:-105px; }
.particle:nth-child(20) { --tx:  85px; --ty: -55px; }
.particle:nth-child(21) { --tx:  90px; --ty:  45px; }
.particle:nth-child(22) { --tx:  20px; --ty:  92px; }
.particle:nth-child(23) { --tx: -50px; --ty:  80px; }
.particle:nth-child(24) { --tx: -95px; --ty:  30px; }

/* Use the pre-computed offsets as fallback */
@keyframes particleBurst {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  30% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    transform: translate(
      calc(-50% + var(--tx, 50px)),
      calc(-50% + var(--ty, -50px))
    );
    opacity: 0;
  }
}

/* -- Center content -- */
.celebration-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: celebrationContentIn 0.5s 0.1s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes celebrationContentIn {
  from {
    opacity: 0;
    transform: scale(0.7) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* -- Animated checkmark -- */
.celebration-check {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}
.celebration-check-svg {
  width: 100%;
  height: 100%;
}
.celebration-check-circle {
  fill: none;
  stroke: var(--apple-color-primary);
  stroke-width: 2.5;
  stroke-dasharray: 151;
  stroke-dashoffset: 151;
  animation: checkCircle 0.5s 0.15s ease forwards;
  transform-origin: center;
}
.celebration-check-path {
  fill: none;
  stroke: var(--apple-color-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: checkStroke 0.35s 0.5s ease forwards;
}
@keyframes checkCircle {
  to { stroke-dashoffset: 0; }
}
@keyframes checkStroke {
  to { stroke-dashoffset: 0; }
}

.celebration-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: white;
}
.celebration-subtitle {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

/* ================================
   Loading dots
   ================================ */
.loading-dots {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}
.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--apple-text-color-tertiary);
  animation: loadingDot 1.4s infinite ease-in-out both;
}
.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }
.loading-dots span:nth-child(3) { animation-delay: 0s; }
@keyframes loadingDot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* ================================
   Input area
   ================================ */
.chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid var(--apple-border-color);
  flex-shrink: 0;
}
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background-color: var(--apple-color-gray-6);
  border: 1px solid var(--apple-border-color);
  border-radius: var(--apple-border-radius-large);
  padding: 4px 4px 4px 12px;
  transition: border-color var(--apple-transition-duration) var(--apple-transition-easing);
}
.input-wrapper:focus-within {
  border-color: var(--apple-color-primary);
}
.input-wrapper :deep(.el-textarea__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 6px 0;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  color: var(--apple-text-color-primary);
}
.send-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--apple-border-radius-medium);
  border: none;
  background-color: var(--apple-color-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
  transition: all var(--apple-transition-duration) var(--apple-transition-easing);
}
.send-btn:hover {
  background-color: var(--apple-color-primary-dark);
}
.send-btn:disabled {
  background-color: var(--apple-color-gray-4);
  cursor: not-allowed;
}

/* ================================
   Utility transitions
   ================================ */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ================================
   Mobile
   ================================ */
@media (max-width: 768px) {
  .ai-chat-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 100vw !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    height: 100vh;
    z-index: 1002;
    transform: translateX(100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.12);
  }
  .ai-chat-sidebar.is-visible {
    transform: translateX(0);
  }
}
</style>
