/**
 * PNG 角色卡编解码 — 纯 Node.js 实现
 * 替代 Python Pillow 依赖，在内存中处理 PNG tEXt/zTXt 块
 * 
 * SillyTavern 角色卡 PNG 格式：
 * - 在 tEXt 块中存储 keyword="chara"，text=base64(JSON)
 * - 写入时移除旧文本块，在 IEND 前插入新 tEXt 块
 */
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

// ------------------------------------------------------------------
// CRC32 实现（Node zlib 不直接导出 crc32，需自行计算）
// ------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ------------------------------------------------------------------
// PNG 签名
// ------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ------------------------------------------------------------------
// 提取角色卡数据
// ------------------------------------------------------------------

/**
 * 从 PNG 字节流中提取嵌入的角色卡 JSON 数据。
 * 遍历 tEXt 和 zTXt 块，查找 keyword="chara" 的 base64 编码 JSON。
 * 返回解析后的对象，未找到时返回 null。
 */
export function extractCharacterData(pngBytes: Buffer): Record<string, unknown> | null {
  // 验证 PNG 文件头
  if (!pngBytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null;
  }

  let offset = 8; // 跳过签名

  while (offset < pngBytes.length) {
    // 读取块长度和类型
    if (offset + 8 > pngBytes.length) break;
    const chunkLength = pngBytes.readUInt32BE(offset);
    const chunkType = pngBytes.subarray(offset + 4, offset + 8).toString('ascii');
    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkLength;

    if (chunkDataEnd + 4 > pngBytes.length) break;
    const chunkData = pngBytes.subarray(chunkDataStart, chunkDataEnd);

    if (chunkType === 'tEXt') {
      // tEXt 格式: keyword\0text
      const nullPos = chunkData.indexOf(0);
      if (nullPos !== -1) {
        const keyword = chunkData.subarray(0, nullPos).toString('latin1');
        const textData = chunkData.subarray(nullPos + 1).toString('latin1');

        if (keyword === 'chara') {
          try {
            const decoded = Buffer.from(textData, 'base64').toString('utf-8');
            return JSON.parse(decoded);
          } catch { /* 继续搜索 */ }
        }
      }
    } else if (chunkType === 'zTXt') {
      // zTXt 格式: keyword\0compression_method\0compressed_text
      const nullPos = chunkData.indexOf(0);
      if (nullPos !== -1) {
        const keyword = chunkData.subarray(0, nullPos).toString('latin1');
        // 跳过 keyword + null + compression_method (1 byte)
        const compressed = chunkData.subarray(nullPos + 2);

        if (keyword === 'chara') {
          try {
            const decompressed = inflateSync(compressed).toString('utf-8');
            // SillyTavern 的 zTXt 通常压缩 base64(JSON)；
            // 个别实现直接压缩 JSON 文本，两者都兼容。
            if (decompressed.trim().startsWith('{')) {
              return JSON.parse(decompressed);
            }
            const decoded = Buffer.from(decompressed, 'base64').toString('utf-8');
            return JSON.parse(decoded);
          } catch { /* 继续搜索 */ }
        }
      }
    }

    // 移动到下一个块: length(4) + type(4) + data(chunkLength) + crc(4)
    offset += 12 + chunkLength;
  }

  return null;
}

// ------------------------------------------------------------------
// 嵌入角色卡数据
// ------------------------------------------------------------------

/**
 * 将角色卡 JSON 数据嵌入 PNG 字节流。
 * 1. 移除所有现有 tEXt/zTXt 块
 * 2. 构造新的 tEXt 块 (keyword="chara", text=base64(JSON))
 * 3. 在 IEND 前插入新块
 * 返回新的 PNG Buffer。
 */
export function embedCharacterData(pngBytes: Buffer, characterData: Record<string, unknown>): Buffer {
  // 验证 PNG 文件头
  if (!pngBytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('非法的 PNG 文件格式');
  }

  // 提取实际角色数据（去掉 "data" 包装层如果存在且是唯一键）
  const keys = Object.keys(characterData);
  const actualData = (keys.length === 1 && keys[0] === 'data')
    ? characterData.data
    : characterData;

  // 编码为 base64
  const jsonStr = JSON.stringify(actualData);
  const b64Data = Buffer.from(jsonStr, 'utf-8').toString('base64');

  // 构造 tEXt 块内容: keyword\0text
  const keyword = Buffer.from('chara', 'latin1');
  const textBytes = Buffer.from(b64Data, 'utf-8');
  const chunkContent = Buffer.concat([keyword, Buffer.from([0]), textBytes]);

  // 构造完整块: length + type + data + crc
  const chunkType = Buffer.from('tEXt', 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(chunkContent.length, 0);
  const crcInput = Buffer.concat([chunkType, chunkContent]);
  const crcValue = computeCrc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcValue, 0);

  const newTextChunk = Buffer.concat([lengthBuf, chunkType, chunkContent, crcBuf]);

  // 遍历原始块，收集除 tEXt/zTXt/IEND 外的所有块
  const chunks: Buffer[] = [];
  let offset = 8;

  while (offset < pngBytes.length) {
    if (offset + 8 > pngBytes.length) break;
    const chunkLength = pngBytes.readUInt32BE(offset);
    const chunkType = pngBytes.subarray(offset + 4, offset + 8).toString('ascii');
    const totalChunkSize = 12 + chunkLength; // length(4) + type(4) + data + crc(4)

    if (chunkType !== 'tEXt' && chunkType !== 'zTXt' && chunkType !== 'IEND') {
      chunks.push(pngBytes.subarray(offset, offset + totalChunkSize));
    }

    offset += totalChunkSize;
  }

  // 重构 PNG: 签名 + 保留块 + 新文本块 + IEND
  const iendChunk = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

  return Buffer.concat([
    PNG_SIGNATURE,
    ...chunks,
    newTextChunk,
    iendChunk,
  ]);
}
