import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type {
  BakkiWorkflowState,
  CreateTaskRequest,
  TaskTemplateSummary,
} from '@bakki/domain';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import type { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import { BakkiTaskTemplateService } from '../../bakki-core/bakki-task-template.service';
import {
  chooseStageIdForWorkflowState,
  inferWorkflowStateFromStageLabel,
  type OdooTaskStageCandidate,
} from '../../odoo/odoo-task-mapping';
import { OdooService } from '../../odoo/odoo.service';
import { parseTrailingNumericId } from '../users/user-identity.helpers';
import type { OdooTaskSummaryRecord } from './tasks.service.helpers';

export function validateCreateTaskInput(input: CreateTaskRequest) {
  if (!input.areaId?.trim()) {
    throw new BadRequestException('Area assignment is required.');
  }

  if (!input.areaLabel.trim()) {
    throw new BadRequestException('Area assignment is required.');
  }

  if (!input.description.trim()) {
    throw new BadRequestException('Task description is required.');
  }
}

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function resolveTaskAreaRef({
  bakkiGeometry,
  input,
}: {
  bakkiGeometry: BakkiGeometryService;
  input: CreateTaskRequest;
}) {
  const areaRef = input.areaId?.trim() || null;
  if (!areaRef) {
    throw new BadRequestException('Area assignment is required.');
  }

  if (!bakkiGeometry.isConfigured()) {
    throw new ServiceUnavailableException('Bakki area catalog is currently unavailable.');
  }

  const areaCatalog = await bakkiGeometry.getAreasByRefs([areaRef]);
  const area = areaCatalog.get(areaRef);
  if (!area) {
    throw new BadRequestException('Selected area does not exist.');
  }

  return {
    areaRef: area.areaRef,
    areaName: area.areaName,
    zoneRef: area.zoneRef,
  };
}

export async function resolveTaskAssigneeOdooUserId({
  bakkiUsers,
  input,
}: {
  bakkiUsers: Pick<BakkiUserMirrorService, 'getById' | 'isConfigured'>;
  input: CreateTaskRequest;
}) {
  const assigneeProfileId = input.assigneeProfileId?.trim() || null;
  if (!assigneeProfileId) {
    return null;
  }

  const mirrorId = parseTrailingNumericId(assigneeProfileId);
  if (!mirrorId) {
    throw new BadRequestException('Assigned planter reference is invalid.');
  }

  if (!bakkiUsers.isConfigured()) {
    throw new ServiceUnavailableException('Bakki user directory is currently unavailable.');
  }

  const assignee = await bakkiUsers.getById(mirrorId);
  if (!assignee || !assignee.active) {
    throw new BadRequestException('Selected planter does not exist.');
  }

  return assignee.odooUserId;
}

export async function resolveDoneStageId({
  odoo,
  project,
}: {
  odoo: OdooService;
  project: OdooTaskSummaryRecord['project_id'];
}) {
  return resolveStageIdForWorkflowState({ workflowState: 'done', project, odoo });
}

export async function resolveStageIdForWorkflowState({
  workflowState,
  project,
  odoo,
}: {
  workflowState: BakkiWorkflowState;
  project: OdooTaskSummaryRecord['project_id'];
  odoo: OdooService;
}) {
  const projectId = Array.isArray(project) ? project[0] : null;
  const stages = await odoo.searchRead<OdooTaskStageCandidate>(
    'project.task.type',
    [],
    ['name', 'sequence', 'fold', 'project_ids'],
    { order: 'sequence asc, id asc' },
  );

  return chooseStageIdForWorkflowState(stages, workflowState, projectId);
}

export async function resolveTaskTemplate({
  bakkiTaskTemplates,
  input,
}: {
  bakkiTaskTemplates: BakkiTaskTemplateService;
  input: CreateTaskRequest;
}): Promise<TaskTemplateSummary> {
  if (input.templateRef?.trim()) {
    const byRef = await bakkiTaskTemplates.getByRef(input.templateRef.trim());
    if (!byRef) {
      throw new BadRequestException('Selected task template does not exist.');
    }
    return byRef;
  }

  const byType = await bakkiTaskTemplates.getDefaultByTaskType(input.taskType);
  if (!byType) {
    throw new BadRequestException(`No active task template exists for ${input.taskType}.`);
  }

  return byType;
}

export async function resolveStageIdsForWorkflowStates({
  states,
  odoo,
}: {
  states: BakkiWorkflowState[];
  odoo: OdooService;
}) {
  const stages = await odoo.searchRead<OdooTaskStageCandidate>(
    'project.task.type',
    [],
    ['name', 'sequence', 'fold', 'project_ids'],
    { order: 'sequence asc, id asc' },
  );

  return stages
    .filter((stage) =>
      states.includes(inferWorkflowStateFromStageLabel(typeof stage.name === 'string' ? stage.name : null)),
    )
    .map((stage) => stage.id);
}

export async function countOdooTasksByWorkflowStates({
  states,
  odoo,
}: {
  states: BakkiWorkflowState[];
  odoo: OdooService;
}) {
  const stageIds = await resolveStageIdsForWorkflowStates({ states, odoo });
  if (stageIds.length === 0) {
    return 0;
  }

  return odoo.searchCount('project.task', [['stage_id', 'in', stageIds]]);
}
