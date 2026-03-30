import { app, safeStorage } from 'electron';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface PersistedDesktopSession {
  encryption: 'safe-storage';
  token: string;
  updatedAt: string;
}

function parsePersistedDesktopSession(raw: string): PersistedDesktopSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedDesktopSession>;
    // Security: Only accept safe-storage encrypted tokens
    if (parsed.encryption === 'safe-storage' && typeof parsed.token === 'string') {
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
  private readonly canPersist: boolean;

  constructor() {
    // Security: Only persist if OS-level encryption is available
    this.canPersist = safeStorage.isEncryptionAvailable();
    this.cachedToken = this.loadTokenFromDisk();
  }

  getToken() {
    return this.cachedToken;
  }

  setToken(token: string) {
    this.cachedToken = token;
    // Only persist to disk if secure storage is available
    if (this.canPersist) {
      this.persistTokenToDisk(token);
    }
    // If no secure storage, token stays in memory only - requires re-login after app restart
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

    // Security: Only load if we can decrypt (safe storage available)
    if (!safeStorage.isEncryptionAvailable()) {
      // Remove any existing persisted session - it cannot be securely read
      rmSync(this.filePath, { force: true });
      return null;
    }

    const persisted = parsePersistedDesktopSession(readFileSync(this.filePath, 'utf8'));
    if (!persisted) {
      return null;
    }

    try {
      return safeStorage.decryptString(Buffer.from(persisted.token, 'base64'));
    } catch {
      // Decryption failed (possibly different machine/user) - remove invalid session
      rmSync(this.filePath, { force: true });
      return null;
    }
  }

  private persistTokenToDisk(token: string) {
    // Security: Never persist without encryption
    if (!safeStorage.isEncryptionAvailable()) {
      return;
    }

    mkdirSync(path.dirname(this.filePath), { recursive: true });

    const persisted: PersistedDesktopSession = {
      encryption: 'safe-storage',
      token: safeStorage.encryptString(token).toString('base64'),
      updatedAt: new Date().toISOString(),
    };

    writeFileSync(this.filePath, JSON.stringify(persisted, null, 2), 'utf8');
  }
}
