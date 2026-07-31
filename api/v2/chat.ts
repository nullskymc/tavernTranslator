/**
 * /api/v2/chat — AI 助手对话（流式 SSE）
 * /api/v2/chat/sync — 非流式降级端点
 *
 * 流式端点返回 text/event-stream，事件类型：
 * - text-delta: 增量文本 { type, textDelta }
 * - fields:     服务端校验后的可应用字段 { type, fields }（null 表示无字段）
 * - finish:     流结束
 * - error:      流中错误 { type, error }
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AIChatRequestSchema } from '../lib/schemas';
import { streamChat, generateChat, extractCardFields } from '../lib/chat';
import { readJsonBody, sendJson, sendError } from './_helpers';

/** POST /api/v2/chat — 流式 SSE 响应 */
export async function handleChatStream(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readJsonBody(req);
    const parsed = AIChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? '请求参数无效');
      return;
    }

    const result = streamChat(parsed.data);

    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // 逐 token 写入 SSE
    let fullText = '';
    const reader = result.textStream;
    for await (const chunk of reader) {
      fullText += chunk;
      res.write(`data: ${JSON.stringify({ type: 'text-delta', textDelta: chunk })}\n\n`);
    }

    // 发送服务端校验后的可应用字段
    res.write(`data: ${JSON.stringify({ type: 'fields', fields: extractCardFields(fullText) })}\n\n`);

    // 发送完成事件
    res.write(`data: ${JSON.stringify({ type: 'finish' })}\n\n`);
    res.end();
  } catch (err: any) {
    // 如果响应头已发送，通过 SSE 发送错误
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err?.message ?? '未知错误' })}\n\n`);
      res.end();
    } else {
      const status = err?.status ?? 500;
      const message = err?.message ?? 'AI 对话过程中发生错误。';
      sendError(res, status, message);
    }
  }
}

/** POST /api/v2/chat/sync — 非流式降级（兼容不支持 SSE 的服务） */
export async function handleChatSync(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readJsonBody(req);
    const parsed = AIChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      sendError(res, 400, parsed.error.issues[0]?.message ?? '请求参数无效');
      return;
    }

    const { reply, fields } = await generateChat(parsed.data);
    sendJson(res, 200, { reply, fields });
  } catch (err: any) {
    const status = err?.status ?? 500;
    const message = err?.message ?? 'AI 对话过程中发生错误。';
    sendError(res, status, message);
  }
}
