import { Injectable } from '@nestjs/common';
import type { MirrorSyncHealthSummary, UserRoleDesignation } from '@bakki/domain';
import { BakkiCoreService } from './bakki-core.service';
import {
  BAKKI_USER_SELECT_FIELDS,
  type BakkiUserMirrorRow,
  mapBakkiUserMirrorRow,
} from './bakki-user-mirror.queries';
import { toIsoString } from './query-date.utils';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';

export interface BakkiUserMirrorRecord {
  active: boolean;
  displayName: string;
  id: number;
  lastSyncAttemptAt: string;
  lastSyncedAt: string;
  login: string;
  mobileAccessEnabled: boolean;
  odooUserId: number;
  role: UserRoleDesignation;
  syncError: string | null;
  syncRetryCount: number;
  syncStatus: 'error' | 'ok';
}

export interface UpsertBakkiUserMirrorInput {
  active: boolean;
  displayName: string;
  login: string;
  mobileAccessEnabled?: boolean;
  odooUserId: number;
  role: UserRoleDesignation;
}

@Injectable()
export class BakkiUserMirrorService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly bakkiCore: BakkiCoreService) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async listUsers() {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiUserMirrorRow>(`
      select
        ${BAKKI_USER_SELECT_FIELDS}
      from bakki_user
      order by lower(display_name) asc, id asc
    `);

    return result.rows.map(mapBakkiUserMirrorRow);
  }

  async getById(id: number) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiUserMirrorRow>(`
      select
        ${BAKKI_USER_SELECT_FIELDS}
      from bakki_user
      where id = $1
      limit 1
    `, [id]);

    const row = result.rows[0];
    return row ? mapBakkiUserMirrorRow(row) : null;
  }

  async getByLogin(login: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiUserMirrorRow>(`
      select
        ${BAKKI_USER_SELECT_FIELDS}
      from bakki_user
      where lower(login) = lower($1)
      limit 1
    `, [login]);

    const row = result.rows[0];
    return row ? mapBakkiUserMirrorRow(row) : null;
  }

  async getByOdooUserId(odooUserId: number) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiUserMirrorRow>(`
      select
        ${BAKKI_USER_SELECT_FIELDS}
      from bakki_user
      where odoo_user_id = $1
      limit 1
    `, [odooUserId]);

    const row = result.rows[0];
    return row ? mapBakkiUserMirrorRow(row) : null;
  }

  async upsert(input: UpsertBakkiUserMirrorInput) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiUserMirrorRow>(`
      insert into bakki_user (
        odoo_user_id,
        login,
        display_name,
        role,
        active,
        mobile_access_enabled,
        sync_status,
        sync_error,
        sync_retry_count,
        last_sync_attempt_at,
        last_synced_at
      ) values ($1, $2, $3, $4, $5, $6, 'ok', null, 0, now(), now())
      on conflict (odoo_user_id)
      do update set
        login = excluded.login,
        display_name = excluded.display_name,
        role = excluded.role,
        active = excluded.active,
        mobile_access_enabled = excluded.mobile_access_enabled,
        sync_status = 'ok',
        sync_error = null,
        sync_retry_count = 0,
        last_sync_attempt_at = now(),
        last_synced_at = now()
      returning
        ${BAKKI_USER_SELECT_FIELDS}
    `, [
      input.odooUserId,
      input.login,
      input.displayName,
      input.role,
      input.active,
      input.mobileAccessEnabled ?? true,
    ]);

    return mapBakkiUserMirrorRow(requireFirstRow(result.rows, 'Failed to upsert Bakki user mirror.'));
  }

  async updateActive(id: number, active: boolean) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiUserMirrorRow>(`
      update bakki_user
      set active = $2,
          sync_status = 'ok',
          sync_error = null,
          sync_retry_count = 0,
          last_sync_attempt_at = now(),
          last_synced_at = now()
      where id = $1
      returning
        ${BAKKI_USER_SELECT_FIELDS}
    `, [id, active]);

    const row = result.rows[0];
    return row ? mapBakkiUserMirrorRow(row) : null;
  }

  async markSyncFailureByOdooUserId(odooUserId: number, error: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiUserMirrorRow>(`
      update bakki_user
      set sync_status = 'error',
          sync_error = left($2, 1000),
          sync_retry_count = coalesce(sync_retry_count, 0) + 1,
          last_sync_attempt_at = now()
      where odoo_user_id = $1
      returning
        ${BAKKI_USER_SELECT_FIELDS}
    `, [odooUserId, error]);

    const row = result.rows[0];
    return row ? mapBakkiUserMirrorRow(row) : null;
  }

  async getSyncHealthSummary(): Promise<MirrorSyncHealthSummary> {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<{
      error_count: string;
      last_attempt_at: Date | string | null;
      last_success_at: Date | string | null;
      ok_count: string;
      retrying_count: string;
      total: string;
    }>(`
      select
        count(*)::text as total,
        count(*) filter (where sync_status = 'ok')::text as ok_count,
        count(*) filter (where sync_status = 'error')::text as error_count,
        count(*) filter (where sync_retry_count > 0)::text as retrying_count,
        max(last_sync_attempt_at) as last_attempt_at,
        max(last_synced_at) filter (where sync_status = 'ok') as last_success_at
      from bakki_user
    `);

    const row = result.rows[0];
    return {
      total: Number(row?.total ?? 0),
      okCount: Number(row?.ok_count ?? 0),
      errorCount: Number(row?.error_count ?? 0),
      retryingCount: Number(row?.retrying_count ?? 0),
      lastAttemptAt: toIsoString(row?.last_attempt_at ?? null),
      lastSuccessAt: toIsoString(row?.last_success_at ?? null),
    };
  }

  private async ensureSchema() {
    await ensureSchemaInitialized({
      getSchemaInitPromise: () => this.schemaInitPromise,
      initialize: () => this.ensureSchemaInternal(),
      isConfigured: this.bakkiCore.isConfigured(),
      schemaEnsured: this.schemaEnsured,
      setSchemaInitPromise: (promise) => {
        this.schemaInitPromise = promise;
      },
    });
  }

  private async ensureSchemaInternal() {
    await this.bakkiCore.query(`
      create table if not exists bakki_user (
        id bigserial primary key,
        odoo_user_id bigint not null unique,
        login text not null,
        display_name text not null,
        role text not null check (role in ('owner', 'planter')),
        active boolean not null default true,
        mobile_access_enabled boolean not null default true,
        sync_status text not null default 'ok' check (sync_status in ('ok', 'error')),
        sync_error text,
        sync_retry_count integer not null default 0,
        last_sync_attempt_at timestamptz not null default now(),
        last_synced_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create unique index if not exists bakki_user_odoo_user_id_idx
      on bakki_user (odoo_user_id)
    `);
    await this.bakkiCore.query(`
      create unique index if not exists bakki_user_login_idx
      on bakki_user (lower(login))
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_user_sync_status_idx
      on bakki_user (sync_status)
    `);
    await this.bakkiCore.query(`
      alter table bakki_user
      add column if not exists sync_status text not null default 'ok'
    `);
    await this.bakkiCore.query(`
      alter table bakki_user
      add column if not exists sync_error text
    `);
    await this.bakkiCore.query(`
      alter table bakki_user
      add column if not exists sync_retry_count integer not null default 0
    `);
    await this.bakkiCore.query(`
      alter table bakki_user
      add column if not exists last_sync_attempt_at timestamptz not null default now()
    `);
    await this.bakkiCore.query(`
      update bakki_user
      set last_sync_attempt_at = coalesce(last_sync_attempt_at, last_synced_at, now()),
          sync_status = coalesce(sync_status, 'ok'),
          sync_retry_count = coalesce(sync_retry_count, 0)
      where last_sync_attempt_at is null
         or sync_status is null
         or sync_retry_count is null
    `);

    this.schemaEnsured = true;
  }
}
