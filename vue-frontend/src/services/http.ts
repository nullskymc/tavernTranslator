/**
 * 轻量 HTTP 传输层。
 * 集中处理 fetch 不会自动处理的状态码、超时、JSON 错误和请求取消，
 * 让业务 API 不需要重复编写这些边界逻辑。
 */

const API_BASE_URL = '/api/v2';
const DEFAULT_TIMEOUT_MS = 120_000;

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function resolveUrl(path: string): string {
  // 业务 API 使用相对路径（如 /character/upload），统一挂到 v2 前缀；
  // 只有调用方明确传入 /api/... 时才认为它已经是完整 API 路径。
  return path.startsWith('/api/')
    ? path
    : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { detail?: string; message?: string };
    return body.detail || body.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

/** 执行请求并统一处理超时、取消、非 2xx 响应。 */
export async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (init.signal) {
    if (init.signal.aborted) abortFromCaller();
    else init.signal.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const response = await fetch(resolveUrl(path), {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(await readErrorMessage(response), response.status);
    }

    return await response.json() as T;
  } finally {
    window.clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}

/** JSON 请求：显式设置请求头和请求体。 */
export function requestJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

/** multipart 请求：不要手动设置 Content-Type，让浏览器生成 boundary。 */
export function requestForm<T>(path: string, body: FormData, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'POST', body, signal });
}

/** Blob 下载请求，供 PNG 导出使用。 */
export async function requestBlob(path: string, body: FormData, signal?: AbortSignal): Promise<Blob> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(signal?.reason);
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  if (signal) {
    if (signal.aborted) abortFromCaller();
    else signal.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const response = await fetch(resolveUrl(path), { method: 'POST', body, signal: controller.signal });
    if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);
    return response.blob();
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
