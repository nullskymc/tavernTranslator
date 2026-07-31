/**
 * v2 路由表 — 与 v1 保持路径语义一致
 *
 * 每条端点同时注册两套路径：
 * - /api/v2/character/* ：与旧 /api/v1/character/* 对齐，前端当前使用
 * - /api/v2/*           ：计划文档中的短路径，保留为兼容别名
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleTranslate, handleTranslateCharacterBook } from './translate';
import { handleBatchTranslate } from './batch-translate';
import { handleChatStream, handleChatSync } from './chat';
import { handleUpload } from './upload';
import { handleExport } from './export';
import { sendJson } from './_helpers';

export type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/** 为同一处理函数注册短路径与 /character 前缀路径 */
function both(method: string, base: string, handler: Handler): Record<string, Handler> {
  return {
    [`${method} /api/v2/${base}`]: handler,
    [`${method} /api/v2/character/${base}`]: handler,
  };
}

/** v2 路由表：key = `${method} ${pathname}` */
export const routes: Record<string, Handler> = {
  ...both('POST', 'translate', handleTranslate),
  ...both('POST', 'translate-character-book', handleTranslateCharacterBook),
  ...both('POST', 'batch-translate', handleBatchTranslate),
  ...both('POST', 'upload', handleUpload),
  ...both('POST', 'export', handleExport),
  ...both('POST', 'chat', handleChatStream),
  ...both('POST', 'chat/sync', handleChatSync),
  // 前端 AI 助手使用 /character/ai-chat 路径，与 v1 一致
  'POST /api/v2/character/ai-chat': handleChatStream,
  'POST /api/v2/character/ai-chat/sync': handleChatSync,
  'GET /api/v2/health': async (_req, res) => {
    sendJson(res, 200, { status: 'ok', version: '2.0.0' });
  },
};
