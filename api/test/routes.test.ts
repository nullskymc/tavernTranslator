/**
 * v2 路由表测试（阶段 2 路径对齐）
 * - 短路径与 /character 前缀路径都指向同一处理函数
 * - 前端实际使用的路径全部存在
 */
import { describe, it, expect } from 'vitest';
import { routes } from '../v2/routes';
import { handleTranslate, handleTranslateCharacterBook } from '../v2/translate';
import { handleBatchTranslate } from '../v2/batch-translate';
import { handleChatStream, handleChatSync } from '../v2/chat';
import { handleUpload } from '../v2/upload';
import { handleExport } from '../v2/export';

describe('v2 routes', () => {
  it('前端使用的 /character/* 路径全部注册', () => {
    expect(routes['POST /api/v2/character/translate']).toBe(handleTranslate);
    expect(routes['POST /api/v2/character/translate-character-book']).toBe(handleTranslateCharacterBook);
    expect(routes['POST /api/v2/character/batch-translate']).toBe(handleBatchTranslate);
    expect(routes['POST /api/v2/character/ai-chat']).toBe(handleChatStream);
    expect(routes['POST /api/v2/character/ai-chat/sync']).toBe(handleChatSync);
    expect(routes['POST /api/v2/character/upload']).toBe(handleUpload);
    expect(routes['POST /api/v2/character/export']).toBe(handleExport);
  });

  it('短路径别名与计划文档一致', () => {
    expect(routes['POST /api/v2/translate']).toBe(handleTranslate);
    expect(routes['POST /api/v2/chat']).toBe(handleChatStream);
    expect(routes['POST /api/v2/chat/sync']).toBe(handleChatSync);
    expect(routes['POST /api/v2/upload']).toBe(handleUpload);
    expect(routes['POST /api/v2/export']).toBe(handleExport);
  });

  it('健康检查存在', () => {
    expect(typeof routes['GET /api/v2/health']).toBe('function');
  });
});
