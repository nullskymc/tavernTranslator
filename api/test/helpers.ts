/**
 * 测试辅助工具 — mock fetch、OpenAI 兼容响应构造、PNG fixture 构造
 */
import { deflateSync } from 'node:zlib';

// ------------------------------------------------------------------
// Mock fetch
// ------------------------------------------------------------------

/** 全局已安装的 mock 恢复函数（供测试文件 afterEach 统一清理） */
const activeMocks: Array<() => void> = [];

/** 恢复所有尚未 restore 的 mock */
export function restoreAllMocks(): void {
  while (activeMocks.length > 0) {
    activeMocks.pop()?.();
  }
}

export interface MockFetchCall {
  url: string;
  init: RequestInit;
}

export interface MockFetchOptions {
  status?: number;
  /** 响应 JSON 对象 */
  json?: unknown;
  /** 响应纯文本（json 优先） */
  text?: string;
  headers?: Record<string, string>;
  /** 每次请求前回调，可用于断言请求体 */
  onRequest?: (url: string, init: RequestInit) => void;
  /** 若设置，fetch 直接抛出该错误（模拟网络故障） */
  throwError?: Error;
}

/**
 * 替换全局 fetch 为可控 mock，返回调用记录与恢复函数。
 * 支持 AI SDK 的非流式（JSON）与流式（SSE）两种响应。
 */
export function installMockFetch(options: MockFetchOptions = {}) {
  const calls: MockFetchCall[] = [];
  const original = globalThis.fetch;

  const fetchMock = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    calls.push({ url, init: init ?? {} });
    options.onRequest?.(url, init ?? {});

    if (options.throwError) throw options.throwError;

    const status = options.status ?? 200;
    const headers = { 'content-type': 'application/json', ...options.headers };
    const body = options.json !== undefined
      ? JSON.stringify(options.json)
      : (options.text ?? '');

    return new Response(body, { status, headers });
  };

  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const restore = () => {
    globalThis.fetch = original;
    const idx = activeMocks.indexOf(restore);
    if (idx !== -1) activeMocks.splice(idx, 1);
  };
  activeMocks.push(restore);

  return {
    calls,
    restore,
  };
}

/** 构造 OpenAI 兼容的 chat.completions 成功响应 */
export function chatCompletionResponse(content: string): Record<string, unknown> {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 1_700_000_000,
    model: 'test-model',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  };
}

/** 构造 OpenAI 兼容的流式 chat.completion.chunk SSE 文本 */
export function chatCompletionStreamText(chunks: string[]): string {
  const lines = chunks.map((content, index) =>
    `data: ${JSON.stringify({
      id: 'chatcmpl-test',
      object: 'chat.completion.chunk',
      created: 1_700_000_000,
      model: 'test-model',
      choices: [
        { index: 0, delta: { content }, finish_reason: null },
      ],
    })}`
  );
  // 结束 chunk
  lines.push(
    `data: ${JSON.stringify({
      id: 'chatcmpl-test',
      object: 'chat.completion.chunk',
      created: 1_700_000_000,
      model: 'test-model',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    })}`
  );
  lines.push('data: [DONE]');
  return lines.join('\n\n') + '\n\n';
}

// ------------------------------------------------------------------
// PNG fixture 构造
// ------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

export function pngCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** 构造单个 PNG chunk（length + type + data + crc） */
export function buildPngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(pngCrc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

export interface PngTextChunkSpec {
  keyword: string;
  text: string;
  /** true 生成 zTXt（deflate 压缩），false 生成 tEXt */
  compressed?: boolean;
}

/** 构造最小合法 PNG（1x1 RGBA），可附带 tEXt/zTXt 文本块 */
export function buildMinimalPng(texts: PngTextChunkSpec[] = []): Buffer {
  // IHDR: 1x1, 8-bit, RGBA
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // IDAT: 1x1 RGBA scanline（filter byte 0 + RGBA）
  const idat = deflateSync(Buffer.from([0, 255, 0, 0, 255]));

  const textChunks = texts.map(({ keyword, text, compressed }) => {
    if (compressed) {
      const content = Buffer.concat([
        Buffer.from(keyword, 'latin1'),
        Buffer.from([0, 0]), // null + compression method 0
        deflateSync(Buffer.from(text, 'utf-8')),
      ]);
      return buildPngChunk('zTXt', content);
    }
    const content = Buffer.concat([
      Buffer.from(keyword, 'latin1'),
      Buffer.from([0]),
      Buffer.from(text, 'utf-8'),
    ]);
    return buildPngChunk('tEXt', content);
  });

  return Buffer.concat([
    PNG_SIGNATURE,
    buildPngChunk('IHDR', ihdr),
    buildPngChunk('IDAT', idat),
    ...textChunks,
    buildPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 读取 PNG 中全部 chunk（type, data, offset），便于断言结构 */
export function readPngChunks(png: Buffer): Array<{ type: string; data: Buffer }> {
  const chunks: Array<{ type: string; data: Buffer }> = [];
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
  }
  return chunks;
}

/** 构造测试用角色卡 JSON */
export function characterCardJson(): Record<string, unknown> {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '测试角色',
      description: '一位测试角色',
      personality: '冷静',
      tags: ['测试', 'demo'],
      alternate_greetings: ['你好', '您好'],
    },
  };
}
