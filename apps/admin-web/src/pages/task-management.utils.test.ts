import type { TaskManagementData, TaskTableRow } from '@bakki/domain';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_TASK_FILTERS,
  filterAndSortTaskRows,
  getNextWorkflowState,
  getTaskRowActionState,
  getTaskZoneOptions,
  getWorkflowActionLabel,
  humanizeWorkflowAction,
  humanizeWorkflowState,
  resolveTaskManagementRenderState,
} from './task-management.utils';

const taskManagementData: TaskManagementData = {
  activeTasks: '0',
  dueToday: '0',
  distributionItems: [],
  rows: [],
};

test('resolveTaskManagementRenderState distinguishes loading, unavailable, and ready states', () => {
  assert.equal(resolveTaskManagementRenderState(undefined, true), 'loading');
  assert.equal(resolveTaskManagementRenderState(undefined, false), 'unavailable');
  assert.equal(resolveTaskManagementRenderState(taskManagementData, false), 'ready');
});

test('getNextWorkflowState advances and reopens tasks consistently', () => {
  assert.equal(getNextWorkflowState('pending'), 'in_progress');
  assert.equal(getNextWorkflowState('in_progress'), 'done');
  assert.equal(getNextWorkflowState('done'), 'pending');
  assert.equal(getNextWorkflowState('cancelled'), 'pending');
});

test('getWorkflowActionLabel reflects the current workflow state', () => {
  assert.equal(getWorkflowActionLabel('pending'), 'Start');
  assert.equal(getWorkflowActionLabel('in_progress'), 'Mark Done');
  assert.equal(getWorkflowActionLabel('done'), 'Reopen');
  assert.equal(getWorkflowActionLabel('cancelled'), 'Reopen');
});

test('humanizeWorkflowState and humanizeWorkflowAction keep UI labels stable', () => {
  assert.equal(humanizeWorkflowState('pending'), 'Pending');
  assert.equal(humanizeWorkflowState('in_progress'), 'In Progress');
  assert.equal(humanizeWorkflowAction('pending'), 'Reopen Task');
  assert.equal(humanizeWorkflowAction('in_progress'), 'Move To In Progress');
  assert.equal(humanizeWorkflowAction('done'), 'Mark As Done');
  assert.equal(humanizeWorkflowAction('cancelled'), 'Cancel Task');
});

test('getTaskRowActionState enables monitoring actions only for monitoring rows', () => {
  assert.deepEqual(
    getTaskRowActionState({
      activityTone: 'monitoring',
      workflowState: 'pending',
      statusTone: 'pending',
    }),
    {
      canRecordMonitoring: true,
      monitoringActionLabel: 'Record',
      workflowActionLabel: 'Start',
    },
  );

  assert.deepEqual(
    getTaskRowActionState({
      activityTone: 'monitoring',
      workflowState: 'done',
      statusTone: 'complete',
    }),
    {
      canRecordMonitoring: true,
      monitoringActionLabel: 'Update',
      workflowActionLabel: 'Reopen',
    },
  );

  assert.deepEqual(
    getTaskRowActionState({
      activityTone: 'planting',
      workflowState: 'in_progress',
      statusTone: 'syncing',
    }),
    {
      canRecordMonitoring: false,
      monitoringActionLabel: 'Record',
      workflowActionLabel: 'Mark Done',
    },
  );
});

const taskRowsFixture: TaskTableRow[] = [
  {
    activityTone: 'planting',
    activityType: 'Planting',
    assigneeName: 'Alain de Cat',
    daysRemainingLabel: '2 days left',
    dueDateValue: '2026-03-31T00:00:00.000Z',
    id: 'task-1',
    lastSyncLabel: '2026-03-29',
    priorityLabel: '3 Stars',
    priorityValue: '3',
    sectorSubtitle: 'Zone 3',
    sectorTitle: 'North Bench',
    statusLabel: 'Pending',
    statusTone: 'pending',
    titleLabel: 'Planting - North Bench',
  },
  {
    activityTone: 'monitoring',
    activityType: 'Monitoring',
    assigneeName: 'Bjorn',
    daysRemainingLabel: 'Due today',
    dueDateValue: '2026-03-29T00:00:00.000Z',
    id: 'task-2',
    lastSyncLabel: '2026-03-29',
    priorityLabel: '1 Star',
    priorityValue: '1',
    sectorSubtitle: 'Zone 2',
    sectorTitle: 'South Rise',
    statusLabel: 'Done',
    statusTone: 'complete',
    titleLabel: 'Monitoring - South Rise',
  },
  {
    activityTone: 'fertilizing',
    activityType: 'Fertilizing',
    assigneeName: 'Matteo Bauer',
    daysRemainingLabel: 'No due date',
    dueDateValue: null,
    id: 'task-3',
    lastSyncLabel: 'No due date',
    priorityLabel: '2 Stars',
    priorityValue: '2',
    sectorSubtitle: 'Zone 3',
    sectorTitle: 'East Ridge',
    statusLabel: 'In Progress',
    statusTone: 'syncing',
    titleLabel: 'Fertilizing - East Ridge',
  },
];

test('filterAndSortTaskRows applies multiple criteria and keeps due-date ascending as default', () => {
  assert.deepEqual(
    filterAndSortTaskRows(taskRowsFixture, DEFAULT_TASK_FILTERS).map((row) => row.id),
    ['task-2', 'task-1', 'task-3'],
  );

  assert.deepEqual(
    filterAndSortTaskRows(taskRowsFixture, {
      ...DEFAULT_TASK_FILTERS,
      assigneeQuery: 'cat',
      activityType: 'planting',
      priority: '3',
      zone: 'Zone 3',
    }).map((row) => row.id),
    ['task-1'],
  );

  assert.deepEqual(
    filterAndSortTaskRows(taskRowsFixture, {
      ...DEFAULT_TASK_FILTERS,
      nameQuery: 'ridge',
    }).map((row) => row.id),
    ['task-3'],
  );
});

test('filterAndSortTaskRows supports alternate sort orders', () => {
  assert.deepEqual(
    filterAndSortTaskRows(taskRowsFixture, {
      ...DEFAULT_TASK_FILTERS,
      sortBy: 'priority_desc',
    }).map((row) => row.id),
    ['task-1', 'task-3', 'task-2'],
  );

  assert.deepEqual(
    filterAndSortTaskRows(taskRowsFixture, {
      ...DEFAULT_TASK_FILTERS,
      sortBy: 'zone_asc',
    }).map((row) => row.id),
    ['task-2', 'task-3', 'task-1'],
  );
});

test('getTaskZoneOptions returns unique sorted zones from task rows', () => {
  assert.deepEqual(getTaskZoneOptions(taskRowsFixture), ['Zone 2', 'Zone 3']);
});
