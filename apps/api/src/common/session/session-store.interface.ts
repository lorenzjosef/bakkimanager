import type { BakkiSessionState } from '@bakki/domain';

/**
 * Session entry stored in the session store.
 */
export interface SessionEntry {
  token: string;
  userId: number | null;
  profileId: number | null;
  username: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Authenticated user context attached to requests by SessionAuthGuard.
 */
export interface AuthenticatedUser {
  session: BakkiSessionState;
  entry: SessionEntry;
  profileId: number | null;
  userId: number | null;
}

/**
 * Session store abstraction for pluggable persistence backends.
 * Implementations must handle TTL-based expiration.
 */
export interface SessionStore {
  /**
   * Create or update a session.
   */
  set(token: string, entry: SessionEntry): Promise<void>;

  /**
   * Retrieve a session by token. Returns null if not found or expired.
   */
  get(token: string): Promise<SessionEntry | null>;

  /**
   * Delete a single session.
   */
  delete(token: string): Promise<void>;

  /**
   * Atomically refresh a session's expiration time.
   * Returns the updated entry, or null if the session doesn't exist.
   */
  refresh(token: string, newExpiresAt: number): Promise<SessionEntry | null>;

  /**
   * Revoke all sessions for a given user ID.
   */
  revokeByUserId(userId: number): Promise<number>;

  /**
   * Revoke all sessions for a given username.
   */
  revokeByUsername(username: string): Promise<number>;

  /**
   * Prune expired sessions (for stores that don't auto-expire).
   */
  pruneExpired(): Promise<number>;

  /**
   * Check if the store is healthy/connected.
   */
  isHealthy(): Promise<boolean>;
}
