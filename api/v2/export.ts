/**
 * /api/v2/export — 将角色卡 JSON 嵌入 PNG 并返回下载
 * 生成 PNG 后保存到 .outputs/ 并返回下载
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { embedCharacterData } from '../lib/character-card-png';
import { saveExportedPng } from '../lib/file-storage';
import { sendError, readMultipartFields } from './_helpers';

/** POST /api/v2/export — multipart/form-data, fields: "json_data" + "image_file" */
export async function handleExport(req: IncomingMessage, res: ServerResponse) {
  try {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.includes('multipart/form-data')) {
      sendError(res, 400, '请使用 multipart/form-data 提交。');
      return;
    }

    // 读取完整请求体
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    const boundary = contentType.split('boundary=')[1]?.replace(/;.*$/, '').trim();
    if (!boundary) {
      sendError(res, 400, '无法解析上传边界。');
      return;
    }

    // 提取 json_data 文本字段和 image_file 文件字段
    const fields = readMultipartFields(body, boundary);
    const jsonDataStr = fields.textFields.get('json_data');
    const imageBuffer = fields.fileFields.get('image_file');

    if (!jsonDataStr) {
      sendError(res, 400, '缺少 json_data 字段。');
      return;
    }
    if (!imageBuffer) {
      sendError(res, 400, '缺少 image_file 字段。');
      return;
    }

    // 解析 JSON
    let characterData: Record<string, unknown>;
    try {
      characterData = JSON.parse(jsonDataStr);
    } catch {
      sendError(res, 400, '提供了无效的 JSON 数据。');
      return;
    }

    // 嵌入数据到 PNG
    const outputPng = embedCharacterData(imageBuffer, characterData);
    await saveExportedPng(outputPng);

    // 确定下载文件名
    const data = characterData.data as Record<string, unknown> | undefined;
    const charName = (data?.name as string) ?? (characterData.name as string) ?? 'character';
    const downloadName = `${charName}.png`;

    // 返回 PNG 文件
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      'Content-Length': outputPng.length,
    });
    res.end(outputPng);
  } catch (err) {
    sendError(res, 500, '导出过程中发生内部错误。');
  }
}
