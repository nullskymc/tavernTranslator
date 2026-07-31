/**
 * Zod schemas — 所有 API 请求/响应的类型契约
 * 替代原 Pydantic 模型，提供编译期 + 运行时双重校验
 */
import { z } from 'zod';

// ============================================
// 通用模型
// ============================================

/** 翻译 API 设置（BYOK，请求级传入，不持久化） */
export const TranslationSettingsSchema = z.object({
  api_key: z.string().min(1, 'API Key 不能为空'),
  base_url: z.string().url().default('https://api.openai.com/v1'),
  model_name: z.string().default('gpt-4-1106-preview'),
});

/** 翻译提示词模板 */
export const PromptsSchema = z.object({
  base_template: z.string().default(''),
  description_template: z.string().default(''),
  dialogue_template: z.string().default(''),
});

// ============================================
// 翻译 API
// ============================================

/** 单字段翻译请求 */
export const TranslateRequestSchema = z.object({
  text: z.string().min(1),
  field_name: z.string().min(1),
  settings: TranslationSettingsSchema,
  prompts: PromptsSchema,
  glossary: z.string().default(''),
});

/** 单字段翻译响应 */
export const TranslateResponseSchema = z.object({
  translated_text: z.string(),
});

/** 角色书内容翻译请求 */
export const TranslateCharacterBookRequestSchema = z.object({
  content: z.string().min(1),
  settings: TranslationSettingsSchema,
  prompts: PromptsSchema,
  glossary: z.string().default(''),
});

/** 角色书内容翻译响应 */
export const TranslateCharacterBookResponseSchema = z.object({
  translated_content: z.string(),
});

/** 批量翻译中的单个字段 */
export const BatchFieldItemSchema = z.object({
  field_name: z.string(),
  text: z.string(),
});

/** 批量翻译请求 */
export const BatchTranslateRequestSchema = z.object({
  fields: z.array(BatchFieldItemSchema).min(1),
  settings: TranslationSettingsSchema,
  prompts: PromptsSchema,
  glossary: z.string().default(''),
});

/** 批量翻译单个结果 */
export const BatchResultItemSchema = z.object({
  field_name: z.string(),
  original_text: z.string(),
  translated_text: z.string(),
  success: z.boolean(),
  error: z.string().nullable().optional(),
  attempts: z.number().int().default(1),
});

/** 批量翻译响应 */
export const BatchTranslateResponseSchema = z.object({
  results: z.array(BatchResultItemSchema),
  progress: z.object({
    completed: z.number().int(),
    total: z.number().int(),
  }),
});

// ============================================
// AI Chat API
// ============================================

/** 单条对话消息 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

/** AI 对话请求 */
export const AIChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  settings: TranslationSettingsSchema,
  character_card: z.record(z.unknown()).nullable().optional(),
});

// ============================================
// 导出类型（供其他模块使用）
// ============================================

export type TranslationSettings = z.infer<typeof TranslationSettingsSchema>;
export type Prompts = z.infer<typeof PromptsSchema>;
export type TranslateRequest = z.infer<typeof TranslateRequestSchema>;
export type TranslateResponse = z.infer<typeof TranslateResponseSchema>;
export type TranslateCharacterBookRequest = z.infer<typeof TranslateCharacterBookRequestSchema>;
export type BatchFieldItem = z.infer<typeof BatchFieldItemSchema>;
export type BatchTranslateRequest = z.infer<typeof BatchTranslateRequestSchema>;
export type BatchResultItem = z.infer<typeof BatchResultItemSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AIChatRequest = z.infer<typeof AIChatRequestSchema>;

// ============================================
// AI 助手可应用角色卡字段（服务端校验）
// ============================================

/** 允许应用的角色卡字段（与 v1 提示词约定的字段一致） */
export const EDITED_CARD_FIELD_KEYS = [
  'name',
  'description',
  'personality',
  'scenario',
  'first_mes',
  'alternate_greetings',
  'mes_example',
  'creator_notes',
  'system_prompt',
  'post_history_instructions',
  'tags',
] as const;

/** AI 助手返回的角色卡字段（经 schema 校验后传输） */
export const CharacterCardFieldsSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  first_mes: z.string().optional(),
  alternate_greetings: z.array(z.string()).optional(),
  mes_example: z.string().optional(),
  creator_notes: z.string().optional(),
  system_prompt: z.string().optional(),
  post_history_instructions: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CharacterCardFields = z.infer<typeof CharacterCardFieldsSchema>;
