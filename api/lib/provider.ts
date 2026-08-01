/**
 * LLM Provider 工厂。
 * 通过用户选择显式决定使用 Chat Completions 或 Responses API。
 */
import { createOpenAI } from '@ai-sdk/openai';
import type { TranslationSettings } from './schemas';

/**
 * 将用户填写的服务根地址转换为当前协议使用的 API 根地址。
 * Chat Completions 使用 /v1，DeepSeek Responses 使用服务根路径。
 */
export function normalizeBaseUrl(baseUrl: string, apiMode: TranslationSettings['api_mode']) {
  const url = new URL(baseUrl);
  let pathname = url.pathname.replace(/\/+$/, '');

  if (pathname.endsWith('/v1')) {
    pathname = pathname.slice(0, -3).replace(/\/+$/, '');
  }

  if (apiMode === 'chat') {
    pathname = `${pathname}/v1`;
  }

  url.pathname = pathname || '/';
  return url.toString().replace(/\/$/, '');
}

/**
 * 创建官方 OpenAI provider。
 * baseURL 仍由用户提供，因此可连接 OpenAI 兼容网关；Responses 模式
 * 仅适用于该服务实际提供 /responses 端点的情况。
 */
export function createProvider(settings: TranslationSettings) {
  const baseURL = normalizeBaseUrl(settings.base_url, settings.api_mode);
  const providerName = new URL(baseURL).hostname;

  return createOpenAI({
    name: providerName,
    baseURL,
    apiKey: settings.api_key,
  });
}

/** 根据设置返回 Chat Completions 或 Responses language model。 */
export function getModel(settings: TranslationSettings) {
  const provider = createProvider(settings);
  return settings.api_mode === 'responses'
    ? provider.responses(settings.model_name)
    : provider.chat(settings.model_name);
}
