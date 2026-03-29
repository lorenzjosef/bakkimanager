import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseStageIdForWorkflowState,
  inferTaskTypeFromTitle,
  inferWorkflowStateFromStageLabel,
  type OdooTaskStageCandidate,
} from './odoo-task-mapping';

test('inferWorkflowStateFromStageLabel maps standard Odoo labels', () => {
  assert.equal(inferWorkflowStateFromStageLabel('Inbox'), 'pending');
  assert.equal(inferWorkflowStateFromStageLabel('In Progress'), 'in_progress');
  assert.equal(inferWorkflowStateFromStageLabel('Done'), 'done');
  assert.equal(inferWorkflowStateFromStageLabel('Cancelled'), 'cancelled');
  assert.equal(inferWorkflowStateFromStageLabel('Something Else'), 'pending');
});

test('inferTaskTypeFromTitle maps Bakki task labels', () => {
  assert.equal(inferTaskTypeFromTitle('Plant saplings in Area 3'), 'planting');
  assert.equal(inferTaskTypeFromTitle('Monitor density after storm'), 'monitoring');
  assert.equal(inferTaskTypeFromTitle('Fertilize north slope'), 'fertilizing');
  assert.equal(inferTaskTypeFromTitle('General ranch admin'), null);
});

test('chooseStageIdForWorkflowState prefers explicit project-scoped matches', () => {
  const stages: OdooTaskStageCandidate[] = [
    { id: 1, name: 'Inbox', sequence: 1, fold: false, project_ids: [9] },
    { id: 2, name: 'In Progress', sequence: 50, fold: false, project_ids: [9] },
    { id: 3, name: 'Done', sequence: 100, fold: true, project_ids: [9] },
    { id: 4, name: 'Cancelled', sequence: 110, fold: true, project_ids: [9] },
    { id: 5, name: 'In Progress', sequence: 50, fold: false, project_ids: [12] },
  ];

  assert.equal(chooseStageIdForWorkflowState(stages, 'pending', 9), 1);
  assert.equal(chooseStageIdForWorkflowState(stages, 'in_progress', 9), 2);
  assert.equal(chooseStageIdForWorkflowState(stages, 'done', 9), 3);
  assert.equal(chooseStageIdForWorkflowState(stages, 'cancelled', 9), 4);
});

test('chooseStageIdForWorkflowState falls back sensibly when explicit labels are absent', () => {
  const stages: OdooTaskStageCandidate[] = [
    { id: 11, name: 'Today', sequence: 1, fold: false, project_ids: [] },
    { id: 12, name: 'This Week', sequence: 2, fold: false, project_ids: [] },
    { id: 13, name: 'Archive', sequence: 99, fold: true, project_ids: [] },
  ];

  assert.equal(chooseStageIdForWorkflowState(stages, 'pending', 1), 11);
  assert.equal(chooseStageIdForWorkflowState(stages, 'in_progress', 1), 12);
  assert.equal(chooseStageIdForWorkflowState(stages, 'done', 1), 13);
});
