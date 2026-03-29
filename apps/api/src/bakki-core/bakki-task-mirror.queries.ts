import type { BakkiTaskPriority, BakkiWorkflowState, GeoJsonGeometry } from '@bakki/domain';
import type { BakkiTaskMirrorRecord } from './bakki-task-mirror.service';
import { normalizeTaskPriority } from '../modules/tasks/tasks.service.helpers';
export { toIsoString } from './query-date.utils';

export interface BakkiTaskMirrorRow {
  assignee_name: string | null;
  area_ref: string | null;
  due_at: Date | string | null;
  geometry_snapshot_geojson: GeoJsonGeometry | string | null;
  id: number;
  last_sync_attempt_at: Date | string;
  last_synced_at: Date | string;
  monitoring_density_per_100sqm: number | string | null;
  monitoring_tree_count: number | null;
  priority: BakkiTaskPriority | null;
  odoo_stage_id: number | null;
  odoo_stage_name: string | null;
  odoo_task_id: number;
  phase_ref: string | null;
  task_type: string | null;
  template_ref: string | null;
  title: string;
  workflow_state: BakkiWorkflowState;
  sync_error: string | null;
  sync_retry_count: number | string;
  sync_status: 'error' | 'ok';
}

export interface BakkiTaskMirrorHealthRow {
  error_count: string;
  last_attempt_at: Date | string | null;
  last_success_at: Date | string | null;
  ok_count: string;
  retrying_count: string;
  total: string;
}

export const BAKKI_TASK_MIRROR_SELECT_FIELDS = `
  id,
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
`;

export function mapBakkiTaskMirrorRow(row: BakkiTaskMirrorRow): BakkiTaskMirrorRecord {
  return {
    id: Number(row.id),
    odooTaskId: Number(row.odoo_task_id),
    title: row.title,
    assigneeName: row.assignee_name,
    workflowState: row.workflow_state,
    priority: normalizeTaskPriority(row.priority),
    odooStageId: row.odoo_stage_id === null ? null : Number(row.odoo_stage_id),
    odooStageName: row.odoo_stage_name,
    geometrySnapshot:
      row.geometry_snapshot_geojson === null
        ? null
        : typeof row.geometry_snapshot_geojson === 'string'
          ? JSON.parse(row.geometry_snapshot_geojson) as GeoJsonGeometry
          : row.geometry_snapshot_geojson,
    dueAt:
      row.due_at instanceof Date
        ? row.due_at.toISOString()
        : row.due_at
          ? new Date(row.due_at).toISOString()
          : null,
    templateRef: row.template_ref,
    taskType: row.task_type,
    areaRef: row.area_ref,
    phaseRef: row.phase_ref,
    monitoringDensityPer100Sqm:
      row.monitoring_density_per_100sqm === null
        ? null
        : Number(row.monitoring_density_per_100sqm),
    monitoringTreeCount: row.monitoring_tree_count === null ? null : Number(row.monitoring_tree_count),
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    syncRetryCount: Number(row.sync_retry_count ?? 0),
    lastSyncAttemptAt:
      row.last_sync_attempt_at instanceof Date
        ? row.last_sync_attempt_at.toISOString()
        : new Date(row.last_sync_attempt_at).toISOString(),
    lastSyncedAt:
      row.last_synced_at instanceof Date
        ? row.last_synced_at.toISOString()
        : new Date(row.last_synced_at).toISOString(),
  };
}
