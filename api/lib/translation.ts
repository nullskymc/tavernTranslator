/**
 * 翻译核心逻辑
 * 使用 Vercel AI SDK 的 generateText 进行非流式翻译调用
 */
import { generateText } from 'ai';
import { getModel } from './provider';
import { getSystemPrompt } from './prompts';
import type { TranslationSettings, Prompts, BatchFieldItem, BatchResultItem } from './schemas';

// ------------------------------------------------------------------
// 错误类型
// ------------------------------------------------------------------

export class TranslationError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'TranslationError';
    this.status = status;
  }
}

/**
 * 将 AI SDK / OpenAI 错误映射为统一错误
 */
function mapError(err: unknown): TranslationError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/auth|api.?key|unauthorized|401/i.test(msg)) {
    return new TranslationError('API Key 无效或已过期。', 401);
  }
  if (/rate.?limit|429|too many/i.test(msg)) {
    return new TranslationError('请求过于频繁，请稍后再试。', 429);
  }
  if (/timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
    return new TranslationError('模型服务超时，请重试。', 504);
  }
  return new TranslationError(`翻译失败：${msg}`, 500);
}

// ------------------------------------------------------------------
// 单字段翻译
// ------------------------------------------------------------------

/**
 * 翻译单个字段：按字段类型选择 prompt → 调用模型 → 返回译文
 */
export async function translateText(params: {
  text: string;
  fieldName: string;
  settings: TranslationSettings;
  prompts: Prompts;
  glossary: string;
}): Promise<string> {
  const { text, fieldName, settings, prompts, glossary } = params;

  if (!text.trim()) return '';

  const systemPrompt = getSystemPrompt(fieldName, prompts, glossary);

  try {
    const { text: result } = await generateText({
      model: getModel(settings),
      system: systemPrompt,
      prompt: text,
      maxTokens: 8192,
      // 关闭 AI SDK 内置重试：批量翻译层负责重试，避免多层退避叠加
      maxRetries: 0,
    });
    return result;
  } catch (err) {
    throw mapError(err);
  }
}

// ------------------------------------------------------------------
// 角色书内容翻译
// ------------------------------------------------------------------

/**
 * 翻译 character_book 中的 content 字段（使用 base_template）
 */
export async function translateCharacterBookContent(params: {
  content: string;
  settings: TranslationSettings;
  prompts: Prompts;
  glossary: string;
}): Promise<string> {
  const { content, settings, prompts, glossary } = params;

  if (!content.trim()) return '';

  const systemPrompt = getSystemPrompt('character_book.content', prompts, glossary);

  try {
    const { text: result } = await generateText({
      model: getModel(settings),
      system: systemPrompt,
      prompt: content,
      maxTokens: 8192,
      // 关闭 AI SDK 内置重试：批量翻译层负责重试，避免多层退避叠加
      maxRetries: 0,
    });
    return result;
  } catch (err) {
    throw mapError(err);
  }
}

// ------------------------------------------------------------------
// 批量翻译（受控并发 + 指数退避重试）
// ------------------------------------------------------------------

const MAX_CONCURRENT = 3;
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 16000;

/** 延迟工具 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 重试策略（仅测试等场景需要覆盖，生产使用默认值） */
export interface BatchRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * 批量翻译多个字段，使用受控 Promise.allSettled 并发 + 指数退避重试
 */
export async function translateBatch(
  params: {
    fields: BatchFieldItem[];
    settings: TranslationSettings;
    prompts: Prompts;
    glossary: string;
  },
  retryOptions: BatchRetryOptions = {}
): Promise<{ results: BatchResultItem[]; progress: { completed: number; total: number } }> {
  const { fields, settings, prompts, glossary } = params;
  const MAX_RETRIES = retryOptions.maxRetries ?? DEFAULT_MAX_RETRIES;
  const INITIAL_DELAY_MS = retryOptions.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const MAX_DELAY_MS = retryOptions.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const total = fields.length;
  let completed = 0;

  // 信号量控制并发
  let active = 0;
  const queue: Array<() => void> = [];

  function acquireSlot(): Promise<void> {
    if (active < MAX_CONCURRENT) {
      active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      queue.push(() => { active++; resolve(); });
    });
  }

  function releaseSlot(): void {
    active--;
    const next = queue.shift();
    if (next) next();
  }

  /** 翻译单个字段（含重试） */
  async function translateSingle(field: BatchFieldItem): Promise<BatchResultItem> {
    await acquireSlot();
    try {
      let delay = INITIAL_DELAY_MS;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const isCharBook = field.field_name === 'character_book.content';
          const translated = isCharBook
            ? await translateCharacterBookContent({ content: field.text, settings, prompts, glossary })
            : await translateText({ text: field.text, fieldName: field.field_name, settings, prompts, glossary });

          completed++;
          return {
            field_name: field.field_name,
            original_text: field.text,
            translated_text: translated,
            success: true,
            attempts: attempt,
          };
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < MAX_RETRIES) {
            await sleep(delay);
            delay = Math.min(delay * 2, MAX_DELAY_MS);
          }
        }
      }

      // 全部重试失败
      completed++;
      return {
        field_name: field.field_name,
        original_text: field.text,
        translated_text: '',
        success: false,
        error: lastError?.message ?? '未知错误',
        attempts: MAX_RETRIES,
      };
    } finally {
      releaseSlot();
    }
  }

  // 并发执行所有字段
  const results = await Promise.all(fields.map(translateSingle));

  return { results, progress: { completed, total } };
}
