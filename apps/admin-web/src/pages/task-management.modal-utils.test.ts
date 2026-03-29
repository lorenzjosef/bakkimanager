import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMonitoringResultPayload,
  buildMonitoringSuccessMessage,
  canSubmitMonitoringResult,
} from './task-management.modal-utils';

test('canSubmitMonitoringResult only allows positive densities when not pending', () => {
  assert.equal(canSubmitMonitoringResult('', false), false);
  assert.equal(canSubmitMonitoringResult('0', false), false);
  assert.equal(canSubmitMonitoringResult('12.4', true), false);
  assert.equal(canSubmitMonitoringResult('12.4', false), true);
});

test('buildMonitoringResultPayload trims optional fields and omits empty values', () => {
  assert.deepEqual(
    buildMonitoringResultPayload('18.5', '', '', '  '),
    {
      densityPer100Sqm: 18.5,
    },
  );

  assert.deepEqual(
    buildMonitoringResultPayload('18.5', '1200', '2026-03-28', '  Density increased after monitoring. '),
    {
      densityPer100Sqm: 18.5,
      treeCount: 1200,
      observedAt: '2026-03-28',
      notes: 'Density increased after monitoring.',
    },
  );
});

test('buildMonitoringSuccessMessage rounds density for user feedback', () => {
  assert.equal(
    buildMonitoringSuccessMessage('Sector 01-A Basin', 18.6),
    'Density updated to 19 / 100m² for Sector 01-A Basin.',
  );
});
