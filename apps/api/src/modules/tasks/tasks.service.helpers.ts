import {
  type BakkiTaskPriority,
  type BakkiWorkflowState,
  type CreateTaskRequest,
  type TaskDistributionItem,
  type TaskManagementData,
  type TaskTableRow,
} from '@bakki/domain';
import {
  inferTaskTypeFromTitle,
  inferWorkflowStateFromStageLabel,
} from '../../odoo/odoo-task-mapping';
import type { BakkiAreaCatalogRecord } from '../../bakki-core/bakki-geometry.reads';

export interface OdooTaskSummaryRecord {
  description?: string | false;
  date_deadline?: string | false;
  id: number;
  name?: string;
  priority?: string | false;
  stage_id?: [number, string] | false;
  project_id?: [number, string] | false;
}

export interface MirroredTaskSummary {
  assigneeName: string | null;
  areaRef: string | null;
  dueAt: string | null;
  odooStageName: string | null;
  priority: BakkiTaskPriority | null;
  taskType: string | null;
  title: string;
  workflowState: BakkiWorkflowState;
}

export function getStageLabel(stage: OdooTaskSummaryRecord['stage_id']) {
  return Array.isArray(stage) ? stage[1] : null;
}

export function buildTaskName(taskLabel: string, areaLabel: string) {
  return `${taskLabel} - ${areaLabel}`;
}

export function buildTaskDescription(input: CreateTaskRequest) {
  const parts = [input.description.trim()];
  if (input.assigneeLabel?.trim()) {
    parts.push(`Requested assignee: ${input.assigneeLabel.trim()}`);
  }
  parts.push(`Area assignment: ${input.areaLabel.trim()}`);
  return parts.join('\n\n');
}

export function labelTaskType(taskType: CreateTaskRequest['taskType']) {
  switch (taskType) {
    case 'monitoring':
      return 'Monitoring';
    case 'fertilizing':
      return 'Fertilizing';
    default:
      return 'Planting';
  }
}

export function parseNumericTaskId(value: string) {
  const match = value.match(/(\d+)$/)?.[1];
  return match ? Number(match) : null;
}

export function buildDistributionItems(rows: TaskTableRow[]): TaskDistributionItem[] {
  const totalRows = rows.length;
  const counts = {
    fertilizing: rows.filter((row) => row.activityTone === 'fertilizing').length,
    monitoring: rows.filter((row) => row.activityTone === 'monitoring').length,
    planting: rows.filter((row) => row.activityTone === 'planting').length,
  } as const;

  const items: Array<Pick<TaskDistributionItem, 'id' | 'label' | 'tone'>> = [
    { id: 'planting', label: 'Planting', tone: 'planting' },
    { id: 'monitoring', label: 'Monitoring', tone: 'monitoring' },
    { id: 'fertilizing', label: 'Fertilizing', tone: 'fertilizing' },
  ];

  return items.map((item) => {
    const itemCount = counts[item.id];
    const capacityPercent = totalRows > 0 ? Math.round((itemCount / totalRows) * 100) : 0;

    return {
      id: item.id,
      label: item.label,
      tone: item.tone,
      capacityLabel: `${capacityPercent}% Capacity`,
    };
  });
}

export function buildEmptyTaskSummary(): TaskManagementData {
  return {
    activeTasks: '0',
    dueToday: '0',
    distributionItems: buildDistributionItems([]),
    rows: [],
  };
}

export function mapMirrorToTaskRow(task: {
  assigneeName: string | null;
  areaRef: string | null;
  dueAt: string | null;
  odooStageName: string | null;
  odooTaskId: number;
  priority: BakkiTaskPriority | null;
  taskType: string | null;
  title: string;
  workflowState: BakkiWorkflowState;
}, areaCatalogByRef: Map<string, BakkiAreaCatalogRecord>): TaskTableRow {
  const canonicalTaskType = normalizeTaskType(task.taskType) ?? 'planting';
  const priorityValue = normalizeTaskPriority(task.priority);
  const areaPresentation = resolveTaskAreaPresentation(task.areaRef, areaCatalogByRef);
  return {
    id: `task-${task.odooTaskId}`,
    daysRemainingLabel: formatTaskDaysRemainingLabel(task.dueAt),
    dueDateValue: task.dueAt,
    priorityLabel: labelTaskPriority(priorityValue),
    priorityValue,
    titleLabel: task.title,
    sectorTitle: areaPresentation.title,
    sectorSubtitle: areaPresentation.subtitle,
    linkedAreaId: task.areaRef ?? undefined,
    workflowState: task.workflowState,
    stageLabel: task.odooStageName || workflowStateLabel(task.workflowState),
    activityType: labelTaskType(canonicalTaskType),
    activityTone: canonicalTaskType,
    assigneeName: task.assigneeName?.trim() || 'Unassigned',
    statusLabel: task.odooStageName || workflowStateLabel(task.workflowState),
    statusTone: workflowStateTone(task.workflowState),
    lastSyncLabel: formatTaskRecencyLabel(task.dueAt),
  };
}

export function mapOdooTaskToTaskRow(
  task: OdooTaskSummaryRecord,
  mirror: MirroredTaskSummary | null,
  areaCatalogByRef: Map<string, BakkiAreaCatalogRecord>,
): TaskTableRow {
  const canonicalTaskType = normalizeTaskType(mirror?.taskType) ?? inferTaskTypeFromTitle(task.name) ?? 'planting';
  const workflowState =
    mirror?.workflowState
    ?? inferWorkflowStateFromStageLabel(getStageLabel(task.stage_id))
    ?? 'pending';
  const title = mirror?.title || task.name || `Task ${task.id}`;
  const dueAt = mirror?.dueAt ?? (typeof task.date_deadline === 'string' ? task.date_deadline : null);
  const areaRef = mirror?.areaRef ?? null;
  const priorityValue = normalizeTaskPriority(mirror?.priority ?? task.priority);
  const areaPresentation = resolveTaskAreaPresentation(areaRef, areaCatalogByRef);

  return {
    id: `task-${task.id}`,
    daysRemainingLabel: formatTaskDaysRemainingLabel(dueAt),
    dueDateValue: dueAt,
    priorityLabel: labelTaskPriority(priorityValue),
    priorityValue,
    titleLabel: title,
    sectorTitle: areaPresentation.title,
    sectorSubtitle: areaPresentation.subtitle,
    linkedAreaId: areaRef ?? undefined,
    workflowState,
    stageLabel: mirror?.odooStageName || getStageLabel(task.stage_id) || workflowStateLabel(workflowState),
    activityType: labelTaskType(canonicalTaskType),
    activityTone: canonicalTaskType,
    assigneeName: mirror?.assigneeName?.trim() || parseRequestedAssignee(task.description) || 'Unassigned',
    statusLabel: mirror?.odooStageName || getStageLabel(task.stage_id) || workflowStateLabel(workflowState),
    statusTone: workflowStateTone(workflowState),
    lastSyncLabel: formatTaskRecencyLabel(dueAt),
  };
}

export function resolveTaskAreaPresentation(
  areaRef: string | null,
  areaCatalogByRef: Map<string, BakkiAreaCatalogRecord>,
) {
  if (!areaRef) {
    return {
      title: 'No linked area',
      subtitle: '',
    };
  }

  const area = areaCatalogByRef.get(areaRef);
  if (area) {
    return {
      title: area.areaName,
      subtitle: formatZoneLabel(area.zoneRef),
    };
  }

  return {
    title: areaRef,
    subtitle: 'Linked area',
  };
}

export function formatTaskRecencyLabel(dueAt: string | null) {
  return dueAt ? dueAt.slice(0, 10) : 'No due date';
}

export function formatTaskDaysRemainingLabel(dueAt: string | null) {
  if (!dueAt) {
    return 'No due date';
  }

  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return 'No due date';
  }

  const today = new Date();
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const utcDue = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const diffDays = Math.round((utcDue - utcToday) / 86_400_000);

  if (diffDays === 0) {
    return 'Due today';
  }

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
  }

  return diffDays === 1 ? '1 day left' : `${diffDays} days left`;
}

export function parseRequestedAssignee(description: string | false | null | undefined) {
  if (!description || typeof description !== 'string') {
    return null;
  }

  const line = description
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.toLowerCase().startsWith('requested assignee:'));
  if (!line) {
    return null;
  }

  const assigneeName = line.slice('requested assignee:'.length).trim();
  return assigneeName || null;
}

export function formatZoneLabel(zoneRef: string) {
  const normalized = zoneRef.trim();
  if (!normalized) {
    return '';
  }

  const match = normalized.match(/^zone[-_\s]*(.+)$/i);
  if (!match) {
    return normalized;
  }

  const suffix = match[1]
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
  return suffix ? `Zone ${suffix}` : 'Zone';
}

export function normalizeTaskType(value: string | false | null | undefined) {
  if (value === 'planting' || value === 'monitoring' || value === 'fertilizing') {
    return value;
  }

  return null;
}

export function normalizeTaskPriority(value: string | false | null | undefined): BakkiTaskPriority {
  if (value === '1' || value === '2' || value === '3') {
    return value;
  }

  return '0';
}

export function labelTaskPriority(priority: BakkiTaskPriority) {
  switch (priority) {
    case '1':
      return '1 Star';
    case '2':
      return '2 Stars';
    case '3':
      return '3 Stars';
    default:
      return 'No Priority';
  }
}

export function dedupeOdooTaskSummaries(tasks: OdooTaskSummaryRecord[]) {
  const byId = new Map<number, OdooTaskSummaryRecord>();
  for (const task of tasks) {
    byId.set(task.id, task);
  }
  return Array.from(byId.values());
}

export function workflowStateLabel(state: BakkiWorkflowState) {
  switch (state) {
    case 'in_progress':
      return 'In Progress';
    case 'done':
      return 'Done';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Pending';
  }
}

export function workflowStateTone(state: BakkiWorkflowState): TaskTableRow['statusTone'] {
  switch (state) {
    case 'in_progress':
      return 'syncing';
    case 'done':
    case 'cancelled':
      return 'complete';
    default:
      return 'pending';
  }
}
