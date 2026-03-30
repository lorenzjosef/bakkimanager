import { Injectable } from '@nestjs/common';
import type {
  BakkiTaskPriority,
  BakkiWorkflowState,
  GeoJsonGeometry,
  MirrorSyncHealthSummary,
} from '@bakki/domain';
import { BakkiCoreService } from './bakki-core.service';
import { BakkiGeometryService } from './bakki-geometry.service';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';
import { BakkiTaskTemplateService } from './bakki-task-template.service';
import {
  BAKKI_TASK_MIRROR_SELECT_FIELDS,
  type BakkiTaskMirrorHealthRow,
  type BakkiTaskMirrorRow,
  mapBakkiTaskMirrorRow,
  toIsoString,
} from './bakki-task-mirror.queries';

export interface BakkiTaskMirrorRecord {
  assigneeName: string | null;
  areaRef: string | null;
  dueAt: string | null;
  geometrySnapshot: GeoJsonGeometry | null;
  id: number;
  lastSyncAttemptAt: string;
  lastSyncedAt: string;
  monitoringDensityPer100Sqm: number | null;
  monitoringTreeCount: number | null;
  priority: BakkiTaskPriority | null;
  odooStageId: number | null;
  odooStageName: string | null;
  odooTaskId: number;
  phaseRef: string | null;
  taskType: string | null;
  templateRef: string | null;
  title: string;
  workflowState: BakkiWorkflowState;
  syncError: string | null;
  syncRetryCount: number;
  syncStatus: 'error' | 'ok';
}

export interface UpsertBakkiTaskMirrorInput {
  assigneeName?: string | null;
  areaRef?: string | null;
  dueAt?: string | null;
  geometrySnapshot?: GeoJsonGeometry | null;
  monitoringDensityPer100Sqm?: number | null;
  monitoringTreeCount?: number | null;
  priority?: BakkiTaskPriority | null;
  odooStageId?: number | null;
  odooStageName?: string | null;
  odooTaskId: number;
  phaseRef?: string | null;
  taskType?: string | null;
  templateRef?: string | null;
  title: string;
  workflowState: BakkiWorkflowState;
}

@Injectable()
export class BakkiTaskMirrorService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(
    private readonly bakkiCore: BakkiCoreService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiTaskTemplates: BakkiTaskTemplateService,
  ) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async getByOdooTaskId(odooTaskId: number) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiTaskMirrorRow>(`
      select
        ${BAKKI_TASK_MIRROR_SELECT_FIELDS}
      from bakki_task
      where odoo_task_id = $1
      limit 1
    `, [odooTaskId]);

    const row = result.rows[0];
    return row ? mapBakkiTaskMirrorRow(row) : null;
  }

  async listByOdooTaskIds(odooTaskIds: number[]) {
    await this.ensureSchema();
    if (odooTaskIds.length === 0) {
      return new Map<number, BakkiTaskMirrorRecord>();
    }

    const result = await this.bakkiCore.query<BakkiTaskMirrorRow>(`
      select
        ${BAKKI_TASK_MIRROR_SELECT_FIELDS}
      from bakki_task
      where odoo_task_id = any($1::bigint[])
    `, [odooTaskIds]);

    return new Map(
      result.rows.map((row) => {
        const record = mapBakkiTaskMirrorRow(row);
        return [record.odooTaskId, record] as const;
      }),
    );
  }

  async listRecent(limit = 100) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiTaskMirrorRow>(`
      select
        ${BAKKI_TASK_MIRROR_SELECT_FIELDS}
      from bakki_task
      order by
        case when due_at is null then 1 else 0 end asc,
        due_at asc,
        priority desc,
        last_synced_at desc,
        id desc
      limit $1
    `, [limit]);

    return result.rows.map(mapBakkiTaskMirrorRow);
  }

  /**
   * List tasks for mobile bootstrap.
   * Returns tasks with area/zone names joined.
   */
  async listTasksForMobile(userId: number) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<MobileTaskRow>(`
      select
        t.id,
        t.odoo_task_id as task_ref,
        t.title,
        coalesce(tt.description, '') as description,
        t.workflow_state,
        t.priority,
        t.due_at,
        t.area_ref,
        a.name as area_name,
        a.zone_ref,
        z.name as zone_name,
        t.assignee_name as assignee_username,
        u.id as assignee_user_id,
        t.template_ref,
        t.task_type,
        t.last_synced_at as created_at,
        t.last_synced_at as updated_at
      from bakki_task t
      left join bakki_area a on a.area_ref = t.area_ref
      left join bakki_zone z on z.zone_ref = a.zone_ref
      left join bakki_task_template tt on tt.template_ref = t.template_ref
      left join bakki_user u on u.username = t.assignee_name
      where t.workflow_state in ('pending', 'in_progress')
      order by
        case when t.due_at is null then 1 else 0 end asc,
        t.due_at asc,
        t.priority desc,
        t.id desc
      limit 500
    `);

    return result.rows.map(mapMobileTaskRow);
  }

  async listErroredOdooTaskIds(limit = 100) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<{ odoo_task_id: number | string }>(`
      select odoo_task_id
      from bakki_task
      where sync_status = 'error'
      order by last_sync_attempt_at desc, id desc
      limit $1
    `, [limit]);

    return result.rows.map((row) => Number(row.odoo_task_id));
  }

  async countByWorkflowStates(states: BakkiWorkflowState[]) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<{ count: string }>(`
      select count(*)::text as count
      from bakki_task
      where workflow_state = any($1::text[])
    `, [states]);

    return Number(result.rows[0]?.count ?? 0);
  }

  async countDueOn(dateIso: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<{ count: string }>(`
      select count(*)::text as count
      from bakki_task
      where due_at::date = $1::date
    `, [dateIso]);

    return Number(result.rows[0]?.count ?? 0);
  }

  async listProgramCandidates(dateIso: string, limit = 3) {
    await this.ensureSchema();
    const dated = await this.bakkiCore.query<BakkiTaskMirrorRow>(`
      select
        ${BAKKI_TASK_MIRROR_SELECT_FIELDS}
      from bakki_task
      where due_at::date = $1::date
      order by priority desc, due_at asc, last_synced_at desc, id desc
      limit $2
    `, [dateIso, limit]);

    if (dated.rows.length > 0) {
      return dated.rows.map(mapBakkiTaskMirrorRow);
    }

    const open = await this.bakkiCore.query<BakkiTaskMirrorRow>(`
      select
        ${BAKKI_TASK_MIRROR_SELECT_FIELDS}
      from bakki_task
      where workflow_state = any($1::text[])
      order by
        priority desc,
        case when due_at is null then 1 else 0 end asc,
        due_at asc,
        last_synced_at desc,
        id desc
      limit $2
    `, [['pending', 'in_progress'], limit]);

    return open.rows.map(mapBakkiTaskMirrorRow);
  }

  async upsert(input: UpsertBakkiTaskMirrorInput) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiTaskMirrorRow>(`
      insert into bakki_task (
        odoo_task_id,
        title,
        assignee_name,
        workflow_state,
        priority,
        odoo_stage_id,
        odoo_stage_name,
        due_at,
        template_ref,
        task_type,
        area_ref,
        phase_ref,
        geometry_snapshot_geojson,
        monitoring_density_per_100sqm,
        monitoring_tree_count,
        sync_status,
        sync_error,
        sync_retry_count,
        last_sync_attempt_at,
        last_synced_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, 'ok', null, 0, now(), now())
      on conflict (odoo_task_id)
      do update set
        title = excluded.title,
        assignee_name = coalesce(excluded.assignee_name, bakki_task.assignee_name),
        workflow_state = excluded.workflow_state,
        priority = coalesce(excluded.priority, bakki_task.priority),
        odoo_stage_id = excluded.odoo_stage_id,
        odoo_stage_name = excluded.odoo_stage_name,
        due_at = excluded.due_at,
        template_ref = coalesce(excluded.template_ref, bakki_task.template_ref),
        task_type = excluded.task_type,
        area_ref = excluded.area_ref,
        phase_ref = excluded.phase_ref,
        geometry_snapshot_geojson = coalesce(excluded.geometry_snapshot_geojson, bakki_task.geometry_snapshot_geojson),
        monitoring_density_per_100sqm = coalesce(excluded.monitoring_density_per_100sqm, bakki_task.monitoring_density_per_100sqm),
        monitoring_tree_count = coalesce(excluded.monitoring_tree_count, bakki_task.monitoring_tree_count),
        sync_status = 'ok',
        sync_error = null,
        sync_retry_count = 0,
        last_sync_attempt_at = now(),
        last_synced_at = now()
      returning
        ${BAKKI_TASK_MIRROR_SELECT_FIELDS}
    `, [
      input.odooTaskId,
      input.title,
      input.assigneeName ?? null,
      input.workflowState,
      input.priority ?? '0',
      input.odooStageId ?? null,
      input.odooStageName ?? null,
      input.dueAt ?? null,
      input.templateRef ?? null,
      input.taskType ?? null,
      input.areaRef ?? null,
      input.phaseRef ?? null,
      input.geometrySnapshot ? JSON.stringify(input.geometrySnapshot) : null,
      input.monitoringDensityPer100Sqm ?? null,
      input.monitoringTreeCount ?? null,
    ]);

    return mapBakkiTaskMirrorRow(requireFirstRow(result.rows, 'Failed to upsert Bakki task mirror.'));
  }

  async markSyncFailureByOdooTaskId(odooTaskId: number, error: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiTaskMirrorRow>(`
      update bakki_task
      set sync_status = 'error',
          sync_error = left($2, 1000),
          sync_retry_count = coalesce(sync_retry_count, 0) + 1,
          last_sync_attempt_at = now()
      where odoo_task_id = $1
      returning
        ${BAKKI_TASK_MIRROR_SELECT_FIELDS}
    `, [odooTaskId, error]);

    const row = result.rows[0];
    return row ? mapBakkiTaskMirrorRow(row) : null;
  }

  async getSyncHealthSummary(): Promise<MirrorSyncHealthSummary> {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiTaskMirrorHealthRow>(`
      select
        count(*)::text as total,
        count(*) filter (where sync_status = 'ok')::text as ok_count,
        count(*) filter (where sync_status = 'error')::text as error_count,
        count(*) filter (where sync_retry_count > 0)::text as retrying_count,
        max(last_sync_attempt_at) as last_attempt_at,
        max(last_synced_at) filter (where sync_status = 'ok') as last_success_at
      from bakki_task
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
    await this.bakkiGeometry.ensureAreaCatalog();
    await this.bakkiTaskTemplates.ensureSchema();

    await this.bakkiCore.query(`
      create table if not exists bakki_task (
        id bigserial primary key,
        odoo_task_id bigint not null unique,
        title text not null,
        assignee_name text,
        workflow_state text not null check (workflow_state in ('pending', 'in_progress', 'done', 'cancelled')),
        priority text not null default '0',
        odoo_stage_id bigint,
        odoo_stage_name text,
        due_at timestamptz,
        template_ref text references bakki_task_template(template_ref) on delete set null,
        task_type text,
        area_ref text references bakki_area(area_ref) on delete set null,
        phase_ref text,
        geometry_snapshot_geojson jsonb,
        monitoring_density_per_100sqm numeric,
        monitoring_tree_count integer,
        sync_status text not null default 'ok' check (sync_status in ('ok', 'error')),
        sync_error text,
        sync_retry_count integer not null default 0,
        last_sync_attempt_at timestamptz not null default now(),
        last_synced_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create unique index if not exists bakki_task_odoo_task_id_idx
      on bakki_task (odoo_task_id)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_task_workflow_state_idx
      on bakki_task (workflow_state)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_task_due_at_idx
      on bakki_task (due_at)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_task_sync_status_idx
      on bakki_task (sync_status)
    `);
    await this.bakkiCore.query(`
      alter table bakki_task
      add column if not exists priority text not null default '0'
    `);
    await this.bakkiCore.query(`
      alter table bakki_task
      add column if not exists assignee_name text
    `);
    await this.bakkiCore.query(`
      alter table bakki_task
      add column if not exists sync_status text not null default 'ok'
    `);
    await this.bakkiCore.query(`
      alter table bakki_task
      add column if not exists sync_error text
    `);
    await this.bakkiCore.query(`
      alter table bakki_task
      add column if not exists sync_retry_count integer not null default 0
    `);
    await this.bakkiCore.query(`
      alter table bakki_task
      add column if not exists last_sync_attempt_at timestamptz not null default now()
    `);
    await this.bakkiCore.query(`
      update bakki_task
      set last_sync_attempt_at = coalesce(last_sync_attempt_at, last_synced_at, now()),
          sync_status = coalesce(sync_status, 'ok'),
          sync_retry_count = coalesce(sync_retry_count, 0)
      where last_sync_attempt_at is null
         or sync_status is null
         or sync_retry_count is null
    `);
    await this.bakkiCore.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conname = 'bakki_task_area_ref_fkey'
        ) then
          alter table bakki_task
          add constraint bakki_task_area_ref_fkey
          foreign key (area_ref) references bakki_area(area_ref) on delete set null;
        end if;

        if not exists (
          select 1
          from information_schema.columns
          where table_name = 'bakki_task'
            and column_name = 'geometry_snapshot_geojson'
        ) then
          alter table bakki_task
          add column geometry_snapshot_geojson jsonb;
        end if;

        if not exists (
          select 1
          from information_schema.columns
          where table_name = 'bakki_task'
            and column_name = 'template_ref'
        ) then
          alter table bakki_task
          add column template_ref text;
        end if;

        if not exists (
          select 1
          from pg_constraint
          where conname = 'bakki_task_template_ref_fkey'
        ) then
          alter table bakki_task
          add constraint bakki_task_template_ref_fkey
          foreign key (template_ref) references bakki_task_template(template_ref) on delete set null;
        end if;
      end
      $$;
    `);

    this.schemaEnsured = true;
  }
}

// Mobile task row type and mapper
interface MobileTaskRow {
  id: number | string;
  task_ref: string;
  title: string;
  description: string | null;
  workflow_state: string;
  priority: string | null;
  due_at: Date | string | null;
  area_ref: string | null;
  area_name: string | null;
  zone_ref: string | null;
  zone_name: string | null;
  assignee_username: string | null;
  assignee_user_id: number | string | null;
  template_ref: string | null;
  task_type: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface MobileTaskRecord {
  taskRef: string;
  title: string;
  description: string | null;
  workflowState: string;
  priority: string;
  dueDate: string | null;
  areaRef: string | null;
  areaName: string | null;
  zoneRef: string | null;
  zoneName: string | null;
  assigneeUsername: string | null;
  assigneeUserId: number | null;
  templateRef: string | null;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapMobileTaskRow(row: MobileTaskRow): MobileTaskRecord {
  return {
    taskRef: String(row.task_ref),
    title: row.title,
    description: row.description,
    workflowState: row.workflow_state,
    priority: row.priority ?? '0',
    dueDate: row.due_at instanceof Date
      ? row.due_at.toISOString()
      : row.due_at
        ? new Date(row.due_at).toISOString()
        : null,
    areaRef: row.area_ref,
    areaName: row.area_name,
    zoneRef: row.zone_ref,
    zoneName: row.zone_name,
    assigneeUsername: row.assignee_username,
    assigneeUserId: row.assignee_user_id !== null ? Number(row.assignee_user_id) : null,
    templateRef: row.template_ref,
    type: row.task_type,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : new Date(row.updated_at).toISOString(),
  };
}
