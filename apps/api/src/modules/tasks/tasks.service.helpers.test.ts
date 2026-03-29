import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatZoneLabel,
  mapMirrorToTaskRow,
  parseRequestedAssignee,
} from './tasks.service.helpers';

test('mapMirrorToTaskRow keeps title separate from sector and area labels', () => {
  const row = mapMirrorToTaskRow({
    assigneeName: 'Alain de Cat',
    areaRef: 'area-1',
    dueAt: '2026-03-29T00:00:00.000Z',
    odooStageName: 'Pending',
    odooTaskId: 42,
    priority: '3',
    taskType: 'planting',
    title: 'Planting - North Bench',
    workflowState: 'pending',
  }, new Map([
    ['area-1', { areaName: 'North Bench', areaRef: 'area-1', assignedSpeciesRef: null, zoneRef: 'zone-3' }],
  ]));

  assert.equal(row.titleLabel, 'Planting - North Bench');
  assert.equal(row.sectorTitle, 'North Bench');
  assert.equal(row.sectorSubtitle, 'Zone 3');
  assert.equal(row.assigneeName, 'Alain de Cat');
  assert.equal(row.dueDateValue, '2026-03-29T00:00:00.000Z');
  assert.equal(row.priorityLabel, '3 Stars');
});

test('parseRequestedAssignee extracts the requested assignee from Odoo descriptions', () => {
  assert.equal(
    parseRequestedAssignee('Inspect density\n\nRequested assignee: Alain de Cat\n\nArea assignment: North Bench'),
    'Alain de Cat',
  );
  assert.equal(parseRequestedAssignee('Inspect density only'), null);
});

test('formatZoneLabel humanizes canonical zone refs', () => {
  assert.equal(formatZoneLabel('zone-3'), 'Zone 3');
  assert.equal(formatZoneLabel('zone-north-west'), 'Zone North West');
});
