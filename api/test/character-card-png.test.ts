/**
 * PNG 角色卡编解码回归测试（阶段 5）
 * - tEXt/zTXt 读取
 * - 嵌入写回与往返一致性
 * - 旧文本块清理与 chunk 结构完整性
 */
import { describe, it, expect } from 'vitest';
import { extractCharacterData, embedCharacterData } from '../lib/character-card-png';
import {
  buildMinimalPng,
  readPngChunks,
  pngCrc32,
  characterCardJson,
} from './helpers';

describe('extractCharacterData', () => {
  it('从 tEXt 块（keyword=chara, base64 JSON）中提取角色卡', () => {
    const card = characterCardJson();
    const text = Buffer.from(JSON.stringify(card), 'utf-8').toString('base64');
    const png = buildMinimalPng([{ keyword: 'chara', text }]);

    expect(extractCharacterData(png)).toEqual(card);
  });

  it('从 zTXt 块（deflate 压缩）中提取角色卡', () => {
    const card = characterCardJson();
    const text = Buffer.from(JSON.stringify(card), 'utf-8').toString('base64');
    const png = buildMinimalPng([{ keyword: 'chara', text, compressed: true }]);

    expect(extractCharacterData(png)).toEqual(card);
  });

  it('忽略非 chara 关键字与损坏的 JSON，返回 null', () => {
    const png = buildMinimalPng([
      { keyword: 'Author', text: 'someone' },
      { keyword: 'chara', text: 'not-valid-base64!!' },
    ]);
    expect(extractCharacterData(png)).toBeNull();
  });

  it('无文本块的普通 PNG 返回 null', () => {
    expect(extractCharacterData(buildMinimalPng())).toBeNull();
  });

  it('非 PNG 输入返回 null', () => {
    expect(extractCharacterData(Buffer.from('not a png at all'))).toBeNull();
  });
});

describe('embedCharacterData', () => {
  it('嵌入后可以重新提取出相同数据（往返一致）', () => {
    const card = characterCardJson();
    const png = buildMinimalPng();
    const embedded = embedCharacterData(png, card);

    // 往返：嵌入 → 提取
    expect(extractCharacterData(embedded)).toEqual(card);
  });

  it('展开单键 data 包装（与 v1/前端 character_data 结构兼容）', () => {
    const inner = { name: '内层角色' };
    const png = buildMinimalPng();
    const embedded = embedCharacterData(png, { data: inner });

    // 嵌入时去掉 data 包装，提取结果应与内层一致
    expect(extractCharacterData(embedded)).toEqual(inner);
  });

  it('移除旧的 tEXt/zTXt 块，保留其他块并保持 chunk 顺序', () => {
    const oldCard = Buffer.from(JSON.stringify({ name: '旧角色' }), 'utf-8').toString('base64');
    const png = buildMinimalPng([
      { keyword: 'chara', text: oldCard },
      { keyword: 'Author', text: 'old author' },
      { keyword: 'chara', text: oldCard, compressed: true },
    ]);

    const newCard = { name: '新角色' };
    const embedded = embedCharacterData(png, newCard);

    const chunks = readPngChunks(embedded);

    // 结构：IHDR, IDAT, tEXt(chara), IEND
    expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'tEXt', 'IEND']);

    // 文本块只有 chara，且内容是新卡
    const textChunk = chunks[2];
    const nullPos = textChunk.data.indexOf(0);
    const keyword = textChunk.data.subarray(0, nullPos).toString('latin1');
    const b64 = textChunk.data.subarray(nullPos + 1).toString('latin1');
    expect(keyword).toBe('chara');
    expect(JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))).toEqual(newCard);
  });

  it('保留非文本 chunk（IHDR/IDAT 等）的原始字节', () => {
    const png = buildMinimalPng([{ keyword: 'Author', text: 'x' }]);
    const embedded = embedCharacterData(png, { name: 'A' });

    const before = readPngChunks(png);
    const after = readPngChunks(embedded);

    expect(after[0].data.equals(before[0].data)).toBe(true); // IHDR
    expect(after[1].data.equals(before[1].data)).toBe(true); // IDAT
  });

  it('非 PNG 输入抛错', () => {
    expect(() => embedCharacterData(Buffer.from('garbage'), {})).toThrow('非法的 PNG 文件格式');
  });

  it('生成的 PNG chunk 长度与 CRC 合法', () => {
    const png = buildMinimalPng();
    const embedded = embedCharacterData(png, { name: 'CRC测试' });

    // 手工遍历 chunk，校验 length 与 CRC
    let offset = 8;
    while (offset < embedded.length) {
      const length = embedded.readUInt32BE(offset);
      const type = embedded.subarray(offset + 4, offset + 8);
      const data = embedded.subarray(offset + 8, offset + 8 + length);
      const storedCrc = embedded.readUInt32BE(offset + 8 + length);
      expect(storedCrc).toBe(pngCrc32(Buffer.concat([type, data])));
      offset += 12 + length;
    }
  });
});
