import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBakkiCorePersistenceLabel,
  getDeploymentBlockerSummary,
  getMirrorPersistenceLabel,
  getOdooConnectionDescription,
  getOdooConnectionStatusLabel,
  getOdooCredentialSourceLabel,
  getRecommendedActionSummary,
  getSettingsTitle,
  getWeatherFeedStatusLabel,
  resolveLastSuccessfulSyncTimestamp,
  SETTINGS_TABS,
} from './system-settings.page-utils';

test('getSettingsTitle keeps settings route titles stable', () => {
  assert.equal(getSettingsTitle('general'), 'General Settings');
  assert.equal(getSettingsTitle('odoo'), 'Odoo Settings');
  assert.equal(getSettingsTitle('notifications'), 'Notification Settings');
  assert.equal(getSettingsTitle('map'), 'Map Settings');
});

test('SETTINGS_TABS preserves the expected settings tab order and paths', () => {
  assert.deepEqual(
    SETTINGS_TABS.map((tab) => [tab.id, tab.path]),
    [
      ['general', '/settings/general'],
      ['odoo', '/settings/odoo'],
      ['notifications', '/settings/notifications'],
      ['map', '/settings/map'],
    ],
  );
});

test('getOdooCredentialSourceLabel formats deployment-facing credential labels', () => {
  assert.equal(getOdooCredentialSourceLabel('environment'), 'Runtime env');
  assert.equal(getOdooCredentialSourceLabel('api_keys_file'), 'API_Keys.txt fallback');
  assert.equal(getOdooCredentialSourceLabel('missing'), 'Missing');
  assert.equal(getOdooCredentialSourceLabel(undefined), 'Missing');
});

test('Odoo connection helpers keep operator-facing status copy stable', () => {
  assert.equal(getOdooConnectionStatusLabel(undefined), 'Attention');
  assert.equal(
    getOdooConnectionDescription(undefined),
    'Odoo Online service diagnostics are still loading.',
  );
  assert.equal(
    getOdooConnectionDescription(undefined, 'boom'),
    'Live Odoo diagnostics are unavailable; showing fallback values.',
  );
  assert.equal(
    getOdooConnectionStatusLabel({
      odoo: { reachable: true },
    } as never),
    'Active',
  );
  assert.equal(
    getOdooConnectionDescription({
      odoo: { reachable: true },
    } as never),
    'Authorized access to the Bakki Odoo Online tenant.',
  );
});

test('Bakki Core persistence helpers reflect configured mirror state and last sync selection', () => {
  const diagnostics = {
    bakkiCore: {
      configured: true,
      ok: true,
    },
    checkedAt: '2026-03-28T10:00:00.000Z',
    mirrors: {
      tasks: { lastSuccessAt: '2026-03-28T09:00:00.000Z' },
      users: { lastSuccessAt: '2026-03-28T08:00:00.000Z' },
    },
  } as never;

  assert.equal(getBakkiCorePersistenceLabel(diagnostics), 'Connected');
  assert.equal(getMirrorPersistenceLabel(diagnostics), 'Enabled');
  assert.equal(resolveLastSuccessfulSyncTimestamp(diagnostics), '2026-03-28T09:00:00.000Z');
  assert.equal(getBakkiCorePersistenceLabel(undefined), 'Not configured');
  assert.equal(getMirrorPersistenceLabel(undefined), 'Disabled in this environment');
});

test('getDeploymentBlockerSummary summarizes blocker counts for the settings card', () => {
  assert.equal(getDeploymentBlockerSummary(undefined), 'Checking');
  assert.equal(
    getDeploymentBlockerSummary({
      deploymentBlockers: [
        { id: 'bakki-core-unhealthy', label: 'Bakki Core not configured', detail: 'Set database secrets.' },
        { id: 'media-not-configured', label: 'Spaces not configured', detail: 'Set Spaces secrets.' },
      ],
    } as never),
    '2 open',
  );
});

test('getRecommendedActionSummary summarizes backend-provided remediation actions', () => {
  assert.equal(getRecommendedActionSummary(undefined), 'Checking');
  assert.equal(
    getRecommendedActionSummary({
      recommendedActions: [
        { id: 'fix-bakki-core-connectivity', label: 'Restore Bakki Core connectivity', detail: 'Start Postgres.', command: 'yarn bakki-core:db:doctor' },
        { id: 'configure-spaces', label: 'Configure Spaces', detail: 'Set secrets.', command: 'yarn media:probe-upload --json' },
      ],
    } as never),
    '2 queued',
  );
});

test('getWeatherFeedStatusLabel summarizes weather availability for the settings card', () => {
  assert.equal(getWeatherFeedStatusLabel(undefined), 'Checking');
  assert.equal(getWeatherFeedStatusLabel({ weather: { available: true } } as never), 'Reachable');
  assert.equal(getWeatherFeedStatusLabel({ weather: { available: false } } as never), 'Unavailable');
});
