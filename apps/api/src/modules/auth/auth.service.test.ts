import assert from 'node:assert/strict';
import test from 'node:test';
import type { RecordAuditEventInput } from '../audit/audit.service';
import {
  AuthService,
  BAKKI_DESKTOP_CLIENT_HEADER,
  BAKKI_DESKTOP_CLIENT_VALUE,
  BAKKI_DESKTOP_SESSION_HEADER,
  getRequestSessionToken,
  isDesktopClientRequest,
} from './auth.service';

interface AuthMirrorUpsertInput {
  active: boolean;
  displayName: string;
  login: string;
  mobileAccessEnabled?: boolean;
  odooUserId: number;
  role: 'owner' | 'planter';
}

function createAuthService(options?: {
  authenticateUserCredentials?: (username: string, password: string) => Promise<number | null>;
  groupResId?: number;
  odooUser?: {
    active?: boolean;
    group_ids?: number[] | false;
    id: number;
    login?: string;
    name?: string;
  };
  bakkiUsers?: {
    getByOdooUserId?: (odooUserId: number) => Promise<unknown>;
    markSyncFailureByOdooUserId?: (odooUserId: number, message: string) => Promise<unknown>;
    upsert?: (input: AuthMirrorUpsertInput) => Promise<unknown>;
  };
}) {
  const auditEvents: RecordAuditEventInput[] = [];
  const odooUser = options?.odooUser ?? {
    id: 42,
    login: 'field.user',
    name: 'Field User',
    active: true,
    group_ids: [9],
  };

  const service = new AuthService(
    {
      recordEvent: async (event: RecordAuditEventInput) => {
        auditEvents.push(event);
      },
    } as never,
    {
      getByOdooUserId:
        options?.bakkiUsers?.getByOdooUserId
        ?? (async () => null),
      isConfigured: () => true,
      markSyncFailureByOdooUserId:
        options?.bakkiUsers?.markSyncFailureByOdooUserId
        ?? (async () => null),
      upsert:
        options?.bakkiUsers?.upsert
        ?? (async (input: AuthMirrorUpsertInput) => ({
          id: 7,
          odooUserId: input.odooUserId,
          login: input.login,
          displayName: input.displayName,
          role: input.role,
          active: input.active,
          mobileAccessEnabled: input.mobileAccessEnabled ?? true,
          syncStatus: 'ok',
          syncError: null,
          syncRetryCount: 0,
          lastSyncAttemptAt: '2026-03-28T10:00:00.000Z',
          lastSyncedAt: '2026-03-28T10:00:00.000Z',
        })),
    } as never,
    {
      authenticateUserCredentials:
        options?.authenticateUserCredentials
        ?? (async () => odooUser.id),
      isConfigured: () => true,
      searchRead: async (model: string) => {
        if (model === 'res.users') {
          return [odooUser];
        }

        if (model === 'ir.model.data') {
          return [{ res_id: options?.groupResId ?? 3 }];
        }

        throw new Error(`Unexpected Odoo model lookup in auth test: ${model}`);
      },
    } as never,
  );

  return { auditEvents, service };
}

test('login falls back to an Odoo-derived session when Bakki Core user mirrors are unavailable', async () => {
  const { auditEvents, service } = createAuthService({
    groupResId: 9,
    bakkiUsers: {
      getByOdooUserId: async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
      },
    },
    odooUser: {
      id: 42,
      login: 'owner.user',
      name: 'Owner User',
      active: true,
      group_ids: [9],
    },
  });

  const login = await service.login('owner.user', 'secret', '00000000-0000-4000-8000-000000000001');

  assert.equal(login.session.user.id, 'user-42');
  assert.equal(login.session.user.displayName, 'Owner User');
  assert.equal(login.session.user.username, 'owner.user');
  assert.equal(login.session.user.role, 'owner');
  assert.equal(login.session.user.canResetCredentials, false);

  const sessionStatus = await service.getSession('00000000-0000-4000-8000-000000000001');
  assert.equal(sessionStatus.session?.user.id, 'user-42');
  assert.equal(sessionStatus.session?.user.role, 'owner');
  assert.equal(auditEvents[0]?.type, 'auth.login');
  assert.equal(auditEvents[0]?.actor, 'user-42');
});

test('login records auth audit events against the Bakki user profile id when a mirror exists', async () => {
  const { auditEvents, service } = createAuthService();

  const login = await service.login('field.user', 'secret', '00000000-0000-4000-8000-000000000002');

  assert.equal(login.session.user.id, 'user-profile-7');
  assert.equal(auditEvents[0]?.type, 'auth.login');
  assert.equal(auditEvents[0]?.actor, 'user-profile-7');
});

test('login prefers the current Odoo owner role over a stale planter mirror', async () => {
  const { service } = createAuthService({
    bakkiUsers: {
      getByOdooUserId: async () => ({
        id: 7,
        odooUserId: 42,
        login: 'owner.user',
        displayName: 'Owner User',
        role: 'planter',
        active: true,
        mobileAccessEnabled: true,
        syncStatus: 'ok',
        syncError: null,
        syncRetryCount: 0,
        lastSyncAttemptAt: '2026-03-28T10:00:00.000Z',
        lastSyncedAt: '2026-03-28T10:00:00.000Z',
      }),
    },
    groupResId: 9,
    odooUser: {
      id: 42,
      login: 'owner.user',
      name: 'Owner User',
      active: true,
      group_ids: [9],
    },
  });

  const login = await service.login('owner.user', 'secret', '00000000-0000-4000-8000-000000000003');

  assert.equal(login.session.user.role, 'owner');
  assert.equal(login.session.user.id, 'user-profile-7');
  assert.equal(login.session.user.canResetCredentials, true);
});

test('desktop requests can resolve the session token from the desktop header', () => {
  const request = {
    cookies: {},
    headers: {
      [BAKKI_DESKTOP_CLIENT_HEADER]: BAKKI_DESKTOP_CLIENT_VALUE,
      [BAKKI_DESKTOP_SESSION_HEADER]: 'desktop-session-token',
    },
  } as const;

  assert.equal(isDesktopClientRequest(request), true);
  assert.equal(getRequestSessionToken(request), 'desktop-session-token');
});

test('browser requests still resolve the session token from the cookie', () => {
  const request = {
    cookies: {
      bakki_session: 'cookie-session-token',
    },
    headers: {},
  } as const;

  assert.equal(isDesktopClientRequest(request), false);
  assert.equal(getRequestSessionToken(request), 'cookie-session-token');
});
