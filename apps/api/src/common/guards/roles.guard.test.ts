import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedUser } from '../session';

function createMockContext(user?: AuthenticatedUser): ExecutionContext {
  const request = { user };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function createMockUser(role: 'owner' | 'planter'): AuthenticatedUser {
  return {
    session: {
      authenticated: true,
      issuedAt: new Date().toISOString(),
      user: {
        id: 'user-42',
        username: 'test.user',
        displayName: 'Test User',
        role,
        mobileAccessEnabled: true,
        canResetCredentials: false,
        activePlantingPhaseId: null,
      },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
    entry: {
      token: 'test-token',
      userId: 42,
      profileId: 7,
      username: 'test.user',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    },
    profileId: 7,
    userId: 42,
  };
}

test('RolesGuard allows any authenticated user when no roles are required', async () => {
  const reflector = {
    getAllAndOverride: () => undefined, // No roles specified
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);
  const context = createMockContext(createMockUser('planter'));

  const result = await guard.canActivate(context);
  assert.equal(result, true);
});

test('RolesGuard allows owners to access owner-only routes', async () => {
  const reflector = {
    getAllAndOverride: () => ['owner'], // Owner role required
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);
  const context = createMockContext(createMockUser('owner'));

  const result = await guard.canActivate(context);
  assert.equal(result, true);
});

test('RolesGuard rejects planters from owner-only routes with 403', async () => {
  const reflector = {
    getAllAndOverride: () => ['owner'], // Owner role required
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);
  const context = createMockContext(createMockUser('planter'));

  await assert.rejects(
    async () => guard.canActivate(context),
    ForbiddenException,
  );
});

test('RolesGuard allows planters when planter role is in the allowed list', async () => {
  const reflector = {
    getAllAndOverride: () => ['owner', 'planter'], // Both roles allowed
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);
  const context = createMockContext(createMockUser('planter'));

  const result = await guard.canActivate(context);
  assert.equal(result, true);
});

test('RolesGuard does not check roles when no user is attached (defers to SessionAuthGuard for public)', async () => {
  // When no roles are required, RolesGuard allows through
  // Public route handling is done by SessionAuthGuard
  const reflector = {
    getAllAndOverride: () => undefined, // No roles specified
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);
  // No user attached - but no roles required either
  const context = createMockContext(undefined);

  const result = await guard.canActivate(context);
  assert.equal(result, true);
});

test('RolesGuard rejects unauthenticated requests to role-protected routes', async () => {
  const reflector = {
    getAllAndOverride: (key: string) => {
      if (key === 'isPublic') return false;
      if (key === 'roles') return ['owner'];
      return undefined;
    },
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);
  const context = createMockContext(undefined); // No user

  await assert.rejects(
    async () => guard.canActivate(context),
    ForbiddenException,
  );
});
