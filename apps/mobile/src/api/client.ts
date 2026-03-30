import { config } from '../config';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
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
  const { method = 'GET', body, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-bakki-client': 'mobile',
    ...headers,
  };

  if (sessionToken) {
    requestHeaders['x-bakki-session'] = sessionToken;
  }

  const url = `${config.apiBaseUrl}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

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
  get<T>(endpoint: string, headers?: Record<string, string>) {
    return apiRequest<T>(endpoint, { method: 'GET', headers });
  },
  post<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return apiRequest<T>(endpoint, { method: 'POST', body, headers });
  },
  put<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return apiRequest<T>(endpoint, { method: 'PUT', body, headers });
  },
  patch<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return apiRequest<T>(endpoint, { method: 'PATCH', body, headers });
  },
  delete<T>(endpoint: string, headers?: Record<string, string>) {
    return apiRequest<T>(endpoint, { method: 'DELETE', headers });
  },
};
