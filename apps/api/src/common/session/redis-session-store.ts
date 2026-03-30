import type Redis from 'ioredis';
import type { SessionEntry, SessionStore } from './session-store.interface';

const SESSION_PREFIX = 'bakki:session:';
const USER_INDEX_PREFIX = 'bakki:user_sessions:';
const USERNAME_INDEX_PREFIX = 'bakki:username_sessions:';

/**
 * Redis-backed session store for production use.
 * Uses Redis TTL for automatic session expiration.
 * Maintains indexes for efficient user-based session revocation.
 */
export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: Redis) {}

  async set(token: string, entry: SessionEntry): Promise<void> {
    const ttlMs = entry.expiresAt - Date.now();
    if (ttlMs <= 0) {
      return;
    }

    const key = SESSION_PREFIX + token;
    const data = JSON.stringify(entry);

    // Use pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.set(key, data, 'PX', ttlMs);

    // Add to user index
    if (entry.userId !== null) {
      const userKey = USER_INDEX_PREFIX + entry.userId;
      pipeline.sadd(userKey, token);
      pipeline.pexpire(userKey, ttlMs + 60000); // Extra minute buffer
    }

    // Add to username index
    const usernameKey = USERNAME_INDEX_PREFIX + entry.username;
    pipeline.sadd(usernameKey, token);
    pipeline.pexpire(usernameKey, ttlMs + 60000);

    await pipeline.exec();
  }

  async get(token: string): Promise<SessionEntry | null> {
    const key = SESSION_PREFIX + token;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      const entry = JSON.parse(data) as SessionEntry;

      // Double-check expiration (shouldn't happen with Redis TTL, but defense in depth)
      if (entry.expiresAt <= Date.now()) {
        await this.delete(token);
        return null;
      }

      return entry;
    } catch {
      await this.delete(token);
      return null;
    }
  }

  async delete(token: string): Promise<void> {
    const key = SESSION_PREFIX + token;
    const data = await this.redis.get(key);

    if (data) {
      try {
        const entry = JSON.parse(data) as SessionEntry;
        const pipeline = this.redis.pipeline();
        pipeline.del(key);

        if (entry.userId !== null) {
          pipeline.srem(USER_INDEX_PREFIX + entry.userId, token);
        }
        pipeline.srem(USERNAME_INDEX_PREFIX + entry.username, token);

        await pipeline.exec();
      } catch {
        await this.redis.del(key);
      }
    }
  }

  async refresh(token: string, newExpiresAt: number): Promise<SessionEntry | null> {
    const key = SESSION_PREFIX + token;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      const entry = JSON.parse(data) as SessionEntry;

      if (entry.expiresAt <= Date.now()) {
        await this.delete(token);
        return null;
      }

      // Update timestamps
      entry.issuedAt = Date.now();
      entry.expiresAt = newExpiresAt;

      const ttlMs = newExpiresAt - Date.now();
      if (ttlMs <= 0) {
        await this.delete(token);
        return null;
      }

      // Atomic update with new TTL
      await this.redis.set(key, JSON.stringify(entry), 'PX', ttlMs);

      return entry;
    } catch {
      return null;
    }
  }

  async revokeByUserId(userId: number): Promise<number> {
    const indexKey = USER_INDEX_PREFIX + userId;
    const tokens = await this.redis.smembers(indexKey);

    if (tokens.length === 0) {
      return 0;
    }

    const pipeline = this.redis.pipeline();
    for (const token of tokens) {
      pipeline.del(SESSION_PREFIX + token);
    }
    pipeline.del(indexKey);

    await pipeline.exec();
    return tokens.length;
  }

  async revokeByUsername(username: string): Promise<number> {
    const indexKey = USERNAME_INDEX_PREFIX + username;
    const tokens = await this.redis.smembers(indexKey);

    if (tokens.length === 0) {
      return 0;
    }

    const pipeline = this.redis.pipeline();
    for (const token of tokens) {
      pipeline.del(SESSION_PREFIX + token);
    }
    pipeline.del(indexKey);

    await pipeline.exec();
    return tokens.length;
  }

  async pruneExpired(): Promise<number> {
    // Redis handles TTL automatically, no manual pruning needed
    return 0;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
