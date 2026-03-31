import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Logger } from '@nestjs/common';
import {
  type BakkiWorkflowState,
  type CreateTaskRequest,
  type CreateTaskResponse,
  type RecordMonitoringResultRequest,
  type RecordMonitoringResultResponse,
  type UpdateTaskWorkflowResponse,
} from '@bakki/domain';
import type { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import type { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import type { BakkiMapAuditService } from '../../bakki-core/bakki-map-audit.service';
import type { BakkiTaskMirrorService } from '../../bakki-core/bakki-task-mirror.service';
import type { BakkiTaskTemplateService } from '../../bakki-core/bakki-task-template.service';
import type { BakkiTreeSurveyService } from '../../bakki-core/bakki-tree-survey.service';
import type { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import { inferTaskTypeFromTitle } from '../../odoo/odoo-task-mapping';
import type { OdooService } from '../../odoo/odoo.service';
import type { AuditService } from '../audit/audit.service';
import type { AuthService } from '../auth/auth.service';
import { requireOwnerSessionActor } from '../auth/owner-session.helpers';
import {
  buildTaskDescription,
  buildTaskName,
  normalizeTaskType,
  normalizeTaskPriority,
  type OdooTaskSummaryRecord,
  parseNumericTaskId,
  workflowStateLabel,
} from './tasks.service.helpers';
import {
  resolveDoneStageId,
  resolveTaskAssigneeOdooUserId,
  resolveStageIdForWorkflowState,
  resolveTaskAreaRef,
  resolveTaskTemplate,
  validateCreateTaskInput,
} from './tasks.service.support';
import {
  syncTaskMirrorFromOdooTask,
  type TaskRuntimeDeps,
} from './tasks.service.runtime';

interface OdooProjectRecord {
  id: number;
}

interface TreePlotLookup {
  createdByUserId?: number | null;
  geometry: import('@bakki/domain').GeoJsonGeometry;
  plotRef: string;
}

interface TreePlotSummaryLookup {
  plotRef: string;
}

function isTreePlotLookup(value: unknown): value is TreePlotLookup {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as {
    createdByUserId?: unknown;
    geometry?: { coordinates?: unknown; type?: unknown };
    plotRef?: unknown;
  };
  return (
    typeof candidate.plotRef === 'string'
    && typeof candidate.geometry?.type === 'string'
    && candidate.geometry.coordinates !== undefined
  );
}

function isTreePlotSummaryLookup(value: unknown): value is TreePlotSummaryLookup {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as { plotRef?: unknown };
  return typeof candidate.plotRef === 'string';
}

interface TasksServiceMutationDeps {
  auditService: AuditService;
  authService: AuthService;
  bakkiAreaMetrics: BakkiAreaMetricsService;
  bakkiGeometry: BakkiGeometryService;
  bakkiMapAudit: BakkiMapAuditService;
  bakkiTaskTemplates: BakkiTaskTemplateService;
  bakkiTreeSurvey: BakkiTreeSurveyService;
  bakkiTasks: BakkiTaskMirrorService;
  bakkiUsers: BakkiUserMirrorService;
  logger: Pick<Logger, 'error'>;
  odoo: OdooService;
}

export async function createTask(
  deps: TasksServiceMutationDeps,
  runtimeDeps: TaskRuntimeDeps,
  input: CreateTaskRequest,
  sessionToken?: string,
): Promise<CreateTaskResponse> {
  validateCreateTaskInput(input);
  const actor = await requireOwnerActor(deps, sessionToken);

  if (!deps.odoo.isConfigured()) {
    throw new ServiceUnavailableException('Bakki task activity is currently unavailable.');
  }

  let taskId: number | null = null;
  try {
    const [defaultProject] = await deps.odoo.searchRead<OdooProjectRecord>(
      'project.project',
      [],
      ['id'],
      { limit: 1, order: 'id asc' },
    );

    // Parallelize independent resolvers for better performance
    const [template, resolvedArea, assigneeOdooUserId, pendingStageId] = await Promise.all([
      resolveTaskTemplate({
        bakkiTaskTemplates: deps.bakkiTaskTemplates,
        input,
      }),
      resolveTaskAreaRef({
        bakkiGeometry: deps.bakkiGeometry,
        input,
      }),
      resolveTaskAssigneeOdooUserId({
        bakkiUsers: deps.bakkiUsers,
        input,
      }),
      resolveStageIdForWorkflowState({
        workflowState: 'pending',
        project: defaultProject?.id ? [defaultProject.id, ''] : false,
        odoo: deps.odoo,
      }),
    ]);

    const taskName = buildTaskName(template.label, input.areaLabel);
    const description = buildTaskDescription(input);
    const geometrySnapshot = resolvedArea?.areaRef
      ? await deps.bakkiGeometry.getAreaGeometrySnapshotByRef(resolvedArea.areaRef)
      : null;

    const createValues: Record<string, unknown> = {
      name: taskName,
      description,
    };

    if (input.dueDate) {
      createValues.date_deadline = input.dueDate;
    }

    if (defaultProject?.id) {
      createValues.project_id = defaultProject.id;
    }

    if (assigneeOdooUserId) {
      createValues.user_ids = [[6, 0, [assigneeOdooUserId]]];
    }

    createValues.priority = normalizeTaskPriority(input.priority);

    if (pendingStageId) {
      createValues.stage_id = pendingStageId;
    }

    taskId = await deps.odoo.executeKw<number>('project.task', 'create', [createValues]);

    await syncTaskMirrorFromOdooTask(runtimeDeps, {
      id: taskId,
      name: taskName,
      date_deadline: input.dueDate || false,
      priority: normalizeTaskPriority(input.priority),
      stage_id: pendingStageId ? [pendingStageId, workflowStateLabel('pending')] : false,
      project_id: defaultProject?.id ? [defaultProject.id, ''] : false,
    }, 'pending', {
      assigneeName: input.assigneeLabel?.trim() || null,
      areaRef: resolvedArea?.areaRef ?? null,
      geometrySnapshot,
      priority: normalizeTaskPriority(input.priority),
      taskType: template.taskType,
      templateRef: template.templateRef,
    });

    await deps.auditService.recordEvent({
      actor: actor.actorId,
      message: `Created ${input.taskType} task ${taskName}`,
      payload: {
        areaId: resolvedArea?.areaRef ?? null,
        areaLabel: resolvedArea?.areaName || input.areaLabel.trim(),
        dueDate: input.dueDate || null,
        templateRef: template.templateRef,
      },
      targetModel: 'project.task',
      targetResId: taskId,
      type: 'task.create',
    });

    return {
      createdTaskId: `task-${taskId}`,
      createdTaskName: taskName,
      templateRef: template.templateRef,
      workflowState: 'pending',
      stageLabel: null,
      dueDate: input.dueDate || null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown task create error';
    if (taskId !== null) {
      await deps.bakkiTasks.markSyncFailureByOdooTaskId(taskId, message);
    }
    deps.logger.error(`Odoo task creation failed: ${message}`);
    throw new BadRequestException('Task could not be created.');
  }
}

export async function updateWorkflowState(
  deps: TasksServiceMutationDeps,
  runtimeDeps: TaskRuntimeDeps,
  taskId: string,
  workflowState: BakkiWorkflowState,
  sessionToken?: string,
): Promise<UpdateTaskWorkflowResponse> {
  const actor = await requireOwnerActor(deps, sessionToken);

  if (!deps.odoo.isConfigured()) {
    throw new ServiceUnavailableException('Bakki task activity is currently unavailable.');
  }

  const numericTaskId = parseNumericTaskId(taskId);
  if (!numericTaskId) {
    throw new BadRequestException('Invalid task identifier.');
  }

  const [task] = await deps.odoo.searchRead<OdooTaskSummaryRecord>(
    'project.task',
    [['id', '=', numericTaskId]],
    ['name', 'project_id', 'date_deadline', 'stage_id'],
    { limit: 1 },
  );

  if (!task) {
    throw new BadRequestException('Task could not be found.');
  }

  const stageId = await resolveStageIdForWorkflowState({
    workflowState,
    project: task.project_id,
    odoo: deps.odoo,
  });
  if (!stageId) {
    throw new BadRequestException(`No task stage is configured for workflow state "${workflowState}".`);
  }

  try {
    await deps.odoo.executeKw<boolean>('project.task', 'write', [
      [numericTaskId],
      { stage_id: stageId },
    ]);

    await syncTaskMirrorFromOdooTask(
      runtimeDeps,
      {
        ...task,
        id: numericTaskId,
        stage_id: [stageId, workflowStateLabel(workflowState)],
      },
      workflowState,
    );

    await deps.auditService.recordEvent({
      actor: actor.actorId,
      message: `Updated workflow for task ${numericTaskId}`,
      payload: { workflowState },
      targetModel: 'project.task',
      targetResId: numericTaskId,
      type: 'task.workflow_update',
    });

    return {
      taskId: `task-${numericTaskId}`,
      workflowState,
      stageLabel: workflowStateLabel(workflowState),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown workflow update error';
    await deps.bakkiTasks.markSyncFailureByOdooTaskId(numericTaskId, message);
    deps.logger.error(`Task workflow update failed: ${message}`);
    throw new BadRequestException('Task workflow could not be updated.');
  }
}

export async function recordMonitoringResult(
  deps: TasksServiceMutationDeps,
  runtimeDeps: TaskRuntimeDeps,
  taskId: string,
  input: RecordMonitoringResultRequest,
  sessionToken?: string,
): Promise<RecordMonitoringResultResponse> {
  if (
    typeof input.densityPer100Sqm !== 'number'
    || !Number.isFinite(input.densityPer100Sqm)
    || input.densityPer100Sqm <= 0
  ) {
    throw new BadRequestException('Monitoring density must be a positive number.');
  }

  if (
    typeof input.treeCount === 'number'
    && (!Number.isFinite(input.treeCount) || input.treeCount < 0)
  ) {
    throw new BadRequestException('Monitoring tree count must be zero or a positive number.');
  }

  if (!deps.odoo.isConfigured()) {
    throw new ServiceUnavailableException('Bakki task activity is currently unavailable.');
  }

  if (!deps.bakkiAreaMetrics.isConfigured()) {
    throw new ServiceUnavailableException(
      'Bakki Core area metrics storage is currently unavailable.',
    );
  }

  const actor = await deps.authService.requireSessionActor(sessionToken);
  if (!actor.userId || !actor.profileId) {
    throw new BadRequestException('Authenticated monitoring updates require a Bakki user context.');
  }

  const numericTaskId = parseNumericTaskId(taskId);
  if (!numericTaskId) {
    throw new BadRequestException('Invalid task identifier.');
  }

  const [task] = await deps.odoo.searchRead<OdooTaskSummaryRecord>(
    'project.task',
    [['id', '=', numericTaskId]],
    ['name', 'project_id', 'stage_id'],
    { limit: 1 },
  );

  if (!task) {
    throw new BadRequestException('Monitoring task not found.');
  }

  const mirroredTask = deps.bakkiTasks.isConfigured()
    ? await deps.bakkiTasks.getByOdooTaskId(numericTaskId)
    : null;
  const effectiveTaskType = normalizeTaskType(mirroredTask?.taskType)
    ?? inferTaskTypeFromTitle(task.name);
  if (effectiveTaskType !== 'monitoring') {
    throw new BadRequestException('Only monitoring tasks can record density results.');
  }

  const areaRef = mirroredTask?.areaRef ?? null;

  if (!areaRef) {
    throw new BadRequestException('Monitoring task is not linked to a Bakki area.');
  }

  try {
    const doneStageId = await resolveDoneStageId({
      odoo: deps.odoo,
      project: task.project_id,
    });
    const areaRefFromInput = input.areaId?.trim() || null;
    const targetAreaRef = areaRefFromInput || areaRef;
    if (!targetAreaRef) {
      throw new BadRequestException('Monitoring task is not linked to a Bakki area.');
    }
    if (
      typeof input.sampledAreaSqm === 'number'
      && (!Number.isFinite(input.sampledAreaSqm) || input.sampledAreaSqm <= 0)
    ) {
      throw new BadRequestException('Sampled area must be a positive number.');
    }
    if (
      typeof input.meanHeightM === 'number'
      && (!Number.isFinite(input.meanHeightM) || input.meanHeightM < 0)
    ) {
      throw new BadRequestException('Mean height must be zero or a positive number.');
    }
    if (
      typeof input.meanDiameterCm === 'number'
      && (!Number.isFinite(input.meanDiameterCm) || input.meanDiameterCm < 0)
    ) {
      throw new BadRequestException('Mean diameter must be zero or a positive number.');
    }

    const projectedAreaMetrics = await deps.bakkiAreaMetrics.getByAreaRef(targetAreaRef);
    const densitySource = projectedAreaMetrics?.source;
    const shouldRecordAsPlotSample = densitySource === 'plot_estimate_projection'
      || (deps.bakkiTreeSurvey.isConfigured() && Boolean(areaRefFromInput));

    let observationId: string;
    if (shouldRecordAsPlotSample && deps.bakkiTreeSurvey.isConfigured()) {
      const areaGeometry = await deps.bakkiGeometry.getAreaGeometrySnapshotByRef(targetAreaRef);
      if (!areaGeometry) {
        throw new BadRequestException('Monitoring area geometry was not found.');
      }

      const candidatePlots = (await deps.bakkiTreeSurvey.listPlots())
        .filter((plot) => isTreePlotSummaryLookup(plot));
      const candidateDetails = await Promise.all(
        candidatePlots.map((plot) => deps.bakkiTreeSurvey.getPlot(plot.plotRef)),
      );
      const matchingPlots = candidateDetails.filter((plot) => {
        if (!isTreePlotLookup(plot)) {
          return false;
        }
        if (
          typeof plot.createdByUserId === 'number'
          && plot.createdByUserId !== actor.profileId
        ) {
          return false;
        }
        return intersectsGeometry(plot.geometry, areaGeometry);
      });
      if (matchingPlots.length === 0) {
        throw new BadRequestException('No survey plot intersects the selected monitoring area.');
      }
      const selectedPlot = matchingPlots.find(isTreePlotLookup);
      if (!selectedPlot) {
        throw new BadRequestException('No survey plot intersects the selected monitoring area.');
      }
      const sample = await deps.bakkiTreeSurvey.recordSample(selectedPlot.plotRef, {
        actorUserId: actor.profileId,
        densityPer100Sqm: input.densityPer100Sqm,
        treeCount:
          typeof input.treeCount === 'number' ? Math.round(input.treeCount) : undefined,
        sampledAreaSqm: input.sampledAreaSqm,
        meanHeightM: input.meanHeightM,
        meanDiameterCm: input.meanDiameterCm,
        taskRef: `task-${numericTaskId}`,
        notes: input.notes,
        sampledAt: input.observedAt,
      });
      observationId = sample.id;
    } else {
      const observation = await deps.bakkiAreaMetrics.recordObservation({
        actorUserId: actor.profileId,
        areaRef: targetAreaRef,
        densityPer100Sqm: input.densityPer100Sqm,
        treeCount:
          typeof input.treeCount === 'number' ? Math.round(input.treeCount) : undefined,
        notes: input.notes,
        observedAt: input.observedAt,
        taskRef: `task-${numericTaskId}`,
      });
      observationId = observation.observationId;
    }

    await Promise.all([
      deps.odoo.executeKw<boolean>('project.task', 'write', [
        [numericTaskId],
        {
          ...(doneStageId ? { stage_id: doneStageId } : {}),
        },
      ]),
      syncTaskMirrorFromOdooTask(
        runtimeDeps,
        {
          ...task,
          id: numericTaskId,
          stage_id: doneStageId ? [doneStageId, workflowStateLabel('done')] : task.stage_id,
        },
        'done',
        {
          areaRef: targetAreaRef,
          monitoringDensityPer100Sqm: input.densityPer100Sqm,
          monitoringTreeCount:
            typeof input.treeCount === 'number' ? Math.round(input.treeCount) : null,
          taskType: mirroredTask?.taskType ?? effectiveTaskType,
          phaseRef: mirroredTask?.phaseRef ?? null,
        },
      ),
    ]);

    const auditPayload: Record<string, unknown> = {
      areaId: targetAreaRef,
      densityPer100Sqm: input.densityPer100Sqm,
      treeCount: typeof input.treeCount === 'number' ? Math.round(input.treeCount) : null,
      source: shouldRecordAsPlotSample ? 'plot_estimate_projection' : 'legacy_area_metrics',
    };
    await deps.auditService.recordEvent({
      actor: actor.session.user.id,
      message: `Recorded monitoring result for task ${numericTaskId}`,
      type: 'task.monitoring_result',
      targetModel: 'project.task',
      targetResId: numericTaskId,
      payload: auditPayload,
    });
    await deps.bakkiMapAudit.create({
      editorUserId: actor.profileId ?? null,
      entityType: 'area_metrics',
      entityRef: targetAreaRef,
      changeType: 'monitoring_result',
      changeSummary: `Recorded monitoring result for ${targetAreaRef}`,
      diffPayload: {
        densityPer100Sqm: input.densityPer100Sqm,
        treeCount: typeof input.treeCount === 'number' ? Math.round(input.treeCount) : null,
        taskId: `task-${numericTaskId}`,
        observationId,
        source: shouldRecordAsPlotSample ? 'plot_estimate_projection' : 'legacy_area_metrics',
      },
    });

    return {
      taskId: `task-${numericTaskId}`,
      areaId: targetAreaRef,
      observationId,
      densityPer100Sqm: input.densityPer100Sqm,
      treeCount: typeof input.treeCount === 'number' ? Math.round(input.treeCount) : null,
      recordedAt: input.observedAt?.trim() || new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown monitoring result error';
    await deps.bakkiTasks.markSyncFailureByOdooTaskId(numericTaskId, message);
    deps.logger.error(`Monitoring result write failed: ${message}`);
    throw new BadRequestException('Monitoring result could not be recorded.');
  }
}

function intersectsGeometry(
  left: import('@bakki/domain').GeoJsonGeometry,
  right: import('@bakki/domain').GeoJsonGeometry,
) {
  const leftBbox = extractBbox(left.coordinates);
  const rightBbox = extractBbox(right.coordinates);
  return !(
    leftBbox.maxLng < rightBbox.minLng
    || leftBbox.minLng > rightBbox.maxLng
    || leftBbox.maxLat < rightBbox.minLat
    || leftBbox.minLat > rightBbox.maxLat
  );
}

function extractBbox(coordinates: unknown) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) {
      return;
    }
    if (
      value.length >= 2
      && typeof value[0] === 'number'
      && typeof value[1] === 'number'
    ) {
      const lng = value[0];
      const lat = value[1];
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      return;
    }
    for (const child of value) {
      walk(child);
    }
  };
  walk(coordinates);
  if (!Number.isFinite(minLat)) {
    return {
      minLng: 0,
      maxLng: 0,
      minLat: 0,
      maxLat: 0,
    };
  }
  return { minLng, maxLng, minLat, maxLat };
}

async function requireOwnerActor(
  deps: Pick<TasksServiceMutationDeps, 'authService' | 'odoo'>,
  sessionToken?: string,
) {
  if (!deps.odoo.isConfigured()) {
    throw new ServiceUnavailableException('Bakki task activity is currently unavailable.');
  }

  return requireOwnerSessionActor({
    authService: deps.authService,
    sessionToken,
    unauthorizedMessage: 'Only Bakki owners can create tasks.',
  });
}
