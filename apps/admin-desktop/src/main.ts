import { app, BrowserWindow, nativeImage, session, shell } from 'electron';
import path from 'node:path';
import { startLocalStaticServer, type LocalStaticServer } from './local-server';
import { resolveDesktopApiBaseUrl } from './runtime';
import { DesktopSessionStore } from './session-store';

let mainWindow: BrowserWindow | null = null;
let localStaticServer: LocalStaticServer | null = null;
let desktopSessionStore: DesktopSessionStore | null = null;
let desktopSessionTransportConfigured = false;

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

async function resolveRendererUrl() {
  const configuredStartUrl = process.env.BAKKI_DESKTOP_START_URL?.trim();
  if (configuredStartUrl) {
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
    void shell.openExternal(url);
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
    void localStaticServer.close();
    localStaticServer = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow();
  }
});

void app.whenReady().then(async () => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(resolveMacDockIcon());
  }

  configureDesktopSessionTransport();
  await createMainWindow();
});
