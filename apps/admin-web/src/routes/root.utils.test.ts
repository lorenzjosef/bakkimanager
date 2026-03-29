import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShellRouteState } from './root.utils';

test('buildShellRouteState maps dashboard aliases to the dashboard shell state', () => {
  const rootState = buildShellRouteState('/');
  const dashboardState = buildShellRouteState('/dashboard');

  assert.deepEqual(rootState, dashboardState);
  assert.equal(rootState.activeView, 'dashboard');
  assert.equal(rootState.navView, 'dashboard');
  assert.equal(rootState.title, 'Dashboard');
  assert.equal(rootState.activeUtility, undefined);
});

test('buildShellRouteState preserves settings utility state and shared settings destination', () => {
  const state = buildShellRouteState('/settings/odoo');

  assert.equal(state.activeView, 'settings-odoo');
  assert.equal(state.navView, 'settings-odoo');
  assert.equal(state.activeUtility, 'settings');
  assert.equal(state.title, 'Odoo Settings');
  assert.equal(state.settingsPath, '/settings/general');
  assert.equal(state.supportPath, '/support');
});

test('buildShellRouteState maps wizard steps back to the planting phases nav section', () => {
  const state = buildShellRouteState('/planting-phases/new/confirm');

  assert.equal(state.activeView, 'phase-setup-confirm');
  assert.equal(state.navView, 'phase-summary');
  assert.equal(state.title, 'Start New Planting Phase');
  assert.equal(state.activeUtility, undefined);
});

test('buildShellRouteState resolves the contracts page directly from route metadata', () => {
  const state = buildShellRouteState('/contracts');

  assert.equal(state.activeView, 'contracts');
  assert.equal(state.navView, 'contracts');
  assert.equal(state.title, 'Contracts');
  assert.equal(state.activeUtility, undefined);
});

test('buildShellRouteState falls back unknown paths to the dashboard shell state', () => {
  const state = buildShellRouteState('/missing-page');

  assert.equal(state.activeView, 'dashboard');
  assert.equal(state.navView, 'dashboard');
  assert.equal(state.title, 'Dashboard');
});
