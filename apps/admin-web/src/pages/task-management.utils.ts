import type { TaskManagementData, TaskTableRow } from '@bakki/domain';

export type TaskManagementRenderState = 'loading' | 'unavailable' | 'ready';
export type TaskSortOption =
  | 'due_date_asc'
  | 'due_date_desc'
  | 'priority_desc'
  | 'priority_asc'
  | 'title_asc'
  | 'assignee_asc'
  | 'zone_asc';

export interface TaskFilterState {
  activityType: 'all' | TaskTableRow['activityTone'];
  assigneeQuery: string;
  nameQuery: string;
  priority: 'all' | TaskTableRow['priorityValue'];
  sortBy: TaskSortOption;
  zone: 'all' | string;
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  activityType: 'all',
  assigneeQuery: '',
  nameQuery: '',
  priority: 'all',
  sortBy: 'due_date_asc',
  zone: 'all',
};

export function resolveTaskManagementRenderState(
  taskManagement: TaskManagementData | null | undefined,
  isPending: boolean,
): TaskManagementRenderState {
  if (isPending && !taskManagement) {
    return 'loading';
  }

  if (!taskManagement) {
    return 'unavailable';
  }

  return 'ready';
}

export function getNextWorkflowState(current: NonNullable<TaskTableRow['workflowState']>) {
  switch (current) {
    case 'in_progress':
      return 'done' as const;
    case 'done':
    case 'cancelled':
      return 'pending' as const;
    default:
      return 'in_progress' as const;
  }
}

export function getWorkflowActionLabel(current: NonNullable<TaskTableRow['workflowState']>) {
  switch (current) {
    case 'in_progress':
      return 'Mark Done';
    case 'done':
    case 'cancelled':
      return 'Reopen';
    default:
      return 'Start';
  }
}

export function humanizeWorkflowState(value: 'pending' | 'in_progress' | 'done' | 'cancelled') {
  switch (value) {
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

export function humanizeWorkflowAction(value: 'pending' | 'in_progress' | 'done' | 'cancelled') {
  switch (value) {
    case 'in_progress':
      return 'Move To In Progress';
    case 'done':
      return 'Mark As Done';
    case 'cancelled':
      return 'Cancel Task';
    default:
      return 'Reopen Task';
  }
}

export function getTaskRowActionState(row: Pick<TaskTableRow, 'activityTone' | 'workflowState' | 'statusTone'>) {
  const workflowState = row.workflowState ?? 'pending';
  const canRecordMonitoring = row.activityTone === 'monitoring';

  return {
    canRecordMonitoring,
    monitoringActionLabel:
      workflowState === 'done' || row.statusTone === 'complete' ? 'Update' : 'Record',
    workflowActionLabel: getWorkflowActionLabel(workflowState),
  };
}

export function filterAndSortTaskRows(rows: TaskTableRow[], filters: TaskFilterState) {
  return rows
    .filter((row) => matchesTaskFilters(row, filters))
    .sort((left, right) => compareTaskRows(left, right, filters.sortBy));
}

export function getTaskZoneOptions(rows: TaskTableRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.sectorSubtitle.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function matchesTaskFilters(row: TaskTableRow, filters: TaskFilterState) {
  const normalizedNameQuery = filters.nameQuery.trim().toLowerCase();
  const normalizedAssigneeQuery = filters.assigneeQuery.trim().toLowerCase();

  if (normalizedNameQuery && !row.titleLabel.toLowerCase().includes(normalizedNameQuery)) {
    return false;
  }

  if (normalizedAssigneeQuery && !row.assigneeName.toLowerCase().includes(normalizedAssigneeQuery)) {
    return false;
  }

  if (filters.priority !== 'all' && row.priorityValue !== filters.priority) {
    return false;
  }

  if (filters.activityType !== 'all' && row.activityTone !== filters.activityType) {
    return false;
  }

  if (filters.zone !== 'all' && row.sectorSubtitle !== filters.zone) {
    return false;
  }

  return true;
}

function compareTaskRows(left: TaskTableRow, right: TaskTableRow, sortBy: TaskSortOption) {
  switch (sortBy) {
    case 'due_date_desc':
      return compareNullableNumbers(getDueDateTimestamp(right), getDueDateTimestamp(left))
        || compareText(left.titleLabel, right.titleLabel);
    case 'priority_desc':
      return compareNumbersDesc(Number(left.priorityValue), Number(right.priorityValue))
        || compareNullableNumbers(getDueDateTimestamp(left), getDueDateTimestamp(right))
        || compareText(left.titleLabel, right.titleLabel);
    case 'priority_asc':
      return compareNumbersAsc(Number(left.priorityValue), Number(right.priorityValue))
        || compareNullableNumbers(getDueDateTimestamp(left), getDueDateTimestamp(right))
        || compareText(left.titleLabel, right.titleLabel);
    case 'title_asc':
      return compareText(left.titleLabel, right.titleLabel)
        || compareNullableNumbers(getDueDateTimestamp(left), getDueDateTimestamp(right));
    case 'assignee_asc':
      return compareText(left.assigneeName, right.assigneeName)
        || compareNullableNumbers(getDueDateTimestamp(left), getDueDateTimestamp(right))
        || compareText(left.titleLabel, right.titleLabel);
    case 'zone_asc':
      return compareText(left.sectorSubtitle, right.sectorSubtitle)
        || compareText(left.sectorTitle, right.sectorTitle)
        || compareNullableNumbers(getDueDateTimestamp(left), getDueDateTimestamp(right));
    default:
      return compareNullableNumbers(getDueDateTimestamp(left), getDueDateTimestamp(right))
        || compareNumbersDesc(Number(left.priorityValue), Number(right.priorityValue))
        || compareText(left.titleLabel, right.titleLabel);
  }
}

function getDueDateTimestamp(row: TaskTableRow) {
  if (!row.dueDateValue) {
    return null;
  }

  const timestamp = Date.parse(row.dueDateValue);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareNullableNumbers(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

function compareNumbersAsc(left: number, right: number) {
  return left - right;
}

function compareNumbersDesc(left: number, right: number) {
  return right - left;
}

function compareText(left: string, right: string) {
  return left.localeCompare(right);
}
