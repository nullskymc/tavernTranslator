/**
 * 翻译核心逻辑测试（阶段 1/2）
 * - 请求体断言：URL、model、系统提示词、词库注入
 * - 错误映射：401 / 429 / 超时
 * - 空文本短路、角色书翻译、批量翻译并发与重试
 */
import { describe, it, expect, afterEach } from 'vitest';
import { translateText, translateCharacterBookContent, translateBatch, TranslationError } from '../lib/translation';
import { installMockFetch, restoreAllMocks, chatCompletionResponse } from './helpers';

const settings = {
  api_key: 'sk-test-123',
  base_url: 'https://api.example.com/v1',
  model_name: 'test-model',
};

const prompts = {
  base_template: '你是翻译助手，请将内容翻译成中文。',
  description_template: '你是描述翻译助手。',
  dialogue_template: '你是对话翻译助手。',
};

afterEach(() => {
  // 防止 mock 泄漏到其他测试文件
  restoreAllMocks();
});

describe('translateText', () => {
  it('构造正确的请求：URL、模型、系统提示词与词库', async () => {
    const mock = installMockFetch({
      json: chatCompletionResponse('翻译结果'),
      onRequest: (url, init) => {
        expect(url).toBe('https://api.example.com/v1/chat/completions');

        const body = JSON.parse(String(init.body));
        expect(body.model).toBe('test-model');
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[0].content).toContain(prompts.description_template);
        expect(body.messages[0].content).toContain('【翻译词库 / Translation Glossary】');
        expect(body.messages[0].content).toContain('术语A => 术语B');
        expect(body.messages[1]).toEqual({ role: 'user', content: '原文内容' });
      },
    });

    const result = await translateText({
      text: '原文内容',
      fieldName: 'description',
      settings,
      prompts,
      glossary: '术语A => 术语B',
    });

    expect(result).toBe('翻译结果');
    expect(mock.calls.length).toBe(1);
    mock.restore();
  });

  it('空文本直接返回空串，不发起请求', async () => {
    const mock = installMockFetch({ json: chatCompletionResponse('x') });
    const result = await translateText({ text: '   ', fieldName: 'name', settings, prompts, glossary: '' });
    expect(result).toBe('');
    expect(mock.calls.length).toBe(0);
    mock.restore();
  });

  it('对话字段使用 dialogue_template', async () => {
    const mock = installMockFetch({
      json: chatCompletionResponse('ok'),
      onRequest: (_url, init) => {
        const body = JSON.parse(String(init.body));
        expect(body.messages[0].content).toContain(prompts.dialogue_template);
      },
    });
    await translateText({ text: 'hi', fieldName: 'first_mes', settings, prompts, glossary: '' });
    mock.restore();
  });

  it('401 映射为 API Key 错误', async () => {
    const mock = installMockFetch({
      status: 401,
      json: { error: { message: 'Incorrect API key provided' } },
    });
    await expect(translateText({ text: 'x', fieldName: 'name', settings, prompts, glossary: '' }))
      .rejects.toMatchObject({ status: 401, message: 'API Key 无效或已过期。' });
    mock.restore();
  });

  it('429 映射为限流错误', async () => {
    const mock = installMockFetch({
      status: 429,
      json: { error: { message: 'Rate limit reached' } },
    });
    await expect(translateText({ text: 'x', fieldName: 'name', settings, prompts, glossary: '' }))
      .rejects.toMatchObject({ status: 429, message: '请求过于频繁，请稍后再试。' });
    mock.restore();
  });

  it('网络超时映射为 504', async () => {
    const timeoutError = Object.assign(new TypeError('fetch failed'), {
      cause: new Error('ETIMEDOUT'),
    });
    const mock = installMockFetch({ throwError: timeoutError });
    await expect(translateText({ text: 'x', fieldName: 'name', settings, prompts, glossary: '' }))
      .rejects.toMatchObject({ status: 504, message: '模型服务超时，请重试。' });
    mock.restore();
  });

  it('未知错误包装为 TranslationError', async () => {
    const mock = installMockFetch({ status: 500, json: { error: { message: 'boom' } } });
    await expect(translateText({ text: 'x', fieldName: 'name', settings, prompts, glossary: '' }))
      .rejects.toBeInstanceOf(TranslationError);
    mock.restore();
  });
});

describe('translateCharacterBookContent', () => {
  it('使用 base_template 并返回译文', async () => {
    const mock = installMockFetch({
      json: chatCompletionResponse('角色书译文'),
      onRequest: (_url, init) => {
        const body = JSON.parse(String(init.body));
        expect(body.messages[0].content).toContain(prompts.base_template);
      },
    });
    const result = await translateCharacterBookContent({
      content: '角色书原文',
      settings,
      prompts,
      glossary: '',
    });
    expect(result).toBe('角色书译文');
    mock.restore();
  });
});

describe('translateBatch', () => {
  it('成功/失败字段混合返回逐字段结果与进度', async () => {
    const networkError = Object.assign(new TypeError('fetch failed'), { cause: new Error('ECONNRESET') });
    const mock = installMockFetch({
      json: chatCompletionResponse('译文'),
      onRequest: (_url, init) => {
        // description 字段（content=乙）始终失败，name 字段成功
        const body = JSON.parse(String(init.body));
        if (body.messages[1].content === '乙') {
          throw networkError;
        }
      },
    });

    const result = await translateBatch(
      {
        fields: [
          { field_name: 'name', text: '甲' },
          { field_name: 'description', text: '乙' },
        ],
        settings,
        prompts,
        glossary: '',
      },
      { maxRetries: 2, initialDelayMs: 0 }
    );

    expect(result.progress).toEqual({ completed: 2, total: 2 });
    expect(result.results[0]).toMatchObject({ field_name: 'name', translated_text: '译文', success: true });
    expect(result.results[1]).toMatchObject({ field_name: 'description', success: false });
    expect(result.results[1].error).toBeTruthy();
    mock.restore();
  });

  it('失败后重试成功，attempts 反映重试次数', async () => {
    let callCount = 0;
    const mock = installMockFetch({
      json: chatCompletionResponse('译文'),
      onRequest: () => {
        callCount++;
        if (callCount === 1) {
          throw Object.assign(new TypeError('fetch failed'), { cause: new Error('ETIMEDOUT') });
        }
      },
    });

    const result = await translateBatch(
      {
        fields: [{ field_name: 'name', text: '甲' }],
        settings,
        prompts,
        glossary: '',
      },
      { maxRetries: 3, initialDelayMs: 0 }
    );

    expect(result.results[0]).toMatchObject({ success: true, attempts: 2 });
    mock.restore();
  });

  it('空字段列表返回空结果', async () => {
    const result = await translateBatch({ fields: [], settings, prompts, glossary: '' });
    expect(result).toEqual({ results: [], progress: { completed: 0, total: 0 } });
  });
});
