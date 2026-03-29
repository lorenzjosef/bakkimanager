/// <reference types="vite/client" />

interface BakkiDesktopRuntimeConfig {
  apiBaseUrl: string;
  isDesktop: true;
}

interface Window {
  bakkiDesktop?: {
    runtime: BakkiDesktopRuntimeConfig;
  };
}
