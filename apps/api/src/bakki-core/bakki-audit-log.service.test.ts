import assert from 'node:assert/strict';
import test from 'node:test';
import { BakkiAuditLogService } from './bakki-audit-log.service';

test('create resolves Odoo actor ids through bakki_user before inserting audit rows', async () => {
  const insertParams: unknown[][] = [];

  const service = new BakkiAuditLogService({
    isConfigured: () => true,
    query: async () => ({ rows: [] }),
    withClient: async (callback: (client: {
      query: <T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        params?: unknown[],
      ) => Promise<{ rows: T[] }>;
    }) => Promise<unknown>) => callback({
      query: async <T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        params: unknown[] = [],
      ) => {
        if (text.includes('from bakki_user')) {
          return { rows: [{ id: 7 }] as unknown as T[] };
        }

        if (text.includes('insert into bakki_audit_log')) {
          insertParams.push(params);
          return {
            rows: [{ id: 11, occurred_at: '2026-03-29T15:00:00.000Z' }] as unknown as T[],
          };
        }

        throw new Error(`Unexpected query: ${text}`);
      },
    }),
  } as never);

  await service.create({
    actor: 'user-42',
    message: 'User logged in',
    type: 'auth.login',
  });

  assert.equal(insertParams[0]?.[1], 7);
});

test('create stores null actor_user_id when the Bakki mirror cannot be resolved', async () => {
  const insertParams: unknown[][] = [];

  const service = new BakkiAuditLogService({
    isConfigured: () => true,
    query: async () => ({ rows: [] }),
    withClient: async (callback: (client: {
      query: <T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        params?: unknown[],
      ) => Promise<{ rows: T[] }>;
    }) => Promise<unknown>) => callback({
      query: async <T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        params: unknown[] = [],
      ) => {
        if (text.includes('from bakki_user')) {
          return { rows: [] as T[] };
        }

        if (text.includes('insert into bakki_audit_log')) {
          insertParams.push(params);
          return {
            rows: [{ id: 12, occurred_at: '2026-03-29T15:00:00.000Z' }] as unknown as T[],
          };
        }

        throw new Error(`Unexpected query: ${text}`);
      },
    }),
  } as never);

  await service.create({
    actor: 'user-42',
    message: 'User logged in',
    type: 'auth.login',
  });

  assert.equal(insertParams[0]?.[1], null);
});
