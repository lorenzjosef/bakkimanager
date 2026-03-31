import { config } from '../config';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

interface ApiError {
  message: string;
  statusCode: number;
}

let sessionToken: string | null = null;
const DEFAULT_TIMEOUT_MS = 20_000;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-bakki-client': 'mobile',
    ...headers,
  };

  if (sessionToken) {
    requestHeaders['x-bakki-session'] = sessionToken;
  }

  const url = `${config.apiBaseUrl}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  // Check for session token in response header
  const responseToken = response.headers.get('x-bakki-session');
  if (responseToken) {
    sessionToken = responseToken;
  }

  // Check for session clear signal
  const clearSession = response.headers.get('x-bakki-clear-session');
  if (clearSession === '1') {
    sessionToken = null;
  }

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      message: response.statusText,
      statusCode: response.status,
    }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    data,
    status: response.status,
  };
}

/**
 * Convenience client object for common HTTP methods.
 */
export const apiClient = {
  get<T>(endpoint: string, headers?: Record<string, string>, timeoutMs?: number) {
    return apiRequest<T>(endpoint, { method: 'GET', headers, timeoutMs });
  },
  post<T>(endpoint: string, body?: unknown, headers?: Record<string, string>, timeoutMs?: number) {
    return apiRequest<T>(endpoint, { method: 'POST', body, headers, timeoutMs });
  },
  put<T>(endpoint: string, body?: unknown, headers?: Record<string, string>, timeoutMs?: number) {
    return apiRequest<T>(endpoint, { method: 'PUT', body, headers, timeoutMs });
  },
  patch<T>(endpoint: string, body?: unknown, headers?: Record<string, string>, timeoutMs?: number) {
    return apiRequest<T>(endpoint, { method: 'PATCH', body, headers, timeoutMs });
  },
  delete<T>(endpoint: string, headers?: Record<string, string>, timeoutMs?: number) {
    return apiRequest<T>(endpoint, { method: 'DELETE', headers, timeoutMs });
  },
};
