import type { SessionEntry, SessionStore } from './session-store.interface';

/**
 * In-memory session store for development and testing.
 * Sessions are lost on server restart.
 */
export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly userIndex = new Map<number, Set<string>>();
  private readonly usernameIndex = new Map<string, Set<string>>();

  async set(token: string, entry: SessionEntry): Promise<void> {
    // Remove from old indexes if updating
    const existing = this.sessions.get(token);
    if (existing) {
      this.removeFromIndexes(token, existing);
    }

    this.sessions.set(token, entry);
    this.addToIndexes(token, entry);
  }

  async get(token: string): Promise<SessionEntry | null> {
    const entry = this.sessions.get(token);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      await this.delete(token);
      return null;
    }

    return entry;
  }

  async delete(token: string): Promise<void> {
    const entry = this.sessions.get(token);
    if (entry) {
      this.removeFromIndexes(token, entry);
      this.sessions.delete(token);
    }
  }

  async refresh(token: string, newExpiresAt: number): Promise<SessionEntry | null> {
    const entry = this.sessions.get(token);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      await this.delete(token);
      return null;
    }

    // Atomic update
    entry.issuedAt = Date.now();
    entry.expiresAt = newExpiresAt;
    return entry;
  }

  async revokeByUserId(userId: number): Promise<number> {
    const tokens = this.userIndex.get(userId);
    if (!tokens) {
      return 0;
    }

    let count = 0;
    for (const token of tokens) {
      const entry = this.sessions.get(token);
      if (entry) {
        this.removeFromIndexes(token, entry);
        this.sessions.delete(token);
        count++;
      }
    }

    return count;
  }

  async revokeByUsername(username: string): Promise<number> {
    const tokens = this.usernameIndex.get(username);
    if (!tokens) {
      return 0;
    }

    let count = 0;
    for (const token of tokens) {
      const entry = this.sessions.get(token);
      if (entry) {
        this.removeFromIndexes(token, entry);
        this.sessions.delete(token);
        count++;
      }
    }

    return count;
  }

  async pruneExpired(): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [token, entry] of this.sessions.entries()) {
      if (entry.expiresAt <= now) {
        this.removeFromIndexes(token, entry);
        this.sessions.delete(token);
        count++;
      }
    }

    return count;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  private addToIndexes(token: string, entry: SessionEntry): void {
    if (entry.userId !== null) {
      let userTokens = this.userIndex.get(entry.userId);
      if (!userTokens) {
        userTokens = new Set();
        this.userIndex.set(entry.userId, userTokens);
      }
      userTokens.add(token);
    }

    let usernameTokens = this.usernameIndex.get(entry.username);
    if (!usernameTokens) {
      usernameTokens = new Set();
      this.usernameIndex.set(entry.username, usernameTokens);
    }
    usernameTokens.add(token);
  }

  private removeFromIndexes(token: string, entry: SessionEntry): void {
    if (entry.userId !== null) {
      const userTokens = this.userIndex.get(entry.userId);
      if (userTokens) {
        userTokens.delete(token);
        if (userTokens.size === 0) {
          this.userIndex.delete(entry.userId);
        }
      }
    }

    const usernameTokens = this.usernameIndex.get(entry.username);
    if (usernameTokens) {
      usernameTokens.delete(token);
      if (usernameTokens.size === 0) {
        this.usernameIndex.delete(entry.username);
      }
    }
  }
}
