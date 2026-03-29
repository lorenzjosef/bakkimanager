import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  resolveTaskAssigneeOdooUserId,
  resolveTaskAreaRef,
  validateCreateTaskInput,
} from './tasks.service.support';

test('validateCreateTaskInput requires a concrete area id', () => {
  assert.throws(
    () => validateCreateTaskInput({
      taskType: 'monitoring',
      areaLabel: 'Zone 3',
      description: 'Inspect density',
    }),
    (error: unknown) =>
      error instanceof BadRequestException
      && error.message === 'Area assignment is required.',
  );
});

test('validateCreateTaskInput accepts live Bakki area refs and defers existence checks to geometry', () => {
  assert.doesNotThrow(() => validateCreateTaskInput({
    taskType: 'monitoring',
    areaId: 'zone-3-area-1',
    areaLabel: 'Zone 3 Area 1',
    description: 'Inspect density',
  }));
});

test('resolveTaskAreaRef requires Bakki geometry availability for area validation', async () => {
  await assert.rejects(
    () =>
      resolveTaskAreaRef({
        bakkiGeometry: {
          isConfigured: () => false,
        } as never,
        input: {
          taskType: 'monitoring',
          areaId: 'area-zone-3',
          areaLabel: 'Zone 3 Area 1',
          description: 'Inspect density',
        },
      }),
    (error: unknown) =>
      error instanceof ServiceUnavailableException
      && error.message === 'Bakki area catalog is currently unavailable.',
  );
});

test('resolveTaskAssigneeOdooUserId resolves Bakki user profile ids to Odoo user ids', async () => {
  const result = await resolveTaskAssigneeOdooUserId({
    bakkiUsers: {
      getById: async () => ({
        active: true,
        odooUserId: 42,
      }),
      isConfigured: () => true,
    } as never,
    input: {
      taskType: 'monitoring',
      areaId: 'zone-3-area-1',
      areaLabel: 'Zone 3 Area 1',
      assigneeProfileId: 'user-profile-7',
      description: 'Inspect density',
    },
  });

  assert.equal(result, 42);
});
