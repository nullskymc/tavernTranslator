/**
 * API 服务层
 * 封装所有后端 API 调用，提供类型安全的接口
 */
import axios, { type AxiosInstance, type AxiosError } from 'axios';

// ------------------------------------------------------------------
// Axios 实例
// ------------------------------------------------------------------

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 120_000, // 翻译可能耗时较长
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器：统一错误提取
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const detail = error.response?.data?.detail || error.message || '未知错误';
    return Promise.reject(new ApiError(detail, error.response?.status));
  }
);

// ------------------------------------------------------------------
// 错误类型
// ------------------------------------------------------------------

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ------------------------------------------------------------------
// 类型定义
// ------------------------------------------------------------------

export interface TranslationSettings {
  api_key: string;
  base_url: string;
  model_name: string;
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ------------------------------------------------------------------
// 上传 API
// ------------------------------------------------------------------

export async function uploadCharacterCard(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/character/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as {
    character_data: Record<string, any>;
    image_b64: string;
  };
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
  use_langgraph?: boolean;
}) {
  const response = await apiClient.post('/character/translate', {
    ...params,
    glossary: params.glossary ?? '',
    use_langgraph: params.use_langgraph ?? true,
  });
  return response.data as { translated_text: string };
}

export async function translateCharacterBook(params: {
  content: string;
  settings: TranslationSettings;
  prompts: Prompts;
  glossary?: string;
  use_langgraph?: boolean;
}) {
  const response = await apiClient.post('/character/translate-character-book', {
    ...params,
    glossary: params.glossary ?? '',
    use_langgraph: params.use_langgraph ?? true,
  });
  return response.data as { translated_content: string };
}

export async function batchTranslate(params: {
  fields: BatchFieldItem[];
  settings: TranslationSettings;
  prompts: Prompts;
  glossary?: string;
  use_langgraph?: boolean;
}) {
  const response = await apiClient.post('/character/batch-translate', {
    ...params,
    glossary: params.glossary ?? '',
    use_langgraph: params.use_langgraph ?? true,
  });
  return response.data as {
    results: BatchResultItem[];
    progress: { completed: number; total: number };
  };
}

// ------------------------------------------------------------------
// AI Chat API
// ------------------------------------------------------------------

export async function aiChat(params: {
  messages: ChatMessage[];
  settings: TranslationSettings;
  character_card?: Record<string, any> | null;
}) {
  const response = await apiClient.post('/character/ai-chat', params);
  return response.data as { reply: string };
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
  const response = await apiClient.post('/character/export', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
  return response.data as Blob;
}

// ------------------------------------------------------------------
// 健康检查
// ------------------------------------------------------------------

export async function healthCheck() {
  const response = await apiClient.get('/health');
  return response.data as { status: string; version: string };
}

export default apiClient;
