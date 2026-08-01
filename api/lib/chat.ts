/**
 * AI 助手对话逻辑
 * 使用 Vercel AI SDK 的 streamText 进行流式响应
 * 返回内容包含：聊天文本 + 经服务端校验的可应用角色卡字段
 */
import { streamText, generateText } from 'ai';
import { getModel } from './provider';
import { AI_CHAT_SYSTEM_PROMPT } from './prompts';
import { EDITED_CARD_FIELD_KEYS, CharacterCardFieldsSchema } from './schemas';
import type { AIChatRequest, CharacterCardFields } from './schemas';

// ------------------------------------------------------------------
// 错误映射
// ------------------------------------------------------------------

function mapChatError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (/auth|api.?key|unauthorized|401/i.test(msg)) {
    return { status: 401, message: 'API Key 无效或已过期。' };
  }
  if (/rate.?limit|429|too many/i.test(msg)) {
    return { status: 429, message: '请求过于频繁，请稍后再试。' };
  }
  return { status: 500, message: `AI 对话过程中发生错误：${msg}` };
}

// ------------------------------------------------------------------
// 构建系统提示词（含角色卡上下文）
// ------------------------------------------------------------------

function buildSystemPrompt(characterCard?: Record<string, unknown> | null): string {
  let prompt = AI_CHAT_SYSTEM_PROMPT;

  if (characterCard && typeof characterCard === 'object') {
    const cardData = (characterCard as any).data ?? characterCard;
    const cardInfo = JSON.stringify(cardData, null, 2);
    prompt += `\n\n当前角色卡数据：\n\`\`\`json\n${cardInfo}\n\`\`\`\n请基于上述现有数据为用户提供建议和帮助。`;
  }

  return prompt;
}

/** 构造发送给模型的对话历史；系统提示通过独立字段传入。 */
function buildMessages(request: AIChatRequest) {
  return [
    ...request.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];
}

// ------------------------------------------------------------------
// 服务端 JSON 字段提取与校验
// ------------------------------------------------------------------

/** 提取文本中的 JSON 块（代码围栏或纯 JSON），解析失败返回 null */
export function parseJsonFromText(text: string): Record<string, unknown> | null {
  // 优先匹配 ```json 代码围栏
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // 围栏内容不是合法 JSON，继续尝试整段解析
    }
  }

  try {
    const parsed = JSON.parse(text.trim());
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * 从回复文本中提取并校验可应用的角色卡字段。
 * - 只保留 EDITED_CARD_FIELD_KEYS 内的字段
 * - 字符串数组字段（alternate_greetings/tags）强制转为 string[]
 * - 其余字段强制转为 string，无法转换的字段丢弃
 * 返回 null 表示回复中不包含可应用的字段。
 */
export function extractCardFields(text: string): CharacterCardFields | null {
  const json = parseJsonFromText(text);
  if (!json) return null;

  const fields: CharacterCardFields = {};
  const arrayKeys = new Set(['alternate_greetings', 'tags']);

  for (const key of EDITED_CARD_FIELD_KEYS) {
    const value = json[key];
    if (value === undefined || value === null || value === '') continue;

    if (arrayKeys.has(key)) {
      if (Array.isArray(value)) {
        const items = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
        if (items.length > 0) (fields as Record<string, unknown>)[key] = items;
      }
    } else if (typeof value === 'string' && value.trim() !== '') {
      (fields as Record<string, unknown>)[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      (fields as Record<string, unknown>)[key] = String(value);
    }
  }

  const parsed = CharacterCardFieldsSchema.safeParse(fields);
  if (!parsed.success || Object.keys(parsed.data).length === 0) return null;
  return parsed.data;
}

// ------------------------------------------------------------------
// 流式对话（用于 SSE 端点）
// ------------------------------------------------------------------

/**
 * 流式 AI 对话 — 返回 AI SDK 的 StreamTextResult，
 * 由端点层逐 token 转写为 SSE text-delta 事件，
 * 流结束后端点层用 extractCardFields 发送 fields 事件。
 */
export function streamChat(request: AIChatRequest) {
  try {
    return streamText({
      model: getModel(request.settings),
      system: buildSystemPrompt(request.character_card),
      messages: buildMessages(request),
      maxOutputTokens: 8192,
      // 关闭 AI SDK 内置重试：错误映射与批量重试由本层负责
      maxRetries: 0,
    });
  } catch (err) {
    throw mapChatError(err);
  }
}

// ------------------------------------------------------------------
// 非流式对话（降级 / 兼容不支持流式的服务）
// ------------------------------------------------------------------

/**
 * 非流式 AI 对话 — 返回完整回复文本 + 服务端校验后的可应用字段。
 */
export async function generateChat(request: AIChatRequest): Promise<{
  reply: string;
  fields: CharacterCardFields | null;
}> {
  try {
    const { text } = await generateText({
      model: getModel(request.settings),
      system: buildSystemPrompt(request.character_card),
      messages: buildMessages(request),
      maxOutputTokens: 8192,
      // 关闭 AI SDK 内置重试：错误映射与批量重试由本层负责
      maxRetries: 0,
    });
    return { reply: text, fields: extractCardFields(text) };
  } catch (err) {
    throw mapChatError(err);
  }
}
