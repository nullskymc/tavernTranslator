/**
 * API 服务层
 * 封装所有后端 API 调用，提供类型安全的接口
 */
import { request, requestBlob, requestForm, requestJson } from './http';
export { ApiError } from './http';

// ------------------------------------------------------------------
// 类型定义
// ------------------------------------------------------------------

export interface TranslationSettings {
  api_key: string;
  base_url: string;
  model_name: string;
  api_mode: 'chat' | 'responses';
}

export interface Prompts {
  base_template: string;
  description_template: string;
  dialogue_template: string;
}

export interface BatchFieldItem {
  field_name: string;
  text: string;
}

export interface BatchResultItem {
  field_name: string;
  original_text: string;
  translated_text: string;
  success: boolean;
  error?: string;
  attempts: number;
}


// ------------------------------------------------------------------
// 上传 API
// ------------------------------------------------------------------

export async function uploadCharacterCard(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return requestForm<{
    character_data: Record<string, any>;
    image_b64: string;
  }>('/character/upload', formData);
}

// ------------------------------------------------------------------
// 翻译 API
// ------------------------------------------------------------------

export async function translateField(params: {
  text: string;
  field_name: string;
  settings: TranslationSettings;
  prompts: Prompts;
  glossary?: string;
}) {
  return requestJson<{ translated_text: string }>('/character/translate', {
    ...params,
    glossary: params.glossary ?? '',
  });
}

export async function translateCharacterBook(params: {
  content: string;
  settings: TranslationSettings;
  prompts: Prompts;
  glossary?: string;
}) {
  return requestJson<{ translated_content: string }>('/character/translate-character-book', {
    ...params,
    glossary: params.glossary ?? '',
  });
}

export async function batchTranslate(params: {
  fields: BatchFieldItem[];
  settings: TranslationSettings;
  prompts: Prompts;
  glossary?: string;
}) {
  return requestJson<{
    results: BatchResultItem[];
    progress: { completed: number; total: number };
  }>('/character/batch-translate', {
    ...params,
    glossary: params.glossary ?? '',
  });
}

// ------------------------------------------------------------------
// 导出 API
// ------------------------------------------------------------------

export async function exportCardAsImage(params: {
  json_data: string;
  image_blob: Blob;
}) {
  const formData = new FormData();
  formData.append('json_data', params.json_data);
  formData.append('image_file', params.image_blob, 'character_base.png');
  return requestBlob('/character/export', formData);
}

// ------------------------------------------------------------------
// 健康检查
// ------------------------------------------------------------------

export async function healthCheck() {
  return request<{ status: string; version: string }>('/health', { method: 'GET' });
}
