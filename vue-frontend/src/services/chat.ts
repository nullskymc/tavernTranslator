/**
 * AI 助手聊天传输层
 * - streamChat: POST /api/v2/chat，解析 SSE（text-delta / fields / finish / error）
 * - chatSync:   POST /api/v2/chat/sync，非流式降级端点
 *
 * 服务端负责从回复中提取并校验可应用字段（fields），
 * 前端不再解析 Markdown code fence 中的 JSON。
 */
import i18n from '@/i18n';
import { requestJson } from './http';

export interface ChatSettingsPayload {
  api_key: string;
  base_url: string;
  model_name: string;
  api_mode: 'chat' | 'responses';
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestParams {
  messages: ChatMessagePayload[];
  settings: ChatSettingsPayload;
  character_card?: Record<string, unknown> | null;
  signal?: AbortSignal;
}

export interface ChatStreamResult {
  reply: string;
  fields: Record<string, unknown> | null;
}

/** 构造请求体（不引用 Pinia store，保持传输层解耦） */
function buildRequestBody(params: Omit<ChatRequestParams, 'signal'>): Record<string, unknown> {
  return {
    messages: params.messages,
    settings: params.settings,
    character_card: params.character_card ?? null,
  };
}

/**
 * 流式对话 — 通过 fetch 读取 SSE 事件流。
 * 文本增量通过 onTextDelta 回调返回，resolve 时附带完整 reply 与校验后的 fields。
 */
export async function streamChat(
  params: ChatRequestParams,
  onTextDelta?: (delta: string) => void | Promise<void>
): Promise<ChatStreamResult> {
  const res = await fetch('/api/v2/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(params)),
    signal: params.signal,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errBody.detail || i18n.global.t('aiChat.serviceError'));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error(i18n.global.t('aiChat.streamReadError'));

  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';
  let fields: Record<string, unknown> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'text-delta') {
          reply += event.textDelta;
          // 等待调用方完成一次渲染，避免同一个网络 chunk 内的增量被 Vue 合并。
          await onTextDelta?.(event.textDelta);
        } else if (event.type === 'fields') {
          fields = event.fields ?? null;
        } else if (event.type === 'error') {
          throw new Error(event.error);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  // 处理服务端关闭连接前未带换行符的最后一条 SSE 事件。
  if (buffer.startsWith('data: ')) {
    try {
      const event = JSON.parse(buffer.slice(6));
      if (event.type === 'text-delta') {
        reply += event.textDelta;
        await onTextDelta?.(event.textDelta);
      } else if (event.type === 'fields') {
        fields = event.fields ?? null;
      }
    } catch {
      // 不完整或非 JSON 的尾部数据无需影响已完成的回复。
    }
  }

  return { reply, fields };
}

/** 非流式对话降级 — 兼容不支持 SSE 的模型服务 */
export async function chatSync(
  params: Omit<ChatRequestParams, 'signal'>
): Promise<ChatStreamResult> {
  return requestJson<{ reply: string; fields: Record<string, unknown> | null }>(
    '/api/v2/chat/sync',
    buildRequestBody(params),
  );
}
