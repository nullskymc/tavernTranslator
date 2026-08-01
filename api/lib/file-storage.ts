/**
 * 本地文件存储。
 * 保留旧版 Node/Python 服务的上传与导出落盘行为；目录仅用于本地运行，
 * 不参与角色卡数据的业务解析。
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const uploadDirectory = resolve(projectRoot, '.uploads');
const outputDirectory = resolve(projectRoot, '.outputs');

function characterName(characterData: Record<string, unknown>): string {
  const data = characterData.data;
  const nestedName = data && typeof data === 'object'
    ? (data as Record<string, unknown>).name
    : undefined;
  const name = nestedName ?? characterData.name;
  return typeof name === 'string' && name.trim() ? name : '未命名';
}

/** 生成旧版规则一致的安全文件名，避免角色名污染路径。 */
function safeCharacterName(name: string): string {
  return name
    .replace(/\s+/g, '_')
    .replace(/[\\/*?:"<>|]/g, '')
    .trim()
    .replace(/^[.]+|[.]+$/g, '') || '未命名';
}

async function ensureDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
}

/** 保存上传 PNG；同名同内容复用文件，不同内容追加内容哈希避免覆盖。 */
export async function saveUploadedPng(
  content: Buffer,
  characterData: Record<string, unknown>,
): Promise<string> {
  await ensureDirectory(uploadDirectory);
  const safeName = safeCharacterName(characterName(characterData));
  const hash = createHash('sha256').update(content).digest('hex');
  const basePath = resolve(uploadDirectory, `${safeName}.png`);

  try {
    const existingHash = createHash('sha256').update(await readFile(basePath)).digest('hex');
    if (existingHash === hash) return basePath;
    return await writeUniqueUpload(content, safeName, hash);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
    await writeFile(basePath, content);
    return basePath;
  }
}

async function writeUniqueUpload(content: Buffer, safeName: string, hash: string): Promise<string> {
  const uniquePath = resolve(uploadDirectory, `${safeName}_${hash.slice(0, 7)}.png`);
  await writeFile(uniquePath, content);
  return uniquePath;
}

/** 保存导出的 PNG，返回实际落盘路径。 */
export async function saveExportedPng(content: Buffer): Promise<string> {
  await ensureDirectory(outputDirectory);
  const filename = `character_export_${Date.now()}_${createHash('sha1').update(content).digest('hex').slice(0, 8)}.png`;
  const outputPath = resolve(outputDirectory, filename);
  await writeFile(outputPath, content);
  return outputPath;
}

export { uploadDirectory, outputDirectory };
