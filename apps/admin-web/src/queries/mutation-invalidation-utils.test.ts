import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOGIN_INVALIDATION_QUERY_KEYS,
  CREATE_PLANTING_PHASE_INVALIDATION_QUERY_KEYS,
  CREATE_SPECIES_INVALIDATION_QUERY_KEYS,
  CREATE_TASK_INVALIDATION_QUERY_KEYS,
  CREATE_USER_INVALIDATION_QUERY_KEYS,
  RECORD_MONITORING_RESULT_INVALIDATION_QUERY_KEYS,
  UPDATE_AREA_GEOMETRY_INVALIDATION_QUERY_KEYS,
  UPDATE_AREA_DETAILS_INVALIDATION_QUERY_KEYS,
  UPDATE_AREA_METRICS_INVALIDATION_QUERY_KEYS,
  UPDATE_ZONE_GEOMETRY_INVALIDATION_QUERY_KEYS,
  UPDATE_TASK_WORKFLOW_INVALIDATION_QUERY_KEYS,
  UPDATE_USER_STATUS_INVALIDATION_QUERY_KEYS,
  buildUploadObservationPhotoInvalidationQueryKeys,
  buildUpdateSpeciesInvalidationQueryKeys,
  ADJUST_SPECIES_INVENTORY_INVALIDATION_QUERY_KEYS,
} from './mutation-invalidation-utils';
import {
  AUTH_SESSION_QUERY_KEY,
  CONTRACTS_SUMMARY_QUERY_KEY,
  DASHBOARD_SUMMARY_QUERY_KEY,
  HEALTH_ODOO_QUERY_KEY,
  MAP_MANAGEMENT_DATA_QUERY_KEY,
  MAP_AREA_GEOMETRY_QUERY_KEY,
  MAP_VIEWER_DATA_QUERY_KEY,
  MAP_ZONE_GEOMETRY_QUERY_KEY,
  PLANTING_PHASE_OVERVIEW_QUERY_KEY,
  PLANTING_WIZARD_DATA_QUERY_KEY,
  SPECIES_PAGE_QUERY_KEY,
  TASK_MANAGEMENT_QUERY_KEY,
  USERS_PAGE_QUERY_KEY,
  buildObservationPhotosQueryKey,
  buildSpeciesDetailQueryKey,
} from './query-keys';

test('create-task invalidation refreshes the task list and dashboard program summary', () => {
  assert.deepEqual(CREATE_TASK_INVALIDATION_QUERY_KEYS, [
    TASK_MANAGEMENT_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
    HEALTH_ODOO_QUERY_KEY,
  ]);
});

test('login invalidation refreshes the auth session query', () => {
  assert.deepEqual(LOGIN_INVALIDATION_QUERY_KEYS, [
    AUTH_SESSION_QUERY_KEY,
  ]);
});

test('record-monitoring invalidation refreshes task, dashboard, and map surfaces', () => {
  assert.deepEqual(RECORD_MONITORING_RESULT_INVALIDATION_QUERY_KEYS, [
    TASK_MANAGEMENT_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
    CONTRACTS_SUMMARY_QUERY_KEY,
    MAP_VIEWER_DATA_QUERY_KEY,
    MAP_MANAGEMENT_DATA_QUERY_KEY,
    HEALTH_ODOO_QUERY_KEY,
  ]);
});

test('workflow updates refresh task and dashboard surfaces', () => {
  assert.deepEqual(UPDATE_TASK_WORKFLOW_INVALIDATION_QUERY_KEYS, [
    TASK_MANAGEMENT_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
    HEALTH_ODOO_QUERY_KEY,
  ]);
});

test('area metric updates refresh both map pages and the dashboard', () => {
  assert.deepEqual(UPDATE_AREA_METRICS_INVALIDATION_QUERY_KEYS, [
    MAP_MANAGEMENT_DATA_QUERY_KEY,
    MAP_VIEWER_DATA_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
    CONTRACTS_SUMMARY_QUERY_KEY,
  ]);
});

test('area detail updates refresh map surfaces and the planting wizard feed', () => {
  assert.deepEqual(UPDATE_AREA_DETAILS_INVALIDATION_QUERY_KEYS, [
    MAP_AREA_GEOMETRY_QUERY_KEY,
    MAP_MANAGEMENT_DATA_QUERY_KEY,
    MAP_VIEWER_DATA_QUERY_KEY,
    CONTRACTS_SUMMARY_QUERY_KEY,
    PLANTING_WIZARD_DATA_QUERY_KEY,
  ]);
});

test('area geometry updates refresh area geometry and both map detail surfaces', () => {
  assert.deepEqual(UPDATE_AREA_GEOMETRY_INVALIDATION_QUERY_KEYS, [
    MAP_AREA_GEOMETRY_QUERY_KEY,
    MAP_MANAGEMENT_DATA_QUERY_KEY,
    MAP_VIEWER_DATA_QUERY_KEY,
  ]);
});

test('zone geometry updates refresh zone geometry and both map detail surfaces', () => {
  assert.deepEqual(UPDATE_ZONE_GEOMETRY_INVALIDATION_QUERY_KEYS, [
    MAP_ZONE_GEOMETRY_QUERY_KEY,
    MAP_MANAGEMENT_DATA_QUERY_KEY,
    MAP_VIEWER_DATA_QUERY_KEY,
  ]);
});

test('species create and stock-adjust mutations refresh the species list', () => {
  assert.deepEqual(ADJUST_SPECIES_INVENTORY_INVALIDATION_QUERY_KEYS, [SPECIES_PAGE_QUERY_KEY]);
  assert.deepEqual(CREATE_SPECIES_INVALIDATION_QUERY_KEYS, [
    SPECIES_PAGE_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
  ]);
});

test('species updates refresh both list and detail queries', () => {
  assert.deepEqual(buildUpdateSpeciesInvalidationQueryKeys('species-1'), [
    SPECIES_PAGE_QUERY_KEY,
    buildSpeciesDetailQueryKey('species-1'),
  ]);
});

test('user mutations refresh the shared users query family', () => {
  assert.deepEqual(CREATE_USER_INVALIDATION_QUERY_KEYS, [
    USERS_PAGE_QUERY_KEY,
    HEALTH_ODOO_QUERY_KEY,
  ]);
  assert.deepEqual(UPDATE_USER_STATUS_INVALIDATION_QUERY_KEYS, [
    USERS_PAGE_QUERY_KEY,
    AUTH_SESSION_QUERY_KEY,
    HEALTH_ODOO_QUERY_KEY,
  ]);
});

test('phase creation refreshes overview, wizard, dashboard, and map contract surfaces', () => {
  assert.deepEqual(CREATE_PLANTING_PHASE_INVALIDATION_QUERY_KEYS, [
    PLANTING_PHASE_OVERVIEW_QUERY_KEY,
    PLANTING_WIZARD_DATA_QUERY_KEY,
    DASHBOARD_SUMMARY_QUERY_KEY,
    CONTRACTS_SUMMARY_QUERY_KEY,
    MAP_VIEWER_DATA_QUERY_KEY,
    MAP_MANAGEMENT_DATA_QUERY_KEY,
  ]);
});

test('observation photo upload invalidation refreshes the matching media gallery query only', () => {
  assert.deepEqual(buildUploadObservationPhotoInvalidationQueryKeys('obs-123'), [
    buildObservationPhotosQueryKey('obs-123'),
  ]);
});
