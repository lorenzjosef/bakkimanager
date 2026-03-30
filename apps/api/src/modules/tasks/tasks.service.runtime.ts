import type {
  BakkiTaskPriority,
  BakkiWorkflowState,
  GeoJsonGeometry,
  TaskManagementData,
} from '@bakki/domain';
import {
  inferTaskTypeFromTitle,
  inferWorkflowStateFromStageLabel,
} from '../../odoo/odoo-task-mapping';
import type { OdooService } from '../../odoo/odoo.service';
import type { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import type { BakkiTaskMirrorService } from '../../bakki-core/bakki-task-mirror.service';
import type { BakkiTaskTemplateService } from '../../bakki-core/bakki-task-template.service';
import {
  buildDistributionItems,
  dedupeOdooTaskSummaries,
  getStageLabel,
  mapMirrorToTaskRow,
  mapOdooTaskToTaskRow,
  normalizeTaskPriority,
  normalizeTaskType,
  parseRequestedAssignee,
  type OdooTaskSummaryRecord,
} from './tasks.service.helpers';
import {
  countOdooTasksByWorkflowStates,
  getTodayIsoDate,
} from './tasks.service.support';

export interface TaskRuntimeDeps {
  bakkiGeometry: BakkiGeometryService;
  bakkiTaskTemplates: BakkiTaskTemplateService;
  bakkiTasks: BakkiTaskMirrorService;
  logger: {
    warn: (message: string) => void;
  };
  odoo: OdooService;
}

export interface TaskMirrorFieldOverrides {
  assigneeName?: string | null;
  areaRef?: string | null;
  geometrySnapshot?: GeoJsonGeometry | null;
  monitoringDensityPer100Sqm?: number | null;
  monitoringTreeCount?: number | null;
  priority?: BakkiTaskPriority | null;
  phaseRef?: string | null;
  taskType?: string | null;
  templateRef?: string | null;
}

export async function refreshTaskMirrorsFromOdoo(deps: TaskRuntimeDeps, limit = 100) {
  if (!deps.odoo.isConfigured() || !deps.bakkiTasks.isConfigured()) {
    return {
      failed: 0,
      fetched: 0,
      synced: 0,
    };
  }

  const recentTasks = await deps.odoo.searchRead<OdooTaskSummaryRecord>(
    'project.task',
    [],
    ['name', 'description', 'date_deadline', 'priority', 'stage_id', 'project_id'],
    { limit, order: 'write_date desc, id desc' },
  );
  const erroredTaskIds = await deps.bakkiTasks.listErroredOdooTaskIds(limit);
  const missingErroredTaskIds = erroredTaskIds.filter(
    (taskId) => !recentTasks.some((task) => task.id === taskId),
  );
  const erroredTasks = missingErroredTaskIds.length > 0
    ? await deps.odoo.searchRead<OdooTaskSummaryRecord>(
        'project.task',
        [['id', 'in', missingErroredTaskIds]],
        ['name', 'description', 'date_deadline', 'priority', 'stage_id', 'project_id'],
        { order: 'id desc' },
      )
    : [];
  const tasks = dedupeOdooTaskSummaries([...recentTasks, ...erroredTasks]);

  // Process tasks in parallel batches for better performance
  const BATCH_SIZE = 10;
  let synced = 0;
  let failed = 0;

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((task) => syncTaskMirrorFromOdooTask(deps, task)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        synced += 1;
      } else {
        failed += 1;
        const task = batch[j];
        const message = result.reason instanceof Error ? result.reason.message : 'Unknown task mirror refresh error';
        await deps.bakkiTasks.markSyncFailureByOdooTaskId(task.id, message);
        deps.logger.warn(`Task mirror refresh failed for Odoo task ${task.id}: ${message}`);
      }
    }
  }

  return {
    failed,
    fetched: tasks.length,
    synced,
  };
}

export async function refreshTaskMirrorForOdooTaskId(deps: TaskRuntimeDeps, odooTaskId: number) {
  if (!deps.odoo.isConfigured() || !deps.bakkiTasks.isConfigured()) {
    return null;
  }

  const [task] = await deps.odoo.searchRead<OdooTaskSummaryRecord>(
    'project.task',
    [['id', '=', odooTaskId]],
    ['name', 'description', 'date_deadline', 'priority', 'stage_id', 'project_id'],
    { limit: 1 },
  );

  if (!task) {
    return null;
  }

  try {
    await syncTaskMirrorFromOdooTask(deps, task);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown task mirror refresh error';
    await deps.bakkiTasks.markSyncFailureByOdooTaskId(task.id, message);
    throw error;
  }

  return deps.bakkiTasks.getByOdooTaskId(odooTaskId);
}

export async function getBakkiCoreTaskSummary(
  deps: Pick<TaskRuntimeDeps, 'bakkiGeometry' | 'bakkiTasks'>,
): Promise<TaskManagementData> {
  const [activeTasks, dueToday, recentTasks] = await Promise.all([
    deps.bakkiTasks.countByWorkflowStates(['pending', 'in_progress']),
    deps.bakkiTasks.countDueOn(getTodayIsoDate()),
    deps.bakkiTasks.listRecent(100),
  ]);

  const areaRefs = Array.from(new Set(
    recentTasks
      .map((task) => task.areaRef)
      .filter((areaRef): areaRef is string => Boolean(areaRef)),
  ));
  const areaCatalogByRef = await deps.bakkiGeometry.getAreasByRefs(areaRefs);
  const rows = recentTasks.map((task) => mapMirrorToTaskRow(task, areaCatalogByRef));

  return {
    activeTasks: String(activeTasks),
    dueToday: String(dueToday),
    distributionItems: buildDistributionItems(rows),
    rows,
  };
}

export async function getOdooTaskSummary(deps: TaskRuntimeDeps): Promise<TaskManagementData> {
  const [activeTasks, dueToday, tasks] = await Promise.all([
    countOdooTasksByWorkflowStates({ states: ['pending', 'in_progress'], odoo: deps.odoo }),
    deps.odoo.searchCount('project.task', [['date_deadline', '=', getTodayIsoDate()]]),
    deps.odoo.searchRead<OdooTaskSummaryRecord>(
      'project.task',
      [],
      ['name', 'description', 'date_deadline', 'priority', 'stage_id', 'project_id'],
      { limit: 100, order: 'date_deadline asc, priority desc, write_date desc' },
    ),
  ]);

  await Promise.all(
    tasks.map(async (task) => {
      if (!deps.bakkiTasks.isConfigured()) {
        return;
      }

      try {
        await syncTaskMirrorFromOdooTask(deps, task);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown task mirror sync error';
        await deps.bakkiTasks.markSyncFailureByOdooTaskId(task.id, message);
        deps.logger.warn(`Bakki task mirror sync failed for Odoo task ${task.id}: ${message}`);
      }
    }),
  );

  const mirrors = deps.bakkiTasks.isConfigured()
    ? await deps.bakkiTasks.listByOdooTaskIds(tasks.map((task) => task.id))
    : new Map<number, Awaited<ReturnType<BakkiTaskMirrorService['getByOdooTaskId']>>>();
  const areaRefs = Array.from(new Set(
    Array.from(mirrors.values())
      .map((task) => task?.areaRef ?? null)
      .filter((areaRef): areaRef is string => Boolean(areaRef)),
  ));
  const areaCatalogByRef = await deps.bakkiGeometry.getAreasByRefs(areaRefs);
  const rows = tasks.map((task) => mapOdooTaskToTaskRow(task, mirrors.get(task.id) ?? null, areaCatalogByRef));

  return {
    activeTasks: String(activeTasks),
    dueToday: String(dueToday),
    distributionItems: buildDistributionItems(rows),
    rows,
  };
}

export async function syncTaskMirrorFromOdooTask(
  deps: Pick<TaskRuntimeDeps, 'bakkiTaskTemplates' | 'bakkiTasks' | 'odoo'>,
  task: OdooTaskSummaryRecord,
  workflowStateOverride?: BakkiWorkflowState,
  fieldsOverride?: TaskMirrorFieldOverrides,
) {
  if (!deps.bakkiTasks.isConfigured()) {
    return;
  }

  const existing = await deps.bakkiTasks.getByOdooTaskId(task.id);
  const workflowState = workflowStateOverride
    ?? existing?.workflowState
    ?? inferWorkflowStateFromStageLabel(getStageLabel(task.stage_id))
    ?? 'pending';
  const normalizedTaskType = normalizeTaskType(fieldsOverride?.taskType)
    ?? normalizeTaskType(existing?.taskType)
    ?? inferTaskTypeFromTitle(task.name);
  const inferredTemplate = fieldsOverride?.templateRef
    ? await deps.bakkiTaskTemplates.getByRef(fieldsOverride.templateRef)
    : normalizedTaskType
      ? await deps.bakkiTaskTemplates.getDefaultByTaskType(normalizedTaskType)
      : null;

  await deps.bakkiTasks.upsert({
    odooTaskId: task.id,
    title: task.name || `Task ${task.id}`,
    assigneeName: fieldsOverride?.assigneeName ?? parseRequestedAssignee(task.description) ?? existing?.assigneeName ?? null,
    workflowState,
    odooStageId: Array.isArray(task.stage_id) ? task.stage_id[0] : null,
    odooStageName: getStageLabel(task.stage_id),
    dueAt: typeof task.date_deadline === 'string' ? task.date_deadline : null,
    priority: normalizeTaskPriority(
      fieldsOverride?.priority
        ?? (typeof task.priority === 'string' ? task.priority : null)
        ?? existing?.priority
        ?? '0',
    ),
    taskType: normalizedTaskType ?? null,
    templateRef: fieldsOverride?.templateRef ?? inferredTemplate?.templateRef ?? existing?.templateRef ?? null,
    areaRef: fieldsOverride?.areaRef ?? existing?.areaRef ?? null,
    geometrySnapshot: fieldsOverride?.geometrySnapshot ?? existing?.geometrySnapshot ?? null,
    phaseRef: fieldsOverride?.phaseRef ?? existing?.phaseRef ?? null,
    monitoringDensityPer100Sqm:
      fieldsOverride?.monitoringDensityPer100Sqm ?? existing?.monitoringDensityPer100Sqm ?? null,
    monitoringTreeCount:
      fieldsOverride?.monitoringTreeCount ?? existing?.monitoringTreeCount ?? null,
  });
}
