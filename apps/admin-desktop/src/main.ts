import { app, BrowserWindow, nativeImage, session, shell } from 'electron';
import path from 'node:path';
import { startLocalStaticServer, type LocalStaticServer } from './local-server';
import { resolveDesktopApiBaseUrl } from './runtime';
import { DesktopSessionStore } from './session-store';

let mainWindow: BrowserWindow | null = null;
let localStaticServer: LocalStaticServer | null = null;
let desktopSessionStore: DesktopSessionStore | null = null;
let desktopSessionTransportConfigured = false;

// Allowed URL protocols for external links
const ALLOWED_EXTERNAL_PROTOCOLS = ['https:'];
// Allow http only in development
if (process.env.NODE_ENV === 'development') {
  ALLOWED_EXTERNAL_PROTOCOLS.push('http:');
}

function getDesktopPaths() {
  const distDir = __dirname;
  return {
    appIconPath: path.resolve(distDir, '../assets/icon.icns'),
    dockIconPath: path.resolve(distDir, '../assets/electron.icon'),
    preloadPath: path.join(distDir, 'preload.js'),
    rendererDistPath: path.resolve(distDir, '../../admin-web/dist'),
  };
}

function resolveMacDockIcon() {
  const { appIconPath, dockIconPath } = getDesktopPaths();
  const bundleIcon = nativeImage.createFromPath(dockIconPath);
  if (!bundleIcon.isEmpty()) {
    return bundleIcon;
  }

  return nativeImage.createFromPath(appIconPath);
}

function validateStartUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // In production, only allow https or localhost http
    if (process.env.NODE_ENV === 'production') {
      if (parsed.protocol === 'https:') return true;
      if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        return true;
      }
      return false;
    }
    // In development, allow http and https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function resolveRendererUrl() {
  const configuredStartUrl = process.env.BAKKI_DESKTOP_START_URL?.trim();
  if (configuredStartUrl) {
    if (!validateStartUrl(configuredStartUrl)) {
      console.error(`Invalid BAKKI_DESKTOP_START_URL: ${configuredStartUrl}. Must be http(s) with valid host.`);
      throw new Error('Invalid start URL configuration');
    }
    return configuredStartUrl;
  }

  if (!localStaticServer) {
    const { rendererDistPath } = getDesktopPaths();
    localStaticServer = await startLocalStaticServer(rendererDistPath);
  }

  return localStaticServer.url;
}

function normalizeHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function getResponseHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  headerName: string,
) {
  const matchingHeaderName = Object.keys(headers).find((name) => name.toLowerCase() === headerName.toLowerCase());
  if (!matchingHeaderName) {
    return undefined;
  }

  return normalizeHeaderValue(headers[matchingHeaderName]);
}

function configureDesktopSessionTransport() {
  if (desktopSessionTransportConfigured) {
    return;
  }

  desktopSessionStore = new DesktopSessionStore();
  const apiBaseUrl = resolveDesktopApiBaseUrl().replace(/\/+$/, '');
  const apiFilter = { urls: [`${apiBaseUrl}*`] };

  session.defaultSession.webRequest.onBeforeSendHeaders(apiFilter, (details, callback) => {
    const requestHeaders: Record<string, string> = {
      ...details.requestHeaders,
      'x-bakki-client': 'desktop',
    };
    const sessionToken = desktopSessionStore?.getToken();

    if (sessionToken) {
      requestHeaders['x-bakki-session'] = sessionToken;
    } else {
      delete requestHeaders['x-bakki-session'];
    }

    callback({ requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived(apiFilter, (details, callback) => {
    const responseHeaders = details.responseHeaders ?? {};
    const nextSessionToken = getResponseHeaderValue(responseHeaders, 'x-bakki-session');
    const clearSessionMarker = getResponseHeaderValue(responseHeaders, 'x-bakki-clear-session');

    if (clearSessionMarker === '1') {
      desktopSessionStore?.clearToken();
    } else if (nextSessionToken) {
      desktopSessionStore?.setToken(nextSessionToken);
    } else if (details.statusCode === 401) {
      desktopSessionStore?.clearToken();
    }

    callback({ responseHeaders });
  });

  desktopSessionTransportConfigured = true;
}

function configureContentSecurityPolicy() {
  const apiBaseUrl = resolveDesktopApiBaseUrl().replace(/\/+$/, '');
  
  // Build CSP directive - restrictive by default
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Required for some CSS-in-JS patterns
    "img-src 'self' data: blob:",
    `connect-src 'self' ${apiBaseUrl}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = {
      ...details.responseHeaders,
      'Content-Security-Policy': [cspDirectives],
      'X-Content-Type-Options': ['nosniff'],
      'X-Frame-Options': ['DENY'],
    };
    callback({ responseHeaders });
  });
}

async function createMainWindow() {
  const { appIconPath, preloadPath } = getDesktopPaths();
  const rendererUrl = await resolveRendererUrl();

  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundColor: '#eef3ed',
    height: 1024,
    icon: appIconPath,
    minHeight: 820,
    minWidth: 1280,
    show: false,
    title: 'Bakki Manager',
    width: 1600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      // sandbox: false is required because the preload script needs to read
      // environment variables for runtime configuration. The preload bridge
      // is minimal (read-only config only) and contextIsolation is enabled.
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      // Security: Only allow explicitly allowed protocols for external links
      if (ALLOWED_EXTERNAL_PROTOCOLS.includes(parsedUrl.protocol)) {
        void shell.openExternal(url);
      }
    } catch {
      // Invalid URL, ignore
    }
    return { action: 'deny' };
  });

  await mainWindow.loadURL(rendererUrl);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (localStaticServer) {
    localStaticServer.close().catch((err) => {
      console.error('Failed to close local server:', err);
    });
    localStaticServer = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch((err) => {
      console.error('Failed to create main window:', err);
    });
  }
});

app.whenReady().then(async () => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(resolveMacDockIcon());
  }

  configureContentSecurityPolicy();
  configureDesktopSessionTransport();
  await createMainWindow();
}).catch((err) => {
  console.error('Failed to initialize app:', err);
  app.quit();
});
