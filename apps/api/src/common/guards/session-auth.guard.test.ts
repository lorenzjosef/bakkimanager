import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionAuthGuard } from './session-auth.guard';
import type { SessionStore, SessionEntry } from '../session';

function createMockSessionStore(sessions = new Map<string, SessionEntry>()): SessionStore {
  return {
    async set(token: string, entry: SessionEntry): Promise<void> {
      sessions.set(token, entry);
    },
    async get(token: string): Promise<SessionEntry | null> {
      return sessions.get(token) ?? null;
    },
    async delete(token: string): Promise<void> {
      sessions.delete(token);
    },
    async refresh(token: string, newExpiresAt: number): Promise<SessionEntry | null> {
      const entry = sessions.get(token);
      if (entry) {
        entry.expiresAt = newExpiresAt;
        return entry;
      }
      return null;
    },
    async revokeByUserId(_userId: number): Promise<number> {
      return 0;
    },
    async revokeByUsername(_username: string): Promise<number> {
      return 0;
    },
    async pruneExpired(): Promise<number> {
      return 0;
    },
    async isHealthy(): Promise<boolean> {
      return true;
    },
  };
}

function createMockContext(options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): ExecutionContext {
  const request = {
    headers: options.headers ?? {},
    cookies: options.cookies ?? {},
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

test('SessionAuthGuard rejects unauthenticated requests with 401', async () => {
  const reflector = new Reflector();
  const sessionStore = createMockSessionStore();
  
  // Create a mock AuthService
  const authService = {
    requireSessionWithEntry: async () => {
      throw new UnauthorizedException('Session not found');
    },
  };

  const guard = new SessionAuthGuard(reflector, authService as never);
  const context = createMockContext({ headers: {} });

  await assert.rejects(
    async () => guard.canActivate(context),
    UnauthorizedException,
  );
});

test('SessionAuthGuard allows requests with valid session token', async () => {
  const sessions = new Map<string, SessionEntry>();
  const sessionEntry: SessionEntry = {
    token: 'valid-token',
    userId: 42,
    profileId: 7,
    username: 'test.user',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };
  sessions.set('valid-token', sessionEntry);

  const reflector = new Reflector();
  const authService = {
    requireSessionWithEntry: async (token: string) => {
      if (token === 'valid-token') {
        return {
          entry: sessionEntry,
          session: {
            token: 'valid-token',
            user: {
              id: 'user-42',
              login: 'test.user',
              displayName: 'Test User',
              role: 'owner',
            },
            expiresAt: new Date(sessionEntry.expiresAt).toISOString(),
          },
        };
      }
      throw new UnauthorizedException('Session not found');
    },
  };

  const guard = new SessionAuthGuard(reflector, authService as never);
  const context = createMockContext({
    headers: { 'x-bakki-session': 'valid-token' },
  });

  const result = await guard.canActivate(context);
  assert.equal(result, true);
});

test('SessionAuthGuard allows public routes without authentication', async () => {
  const reflector = {
    getAllAndOverride: () => true, // Route is marked as public
  } as unknown as Reflector;

  const authService = {
    requireSessionWithEntry: async () => {
      throw new Error('Should not be called for public routes');
    },
  };

  const guard = new SessionAuthGuard(reflector, authService as never);
  const context = createMockContext({ headers: {} });

  const result = await guard.canActivate(context);
  assert.equal(result, true);
});
