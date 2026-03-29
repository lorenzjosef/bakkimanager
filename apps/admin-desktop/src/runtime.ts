export const DEFAULT_DESKTOP_API_BASE_URL = 'http://127.0.0.1:4175/v1';

export function resolveDesktopApiBaseUrl() {
  return process.env.BAKKI_DESKTOP_API_BASE_URL?.trim() || DEFAULT_DESKTOP_API_BASE_URL;
}

export function resolveDesktopRuntime() {
  return {
    apiBaseUrl: resolveDesktopApiBaseUrl(),
    isDesktop: true as const,
  };
}
