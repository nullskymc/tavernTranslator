/**
 * /api/v2/batch-translate — 批量翻译多个字段
 * 受控并发 + 指数退避重试，与 v1 响应 shape 一致
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { BatchTranslateRequestSchema } from '../lib/schemas';
import { translateBatch } from '../lib/translation';
import { readJsonBody, sendJson, sendError } from './_helpers';

/** POST /api/v2/batch-translate */
export async function handleBatchTranslate(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readJsonBody(req);
    const parsed = BatchTranslateRequestSchema.safeParse(body);

    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? '请求参数无效');
      return;
    }

    const { fields, settings, prompts, glossary } = parsed.data;

    if (fields.length === 0) {
      sendJson(res, 200, { results: [], progress: { completed: 0, total: 0 } });
      return;
    }

    const { results, progress } = await translateBatch({
      fields,
      settings,
      prompts,
      glossary,
    });

    sendJson(res, 200, { results, progress });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '批量翻译过程中发生内部错误。';
    sendError(res, 500, msg);
  }
}
