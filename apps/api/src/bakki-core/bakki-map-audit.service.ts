import { Injectable } from '@nestjs/common';
import type { MapAuditEntry } from '@bakki/domain';
import { BakkiCoreService } from './bakki-core.service';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';

const MAX_IN_MEMORY_MAP_AUDIT_ENTRIES = 200;

export interface CreateBakkiMapAuditInput {
  changeSummary: string;
  changeType: string;
  diffPayload?: Record<string, unknown>;
  editorUserId?: number | null;
  entityRef: string;
  entityType: string;
  ranchRef?: string;
}

@Injectable()
export class BakkiMapAuditService {
  private readonly inMemoryEntries: MapAuditEntry[] = [];
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly bakkiCore: BakkiCoreService) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async listRecent(limit = 50) {
    if (!this.bakkiCore.isConfigured()) {
      return this.inMemoryEntries.slice(0, limit);
    }

    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiMapAuditRow>(
      `
        select
          id,
          ranch_ref,
          editor_user_id,
          entity_type,
          entity_ref,
          change_type,
          change_summary,
          created_at
        from bakki_map_audit
        order by created_at desc, id desc
        limit $1
      `,
      [limit],
    );

    return result.rows.map(mapRow);
  }

  async create(input: CreateBakkiMapAuditInput) {
    const fallbackEntry: MapAuditEntry = {
      id: `map-audit-${this.inMemoryEntries.length + 1}`,
      ranchRef: input.ranchRef ?? 'ranch-main',
      editorUserId: input.editorUserId ?? null,
      entityType: input.entityType,
      entityRef: input.entityRef,
      changeType: input.changeType,
      changeSummary: input.changeSummary,
      createdAt: new Date().toISOString(),
    };
    this.inMemoryEntries.unshift(fallbackEntry);
    if (this.inMemoryEntries.length > MAX_IN_MEMORY_MAP_AUDIT_ENTRIES) {
      this.inMemoryEntries.splice(MAX_IN_MEMORY_MAP_AUDIT_ENTRIES);
    }

    if (!this.bakkiCore.isConfigured()) {
      return fallbackEntry;
    }

    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiMapAuditInsertRow>(
      `
        insert into bakki_map_audit (
          ranch_ref,
          editor_user_id,
          entity_type,
          entity_ref,
          change_type,
          change_summary,
          diff_payload,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
        returning
          id,
          ranch_ref,
          editor_user_id,
          entity_type,
          entity_ref,
          change_type,
          change_summary,
          created_at
      `,
      [
        input.ranchRef ?? 'ranch-main',
        input.editorUserId ?? null,
        input.entityType,
        input.entityRef,
        input.changeType,
        input.changeSummary,
        input.diffPayload ? JSON.stringify(input.diffPayload) : null,
      ],
    );

    return mapRow(requireFirstRow(result.rows, 'Failed to insert Bakki map audit entry.'));
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
      create table if not exists bakki_map_audit (
        id bigserial primary key,
        ranch_ref text not null,
        editor_user_id bigint references bakki_user(id) on delete set null,
        entity_type text not null,
        entity_ref text not null,
        change_type text not null,
        change_summary text not null,
        diff_payload jsonb,
        created_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create index if not exists bakki_map_audit_created_at_idx
      on bakki_map_audit (created_at desc)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_map_audit_entity_idx
      on bakki_map_audit (entity_type, entity_ref)
    `);

    this.schemaEnsured = true;
  }
}

interface BakkiMapAuditRow {
  change_summary: string;
  change_type: string;
  created_at: Date | string;
  editor_user_id: number | null;
  entity_ref: string;
  entity_type: string;
  id: number | string;
  ranch_ref: string;
}

interface BakkiMapAuditInsertRow extends BakkiMapAuditRow {}

function mapRow(row: BakkiMapAuditRow): MapAuditEntry {
  return {
    id: `map-audit-${row.id}`,
    ranchRef: row.ranch_ref,
    editorUserId: row.editor_user_id === null ? null : Number(row.editor_user_id),
    entityType: row.entity_type,
    entityRef: row.entity_ref,
    changeType: row.change_type,
    changeSummary: row.change_summary,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}
