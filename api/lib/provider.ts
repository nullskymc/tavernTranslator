/**
 * LLM Provider 工厂
 * 只负责构造 OpenAI-compatible provider，不包含业务提示词
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { TranslationSettings } from './schemas';

/**
 * 根据用户设置创建 OpenAI-compatible provider 实例。
 * 支持任意兼容 OpenAI API 的服务（OpenRouter、本地 Ollama、Azure 等）。
 */
export function createProvider(settings: TranslationSettings) {
  // 从 base_url 提取服务名称用于日志标识
  const providerName = new URL(settings.base_url).hostname;

  return createOpenAICompatible({
    name: providerName,
    baseURL: settings.base_url,
    apiKey: settings.api_key,
  });
}

/**
 * 获取指定模型的 language model 实例
 */
export function getModel(settings: TranslationSettings) {
  const provider = createProvider(settings);
  return provider.chatModel(settings.model_name);
}
