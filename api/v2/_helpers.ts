/**
 * HTTP 辅助工具 — 请求解析、响应序列化、multipart 处理
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

// ------------------------------------------------------------------
// JSON 请求/响应
// ------------------------------------------------------------------

/** 读取并解析 JSON 请求体 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

/** 发送 JSON 响应 */
export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** 发送错误响应（与 v1 的 { detail: string } 格式一致） */
export function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { detail: message });
}

// ------------------------------------------------------------------
// Multipart 解析（轻量实现，不引入外部依赖）
// ------------------------------------------------------------------

/**
 * 从 multipart body 中提取指定名称的文件字段
 */
export function readMultipartField(body: Buffer, boundary: string, fieldName: string): Buffer | null {
  const fields = readMultipartFields(body, boundary);
  return fields.fileFields.get(fieldName) ?? null;
}

/**
 * 解析 multipart body，返回所有文本字段和文件字段
 */
export function readMultipartFields(
  body: Buffer,
  boundary: string
): { textFields: Map<string, string>; fileFields: Map<string, Buffer> } {
  const textFields = new Map<string, string>();
  const fileFields = new Map<string, Buffer>();

  const delimiterBuf = Buffer.from(`--${boundary}`);
  const endBuf = Buffer.from(`--${boundary}--`);

  // 按 boundary 分割
  const parts: Buffer[] = [];
  let start = body.indexOf(delimiterBuf);
  if (start === -1) return { textFields, fileFields };

  start += delimiterBuf.length;
  while (start < body.length) {
    // 跳过 CRLF
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2;

    let end = body.indexOf(delimiterBuf, start);
    if (end === -1) break;

    // 去掉尾部 CRLF
    let partEnd = end;
    if (body[partEnd - 2] === 0x0d && body[partEnd - 1] === 0x0a) partEnd -= 2;

    parts.push(body.subarray(start, partEnd));
    start = end + delimiterBuf.length;

    // 检查是否为结束标记
    if (body.subarray(end, end + endBuf.length).equals(endBuf)) break;
  }

  // 解析每个 part
  for (const part of parts) {
    // 找到 header/body 分隔（双 CRLF）
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headerStr = part.subarray(0, headerEnd).toString('utf-8');
    const partBody = part.subarray(headerEnd + 4);

    // 解析 Content-Disposition
    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);

    if (!nameMatch) continue;
    const name = nameMatch[1];

    if (filenameMatch) {
      // 文件字段
      fileFields.set(name, Buffer.from(partBody));
    } else {
      // 文本字段
      textFields.set(name, partBody.toString('utf-8'));
    }
  }

  return { textFields, fileFields };
}
