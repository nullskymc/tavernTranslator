/**
 * /api/v2/translate — 单字段翻译
 * /api/v2/translate-character-book — 角色书内容翻译
 * 
 * 与 v1 保持相同的字段名称和响应 shape
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { TranslateRequestSchema, TranslateCharacterBookRequestSchema } from '../lib/schemas';
import { translateText, translateCharacterBookContent, TranslationError } from '../lib/translation';
import { readJsonBody, sendJson, sendError } from './_helpers';

/** POST /api/v2/translate */
export async function handleTranslate(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readJsonBody(req);
    const parsed = TranslateRequestSchema.safeParse(body);

    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? '请求参数无效');
      return;
    }

    const { text, field_name, settings, prompts, glossary } = parsed.data;

    // 空文本直接返回
    if (!text.trim()) {
      sendJson(res, 200, { translated_text: '' });
      return;
    }

    const translated = await translateText({
      text,
      fieldName: field_name,
      settings,
      prompts,
      glossary,
    });

    sendJson(res, 200, { translated_text: translated });
  } catch (err) {
    if (err instanceof TranslationError) {
      sendError(res, err.status, err.message);
    } else {
      sendError(res, 500, '翻译过程中发生内部错误。');
    }
  }
}

/** POST /api/v2/translate-character-book */
export async function handleTranslateCharacterBook(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readJsonBody(req);
    const parsed = TranslateCharacterBookRequestSchema.safeParse(body);

    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? '请求参数无效');
      return;
    }

    const { content, settings, prompts, glossary } = parsed.data;

    if (!content.trim()) {
      sendJson(res, 200, { translated_content: '' });
      return;
    }

    const translated = await translateCharacterBookContent({
      content,
      settings,
      prompts,
      glossary,
    });

    sendJson(res, 200, { translated_content: translated });
  } catch (err) {
    if (err instanceof TranslationError) {
      sendError(res, err.status, err.message);
    } else {
      sendError(res, 500, '翻译过程中发生内部错误。');
    }
  }
}
