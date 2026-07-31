/**
 * /api/v2/upload — 上传 PNG 角色卡，提取嵌入的 JSON 数据
 * 纯内存处理，不写入磁盘
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extractCharacterData } from '../lib/character-card-png';
import { sendJson, sendError, readMultipartField } from './_helpers';

/** POST /api/v2/upload — multipart/form-data, field: "file" */
export async function handleUpload(req: IncomingMessage, res: ServerResponse) {
  try {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('multipart/form-data')) {
      sendError(res, 400, '请使用 multipart/form-data 上传文件。');
      return;
    }

    // 读取完整请求体
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    // 从 multipart 中提取文件字段
    const boundary = contentType.split('boundary=')[1]?.replace(/;.*$/, '').trim();
    if (!boundary) {
      sendError(res, 400, '无法解析上传边界。');
      return;
    }

    const fileBuffer = readMultipartField(body, boundary, 'file');
    if (!fileBuffer) {
      sendError(res, 400, '未找到上传文件字段 "file"。');
      return;
    }

    // 验证 PNG 文件头
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (!fileBuffer.subarray(0, 8).equals(pngSig)) {
      sendError(res, 400, '文件类型无效，请上传 .png 文件。');
      return;
    }

    // 提取角色卡数据
    let characterData = extractCharacterData(fileBuffer);
    if (!characterData) {
      characterData = { data: { name: '新角色', description: '' } };
    } else if (!('data' in characterData)) {
      characterData = { data: characterData };
    }

    // 生成 base64 data URI
    const imageB64 = `data:image/png;base64,${fileBuffer.toString('base64')}`;

    sendJson(res, 200, {
      character_data: characterData,
      image_b64: imageB64,
    });
  } catch (err) {
    sendError(res, 500, '处理上传的卡片时发生内部错误。');
  }
}
