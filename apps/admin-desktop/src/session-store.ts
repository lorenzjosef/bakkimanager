import { app, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface PersistedDesktopSession {
  encryption: 'plaintext' | 'safe-storage';
  token: string;
  updatedAt: string;
}

function parsePersistedDesktopSession(raw: string): PersistedDesktopSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedDesktopSession>;
    if (
      (parsed.encryption === 'plaintext' || parsed.encryption === 'safe-storage')
      && typeof parsed.token === 'string'
    ) {
      return {
        encryption: parsed.encryption,
        token: parsed.token,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export class DesktopSessionStore {
  private readonly filePath = path.join(app.getPath('userData'), 'bakki-session.json');
  private cachedToken: string | null = null;

  constructor() {
    this.cachedToken = this.loadTokenFromDisk();
  }

  getToken() {
    return this.cachedToken;
  }

  setToken(token: string) {
    this.cachedToken = token;
    this.persistTokenToDisk(token);
  }

  clearToken() {
    this.cachedToken = null;

    if (existsSync(this.filePath)) {
      rmSync(this.filePath, { force: true });
    }
  }

  private loadTokenFromDisk() {
    if (!existsSync(this.filePath)) {
      return null;
    }

    const persisted = parsePersistedDesktopSession(readFileSync(this.filePath, 'utf8'));
    if (!persisted) {
      return null;
    }

    if (persisted.encryption === 'safe-storage') {
      if (!safeStorage.isEncryptionAvailable()) {
        return null;
      }

      return safeStorage.decryptString(Buffer.from(persisted.token, 'base64'));
    }

    return persisted.token;
  }

  private persistTokenToDisk(token: string) {
    mkdirSync(path.dirname(this.filePath), { recursive: true });

    const persisted: PersistedDesktopSession = safeStorage.isEncryptionAvailable()
      ? {
          encryption: 'safe-storage',
          token: safeStorage.encryptString(token).toString('base64'),
          updatedAt: new Date().toISOString(),
        }
      : {
          encryption: 'plaintext',
          token,
          updatedAt: new Date().toISOString(),
        };

    writeFileSync(this.filePath, JSON.stringify(persisted, null, 2), 'utf8');
  }
}
