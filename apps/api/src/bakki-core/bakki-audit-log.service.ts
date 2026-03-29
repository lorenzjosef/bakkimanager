import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { BakkiCoreService } from './bakki-core.service';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';

export interface BakkiAuditEventRecord {
  actor: string;
  id: string;
  message: string;
  timestamp: string;
  type: string;
}

export interface CreateBakkiAuditEventInput {
  actor: string;
  ipAddress?: string;
  message: string;
  payload?: Record<string, unknown>;
  targetModel?: string;
  targetResId?: number;
  type: string;
}

@Injectable()
export class BakkiAuditLogService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly bakkiCore: BakkiCoreService) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async listRecent(limit = 100) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiAuditRow>(
      `
        select
          id,
          actor,
          event_type,
          message,
          occurred_at
        from bakki_audit_log
        order by occurred_at desc, id desc
        limit $1
      `,
      [limit],
    );

    return result.rows.map((row) => ({
      id: `audit-${Number(row.id)}`,
      actor: row.actor,
      type: row.event_type,
      message: row.message,
      timestamp:
        row.occurred_at instanceof Date
          ? row.occurred_at.toISOString()
          : new Date(row.occurred_at).toISOString(),
    })) satisfies BakkiAuditEventRecord[];
  }

  async create(event: CreateBakkiAuditEventInput) {
    await this.ensureSchema();

    return this.bakkiCore.withClient(async (client) => {
      const actorUserId = await resolveActorUserId(client, event.actor);
      const result = await client.query<BakkiAuditInsertRow>(
        `
          insert into bakki_audit_log (
            actor,
            actor_user_id,
            event_type,
            target_model,
            target_res_id,
            message,
            payload_json,
            ip_address
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
          returning id, occurred_at
        `,
        [
          event.actor,
          actorUserId,
          event.type,
          event.targetModel ?? null,
          event.targetResId ?? null,
          event.message,
          event.payload ? JSON.stringify(event.payload) : null,
          event.ipAddress ?? null,
        ],
      );
      const inserted = requireFirstRow(result.rows, 'Failed to insert Bakki audit log event.');

      return {
        id: `audit-${Number(inserted.id)}`,
        actor: event.actor,
        type: event.type,
        message: event.message,
        timestamp:
          inserted.occurred_at instanceof Date
            ? inserted.occurred_at.toISOString()
            : new Date(inserted.occurred_at).toISOString(),
      } satisfies BakkiAuditEventRecord;
    });
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
      create table if not exists bakki_audit_log (
        id bigserial primary key,
        actor text not null,
        actor_user_id bigint references bakki_user(id) on delete set null,
        event_type text not null,
        target_model text,
        target_res_id bigint,
        message text not null,
        payload_json jsonb,
        ip_address text,
        occurred_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create index if not exists bakki_audit_log_occurred_at_idx
      on bakki_audit_log (occurred_at desc)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_audit_log_event_type_idx
      on bakki_audit_log (event_type)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_audit_log_actor_user_idx
      on bakki_audit_log (actor_user_id)
    `);

    this.schemaEnsured = true;
  }
}

interface BakkiAuditRow {
  actor: string;
  event_type: string;
  id: number | string;
  message: string;
  occurred_at: Date | string;
}

interface BakkiAuditInsertRow {
  id: number | string;
  occurred_at: Date | string;
}

async function resolveActorUserId(client: Pick<PoolClient, 'query'>, actor: string) {
  const profileId = actor.match(/^user-profile-(\d+)$/)?.[1];
  if (profileId) {
    return Number(profileId);
  }

  const odooUserId = actor.match(/^user-(\d+)$/)?.[1];
  if (!odooUserId) {
    return null;
  }

  const result = await client.query<{ id: number | string }>(
    `
      select id
      from bakki_user
      where odoo_user_id = $1
      limit 1
    `,
    [Number(odooUserId)],
  );

  const row = result.rows[0];
  return row ? Number(row.id) : null;
}
