import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DASHBOARD_SUMMARY_QUERY_KEY,
  MAP_AREA_GEOMETRY_QUERY_KEY,
  MAP_MANAGEMENT_DATA_QUERY_KEY,
  MAP_RANCH_GEOMETRY_QUERY_KEY,
  MAP_VIEWER_DATA_QUERY_KEY,
  MAP_ZONE_GEOMETRY_QUERY_KEY,
  PLANTING_PHASE_OVERVIEW_QUERY_KEY,
  PLANTING_WIZARD_DATA_QUERY_KEY,
  SPECIES_PAGE_QUERY_KEY,
  TASK_MANAGEMENT_QUERY_KEY,
  TASK_TEMPLATES_QUERY_KEY,
  USERS_PAGE_QUERY_KEY,
} from './query-keys';
import {
  BAKKI_CORE_BOOTSTRAP_INVALIDATION_QUERY_KEYS,
  BAKKI_CORE_MIGRATION_INVALIDATION_QUERY_KEYS,
  MEDIA_PROBE_INVALIDATION_QUERY_KEYS,
  ODOO_SYNC_INVALIDATION_QUERY_KEYS,
  ODOO_TASK_SYNC_INVALIDATION_QUERY_KEYS,
} from './settings.invalidate-utils';

test('Odoo sync invalidation keys cover the live operational surfaces', () => {
  assert.deepEqual(ODOO_SYNC_INVALIDATION_QUERY_KEYS, [
    ['health', 'odoo'],
    USERS_PAGE_QUERY_KEY,
    TASK_MANAGEMENT_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
  ]);
});

test('Bakki Core migration invalidation keys refresh all geometry-backed map queries', () => {
  assert.deepEqual(BAKKI_CORE_MIGRATION_INVALIDATION_QUERY_KEYS, [
    ['health', 'odoo'],
    USERS_PAGE_QUERY_KEY,
    TASK_MANAGEMENT_QUERY_KEY,
    TASK_TEMPLATES_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
    MAP_VIEWER_DATA_QUERY_KEY,
    MAP_MANAGEMENT_DATA_QUERY_KEY,
    MAP_RANCH_GEOMETRY_QUERY_KEY,
    MAP_ZONE_GEOMETRY_QUERY_KEY,
    MAP_AREA_GEOMETRY_QUERY_KEY,
  ]);
});

test('Bakki Core bootstrap invalidation keys extend migration refreshes with species and phases', () => {
  assert.deepEqual(BAKKI_CORE_BOOTSTRAP_INVALIDATION_QUERY_KEYS, [
    ...BAKKI_CORE_MIGRATION_INVALIDATION_QUERY_KEYS,
    SPECIES_PAGE_QUERY_KEY,
    PLANTING_PHASE_OVERVIEW_QUERY_KEY,
    PLANTING_WIZARD_DATA_QUERY_KEY,
  ]);
});

test('task-sync provisioning and write probes refresh the same task-facing surfaces', () => {
  assert.deepEqual(ODOO_TASK_SYNC_INVALIDATION_QUERY_KEYS, [
    ['health', 'odoo'],
    TASK_MANAGEMENT_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
  ]);
});

test('media probes only need to refresh Odoo diagnostics', () => {
  assert.deepEqual(MEDIA_PROBE_INVALIDATION_QUERY_KEYS, [['health', 'odoo']]);
});
