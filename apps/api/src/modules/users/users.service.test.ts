import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { UsersService } from './users.service';

interface MirrorRecord {
  active: boolean;
  displayName: string;
  id: number;
  login: string;
  mobileAccessEnabled: boolean;
  odooUserId: number;
  role: 'owner' | 'planter';
}

function createUsersService(options?: {
  bakkiUsersConfigured?: boolean;
  executeKw?: (model: string, method: string, args: unknown[]) => Promise<unknown>;
  getByOdooUserId?: (odooUserId: number) => Promise<MirrorRecord | null>;
  odooConfigured?: boolean;
  searchCount?: (model: string, domain: unknown[]) => Promise<number>;
  searchRead?: (model: string, domain?: unknown[]) => Promise<unknown[]>;
  upsert?: (input: {
    active: boolean;
    displayName: string;
    login: string;
    mobileAccessEnabled: boolean;
    odooUserId: number;
    role: 'owner' | 'planter';
  }) => Promise<MirrorRecord>;
}) {
  return new UsersService(
    {
      recordEvent: async () => {},
    } as never,
    {
      getSession: async () => ({
        session: {
          authenticated: true,
          user: {
            id: 'user-profile-1',
            role: 'owner',
          },
        },
      }),
      revokeSessionsForUserId: () => {},
    } as never,
    {
      getById: async () => null,
      getByOdooUserId:
        options?.getByOdooUserId
        ?? (async () => null),
      isConfigured: () => options?.bakkiUsersConfigured ?? false,
      markSyncFailureByOdooUserId: async () => null,
      updateActive: async () => null,
      upsert:
        options?.upsert
        ?? (async (input: {
          active: boolean;
          displayName: string;
          login: string;
          mobileAccessEnabled: boolean;
          odooUserId: number;
          role: 'owner' | 'planter';
        }) => ({
          id: 7,
          odooUserId: input.odooUserId,
          login: input.login,
          displayName: input.displayName,
          role: input.role,
          active: input.active,
          mobileAccessEnabled: input.mobileAccessEnabled,
        })),
    } as never,
    {
      executeKw:
        options?.executeKw
        ?? (async () => true),
      isConfigured: () => options?.odooConfigured ?? false,
      searchCount:
        options?.searchCount
        ?? (async () => 0),
      searchRead:
        options?.searchRead
        ?? (async () => []),
    } as never,
  );
}

test('listUsers reports a service-unavailable error when the live user backend is not configured', async () => {
  const service = createUsersService();

  await assert.rejects(
    () => service.listUsers(),
    (error: unknown) => error instanceof ServiceUnavailableException,
  );
});

test('getManagementData returns an empty structured state when the live user backend is unavailable', async () => {
  const service = createUsersService();

  const data = await service.getManagementData('planter');

  assert.equal(data.registryUsers.length, 0);
  assert.equal(data.registrySubtitle, '0 active, 0 inactive, 0 total synced personnel.');
  assert.equal(data.permissionsTitle, 'Permissions Panel');
  assert.equal(data.roleOptions.length, 2);
});

test('getManagementData returns an honest empty live state when the configured directory has no users', async () => {
  const service = createUsersService({
    bakkiUsersConfigured: true,
    odooConfigured: true,
    searchRead: async (model: string) => {
      if (model === 'res.users') {
        return [];
      }

      return [];
    },
  });

  const data = await service.getManagementData('owner');

  assert.equal(data.registryUsers.length, 0);
  assert.equal(data.registrySubtitle, '0 active, 0 inactive, 0 total synced personnel.');
  assert.equal(data.permissionsTitle, 'Permissions Panel');
  assert.equal(data.roleOptions.length, 2);
});

test('getManagementData maps synced users into the shared management data structure', async () => {
  const service = createUsersService({
    bakkiUsersConfigured: true,
    getByOdooUserId: async () => ({
      id: 17,
      odooUserId: 42,
      login: 'owner.user',
      displayName: 'Owner User',
      role: 'owner',
      active: true,
      mobileAccessEnabled: true,
    }),
    odooConfigured: true,
    searchRead: async (model: string) => {
      if (model === 'res.users') {
        return [
          {
            id: 42,
            login: 'owner.user',
            name: 'Owner User',
            active: true,
            avatar_128: false,
            group_ids: [9],
          },
        ];
      }

      if (model === 'ir.model.data') {
        return [{ res_id: 9 }];
      }

      return [];
    },
  });

  const data = await service.getManagementData('owner');

  assert.equal(data.registryUsers.length, 1);
  assert.equal(data.registryUsers[0]?.username, 'owner.user');
  assert.equal(data.registryUsers[0]?.roleLabel, 'Owner');
  assert.equal(data.registrySubtitle, '1 active, 0 inactive, 1 total synced personnel.');
  assert.equal(data.permissionGroups[0]?.items[0]?.checked, true);
});

test('getManagementData refreshes a stale mirror role from current Odoo owner groups', async () => {
  const service = createUsersService({
    bakkiUsersConfigured: true,
    getByOdooUserId: async () => ({
      id: 17,
      odooUserId: 42,
      login: 'owner.user',
      displayName: 'Owner User',
      role: 'planter',
      active: true,
      mobileAccessEnabled: true,
    }),
    odooConfigured: true,
    searchRead: async (model: string) => {
      if (model === 'res.users') {
        return [
          {
            id: 42,
            login: 'owner.user',
            name: 'Owner User',
            active: true,
            avatar_128: false,
            group_ids: [9],
          },
        ];
      }

      if (model === 'ir.model.data') {
        return [{ res_id: 9 }];
      }

      return [];
    },
  });

  const data = await service.getManagementData('owner');

  assert.equal(data.registryUsers[0]?.roleLabel, 'Owner');
  assert.equal(data.registryUsers[0]?.isOwner, true);
});

test('createUser generates an email-format Odoo login and mirrors it', async () => {
  let createArgs: unknown[] | null = null;

  const service = createUsersService({
    bakkiUsersConfigured: true,
    executeKw: async (_model: string, method: string, args: unknown[]) => {
      if (method === 'create') {
        createArgs = args;
        return 42;
      }

      return true;
    },
    odooConfigured: true,
    searchCount: async () => 0,
    searchRead: async (model: string) => {
      if (model === 'ir.model.data') {
        return [{ res_id: 9 }];
      }

      return [];
    },
  });

  const result = await service.createUser({
    firstName: 'Peter',
    lastName: 'Pan',
    role: 'planter',
    temporaryPassword: 'BK-ABCD-EF12',
  });

  assert.deepEqual(createArgs, [
    {
      active: true,
      email: 'peter.pan@bakki.example',
      group_ids: [[6, 0, [9]]],
      login: 'peter.pan@bakki.example',
      name: 'Peter Pan',
      password: 'BK-ABCD-EF12',
    },
  ]);
  assert.equal(result.generatedUsername, 'peter.pan@bakki.example');
  assert.equal(result.createdUser.username, 'peter.pan@bakki.example');
});

test('createUser assigns the Odoo owner group when the selected role is owner', async () => {
  let createArgs: unknown[] | null = null;

  const service = createUsersService({
    bakkiUsersConfigured: true,
    executeKw: async (_model: string, method: string, args: unknown[]) => {
      if (method === 'create') {
        createArgs = args;
        return 55;
      }

      return true;
    },
    odooConfigured: true,
    searchCount: async () => 0,
    searchRead: async (model: string, domain?: unknown[]) => {
      if (model !== 'ir.model.data') {
        return [];
      }

      const recordName = Array.isArray(domain)
        ? (() => {
            const recordEntry = domain.find((entry): entry is [string, string, string] =>
              Array.isArray(entry)
              && entry.length >= 3
              && entry[0] === 'name'
              && typeof entry[1] === 'string'
              && typeof entry[2] === 'string',
            );
            return recordEntry?.[2] ?? null;
          })()
        : null;

      if (recordName === 'group_user') {
        return [{ res_id: 9 }];
      }

      if (recordName === 'group_system') {
        return [{ res_id: 11 }];
      }

      return [];
    },
  });

  const result = await service.createUser({
    firstName: 'Olivia',
    lastName: 'Owner',
    role: 'owner',
    temporaryPassword: 'BK-1234-ABCD',
  });

  assert.deepEqual(createArgs, [
    {
      active: true,
      email: 'olivia.owner@bakki.example',
      group_ids: [[6, 0, [9, 11]]],
      login: 'olivia.owner@bakki.example',
      name: 'Olivia Owner',
      password: 'BK-1234-ABCD',
    },
  ]);
  assert.equal(result.createdUser.roleLabel, 'Owner');
  assert.equal(result.createdUser.isOwner, true);
});
