/**
 * AI 助手逻辑测试（阶段 3）
 * - extractCardFields：围栏/纯 JSON、非法 JSON、额外字段过滤、类型规整
 * - generateChat：非流式响应 + 字段校验 + 错误映射
 */
import { describe, it, expect, afterEach } from 'vitest';
import { extractCardFields, parseJsonFromText, generateChat } from '../lib/chat';
import { installMockFetch, restoreAllMocks, chatCompletionResponse } from './helpers';

const settings = {
  api_key: 'sk-test-123',
  base_url: 'https://api.example.com/v1',
  model_name: 'test-model',
  api_mode: 'chat' as const,
};

afterEach(() => {
  restoreAllMocks();
});

describe('parseJsonFromText', () => {
  it('解析代码围栏中的 JSON', () => {
    const text = '以下是建议：\n```json\n{"name":"小美"}\n```\n希望有帮助。';
    expect(parseJsonFromText(text)).toEqual({ name: '小美' });
  });

  it('解析整段纯 JSON', () => {
    expect(parseJsonFromText('{"name":"小美"}')).toEqual({ name: '小美' });
  });

  it('非法 JSON 返回 null', () => {
    expect(parseJsonFromText('这不是 JSON')).toBeNull();
  });
});

describe('extractCardFields', () => {
  it('提取围栏 JSON 中的可应用字段', () => {
    const text = '```json\n{"name":"新角色","description":"描述","tags":["a","b"]}\n```';
    expect(extractCardFields(text)).toEqual({
      name: '新角色',
      description: '描述',
      tags: ['a', 'b'],
    });
  });

  it('过滤未知字段并规整数组字段', () => {
    const text = '{"name":"A","hacker":"x","alternate_greetings":["hi","",42],"tags":"not-array"}';
    expect(extractCardFields(text)).toEqual({
      name: 'A',
      alternate_greetings: ['hi'],
    });
  });

  it('数字/布尔字段转字符串', () => {
    expect(extractCardFields('{"name":123,"scenario":true}')).toEqual({
      name: '123',
      scenario: 'true',
    });
  });

  it('无字段或非法输入返回 null', () => {
    expect(extractCardFields('随便聊聊')).toBeNull();
    expect(extractCardFields('{"unknown":"only"}')).toBeNull();
  });
});

describe('generateChat', () => {
  it('返回回复文本与服务端校验后的字段', async () => {
    const reply = '好的，已生成角色：\n```json\n{"name":"小美","personality":"温柔"}\n```';
    const mock = installMockFetch({ json: chatCompletionResponse(reply) });

    const result = await generateChat({
      messages: [{ role: 'user', content: '创建一个角色' }],
      settings,
    });

    expect(result.reply).toBe(reply);
    expect(result.fields).toEqual({ name: '小美', personality: '温柔' });
    expect(mock.calls[0].url).toBe('https://api.example.com/v1/chat/completions');
  });

  it('无字段回复时 fields 为 null', async () => {
    installMockFetch({ json: chatCompletionResponse('好的，随便聊聊。') });
    const result = await generateChat({
      messages: [{ role: 'user', content: '你好' }],
      settings,
    });
    expect(result.reply).toBe('好的，随便聊聊。');
    expect(result.fields).toBeNull();
  });

  it('请求包含系统提示与角色卡上下文', async () => {
    installMockFetch({
      json: chatCompletionResponse('ok'),
      onRequest: (_url, init) => {
        const body = JSON.parse(String(init.body));
        expect(body.messages[0].role).toBe('system');
        expect(body.messages[0].content).toContain('角色卡创建助手');
        expect(body.messages[0].content).toContain('当前角色卡数据');
        expect(body.messages[1]).toEqual({ role: 'user', content: '改进这个角色' });
      },
    });
    await generateChat({
      messages: [{ role: 'user', content: '改进这个角色' }],
      settings,
      character_card: { data: { name: '旧角色' } },
    });
  });

  it('401 映射为 API Key 错误', async () => {
    installMockFetch({ status: 401, json: { error: { message: 'Invalid api key' } } });
    await expect(generateChat({ messages: [{ role: 'user', content: 'x' }], settings }))
      .rejects.toMatchObject({ status: 401 });
  });
});
