import assert from 'node:assert/strict';
import test from 'node:test';
import { taskTemplateSummariesFixture, type UserRecord } from '@bakki/domain';
import {
  buildCreateTaskPayload,
  canSubmitCreateTask,
  filterPlanterOptions,
  mapTemplateToOption,
  normalizeTaskPriorityValue,
} from './global-map-task-modal.utils';

test('mapTemplateToOption maps Bakki task templates to stable UI options', () => {
  const monitoringOption = mapTemplateToOption(taskTemplateSummariesFixture[1]);

  assert.equal(monitoringOption.id, 'monitoring');
  assert.equal(monitoringOption.label, 'Monitoring');
  assert.equal(monitoringOption.templateRef, 'template-monitoring-default');
  assert.equal(monitoringOption.defaultPriority, '2');
  assert.equal(typeof monitoringOption.icon, 'string');
  assert.ok(monitoringOption.icon.length > 0);
});

test('canSubmitCreateTask enforces area and description minimums', () => {
  assert.equal(canSubmitCreateTask(null, 'Monitor density', false), false);
  assert.equal(canSubmitCreateTask('area-zone-3', 'abc', false), false);
  assert.equal(canSubmitCreateTask('area-zone-3', 'Monitor density', true), false);
  assert.equal(canSubmitCreateTask('area-zone-3', 'Monitor density', false), true);
});

test('buildCreateTaskPayload trims optional fields and omits empty values', () => {
  assert.deepEqual(
    buildCreateTaskPayload({
      priority: '2',
      templateRef: 'template-monitoring-default',
      taskType: 'monitoring',
      areaId: 'area-zone-3',
      areaLabel: '  Zone 3 ',
      assigneeProfileId: 'user-profile-8',
      assigneeLabel: '  Bjorn ',
      dueDate: '2026-03-29',
      description: '  Inspect density after planting. ',
    }),
    {
      priority: '2',
      templateRef: 'template-monitoring-default',
      taskType: 'monitoring',
      areaId: 'area-zone-3',
      areaLabel: 'Zone 3',
      assigneeProfileId: 'user-profile-8',
      assigneeLabel: 'Bjorn',
      dueDate: '2026-03-29',
      description: 'Inspect density after planting.',
    },
  );

  assert.deepEqual(
    buildCreateTaskPayload({
      priority: '0',
      templateRef: null,
      taskType: 'planting',
      areaId: null,
      areaLabel: '  Sector 01-A ',
      assigneeProfileId: null,
      assigneeLabel: '   ',
      dueDate: '',
      description: '  Plant contract trees. ',
    }),
    {
      priority: '0',
      templateRef: undefined,
      taskType: 'planting',
      areaId: undefined,
      areaLabel: 'Sector 01-A',
      assigneeProfileId: undefined,
      assigneeLabel: undefined,
      dueDate: undefined,
      description: 'Plant contract trees.',
    },
  );
});

test('normalizeTaskPriorityValue clamps unknown values to no priority', () => {
  assert.equal(normalizeTaskPriorityValue(3), '3');
  assert.equal(normalizeTaskPriorityValue('2'), '2');
  assert.equal(normalizeTaskPriorityValue(99), '0');
});

test('filterPlanterOptions matches planter records by name, username, and role', () => {
  const planters: UserRecord[] = [
    {
      avatarUrl: '',
      fullName: 'Alain de Cat',
      id: 'user-1',
      isActive: true,
      isOwner: false,
      mobileAccessEnabled: true,
      roleLabel: 'Planter',
      username: 'alain.de.cat@bakki.example',
    },
    {
      avatarUrl: '',
      fullName: 'Bjorn Moss',
      id: 'user-2',
      isActive: true,
      isOwner: false,
      mobileAccessEnabled: true,
      roleLabel: 'Supervisor',
      username: 'bjorn.moss@bakki.example',
    },
  ];

  assert.deepEqual(filterPlanterOptions(planters, 'alain'), [planters[0]]);
  assert.deepEqual(filterPlanterOptions(planters, 'bjorn.moss'), [planters[1]]);
  assert.deepEqual(filterPlanterOptions(planters, 'planter'), [planters[0]]);
  assert.deepEqual(filterPlanterOptions(planters, ''), planters);
});
