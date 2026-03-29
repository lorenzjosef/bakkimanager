import type { ApiErrorResponse } from '@bakki/domain';

const DEFAULT_API_BASE_URL = '/api/v1';

function isLoopbackHost(hostname: string) {
  return hostname === '127.0.0.1'
    || hostname === 'localhost'
    || hostname === '::1'
    || hostname === '[::1]';
}

function getDesktopRuntimeApiBaseUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.bakkiDesktop?.runtime.apiBaseUrl?.trim() || null;
}

function getApiBaseUrl() {
  const desktopRuntimeBaseUrl = getDesktopRuntimeApiBaseUrl();
  if (desktopRuntimeBaseUrl) {
    return desktopRuntimeBaseUrl;
  }

  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    return DEFAULT_API_BASE_URL;
  }

  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return configuredBaseUrl;
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl, window.location.origin);
    if (
      isLoopbackHost(configuredUrl.hostname)
      && isLoopbackHost(window.location.hostname)
      && configuredUrl.origin !== window.location.origin
    ) {
      return DEFAULT_API_BASE_URL;
    }
  } catch {
    return configuredBaseUrl;
  }

  return configuredBaseUrl;
}

export async function fetchApiJson<T>(path: string): Promise<T> {
  return requestApiJson<T>(path);
}

interface RequestApiJsonOptions {
  body?: unknown;
  headers?: HeadersInit;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

export async function requestApiJson<T>(path: string, options: RequestApiJsonOptions = {}): Promise<T> {
  const { body, headers, method = 'GET' } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let message = `API request failed for ${path}: ${response.status}`;

    try {
      const payload = await response.json() as ApiErrorResponse | { message?: string | string[] };
      if ('error' in payload && payload.error) {
        if (Array.isArray(payload.error.details) && payload.error.details.length > 0) {
          message = payload.error.details.join(', ');
        } else if (typeof payload.error.message === 'string' && payload.error.message) {
          message = payload.error.message;
        }
      } else if ('message' in payload) {
        if (Array.isArray(payload.message)) {
          message = payload.message.join(', ');
        } else if (typeof payload.message === 'string' && payload.message) {
          message = payload.message;
        }
      }
    } catch {
      // Keep the default message when the error body is not JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function postApiJson<T>(path: string, body: unknown): Promise<T> {
  return requestApiJson<T>(path, { method: 'POST', body });
}

export async function patchApiJson<T>(path: string, body: unknown): Promise<T> {
  return requestApiJson<T>(path, { method: 'PATCH', body });
}
