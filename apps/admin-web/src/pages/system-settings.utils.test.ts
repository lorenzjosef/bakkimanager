import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGeometryPersistenceDetail,
  buildGeometrySeedDetail,
  buildOdooTip,
  formatOdooBaseUrl,
  formatSettingsTimestamp,
  getFallbackSyncHistory,
  getGeometryPersistenceStatusLabel,
  getGeometrySeedStatusLabel,
  mirrorErrorWidth,
} from './system-settings.utils';

function createDiagnosticsInput() {
  return {
    bakkiCore: {
      appliedMigrationCount: 1,
      checkedAt: '2026-03-28T10:00:00.000Z',
      configured: true,
      connectionMode: 'connection_string' as const,
      database: 'bakki_core',
      host: 'db.internal',
      migrationTablePresent: true,
      message: 'Bakki Core reachable.',
      missingFields: [],
      ok: true,
      port: 5432,
      postgisAvailable: true,
      postgisVersion: '3.4',
      serverVersion: '16.3',
    },
    deploymentBlockers: [] as Array<{ id: string; label: string; detail: string }>,
    geometryPersistence: {
      ranchCount: 1,
      zoneCount: 5,
      areaCount: 5,
    },
    geometrySeed: {
      checkedAt: '2026-03-28T10:00:00.000Z',
      containmentFailureCount: 0,
      containmentFailures: [],
      message: 'Geometry seed passed ranch-containment and zone-overlap validation.',
      overlapPairCount: 0,
      overlapPairs: [],
      overrideEnabled: false,
      promotable: true,
      seedGeneratedAt: '2026-03-28T09:00:00.000Z',
      zonesWithinRanch: true,
    },
    media: {
      provider: 'digitalocean-spaces' as const,
      configured: true,
      bucket: 'bakki-media',
      endpoint: 'https://fra1.digitaloceanspaces.com',
      region: 'fra1',
      cdnBaseUrl: null,
      missingFields: [],
      supportsDirectUploadSigning: true,
      supportedOwners: ['task', 'observation'] as Array<'task' | 'observation'>,
      message: 'Spaces configured.',
    },
    weather: {
      provider: 'open-meteo' as const,
      checkedAt: '2026-03-28T10:00:00.000Z',
      available: true,
      conditionsValue: '9C / Overcast',
      conditionsCopy: 'Wind: 18km/h NW',
      message: 'Open-Meteo weather feed is reachable.',
    },
    mirrors: {
      users: {
        errorCount: 0,
        lastAttemptAt: null,
        lastSuccessAt: null,
        okCount: 0,
        retryingCount: 0,
        total: 0,
      },
      tasks: {
        errorCount: 0,
        lastAttemptAt: null,
        lastSuccessAt: null,
        okCount: 0,
        retryingCount: 0,
        total: 0,
      },
    },
    odoo: {
      baseUrl: 'https://bakki.odoo.com',
      checkedAt: '2026-03-28T10:00:00.000Z',
      configured: true,
      credentialSource: 'environment' as const,
      database: 'bakki',
      message: 'Odoo Online reachable.',
      reachable: true,
    },
  };
}

test('formatOdooBaseUrl strips protocol and trailing slashes', () => {
  assert.equal(formatOdooBaseUrl('https://bakki.odoo.com/'), 'bakki.odoo.com');
  assert.equal(formatOdooBaseUrl('http://bakki.odoo.com///'), 'bakki.odoo.com');
  assert.equal(formatOdooBaseUrl(null), null);
});

test('formatSettingsTimestamp produces a UTC label', () => {
  const formatted = formatSettingsTimestamp('2026-03-28T10:15:00.000Z');
  assert.match(formatted, /28 Mar 2026,/);
  assert.match(formatted, /UTC$/);
});

test('getFallbackSyncHistory returns the expected fallback entries', () => {
  const history = getFallbackSyncHistory();
  assert.equal(history.length, 4);
  assert.deepEqual(
    history.map((item) => item.id),
    ['fallback-odoo', 'fallback-mirrors', 'fallback-media', 'fallback-weather'],
  );
});

test('mirrorErrorWidth returns zero without diagnostics and clamps low non-zero values', () => {
  assert.equal(mirrorErrorWidth(undefined), 0);
  assert.equal(
    mirrorErrorWidth({
      mirrors: {
        users: { errorCount: 1, total: 30 },
        tasks: { errorCount: 0, total: 30 },
      },
    }),
    6,
  );
});

test('mirrorErrorWidth reflects the error ratio and clamps at 100', () => {
  assert.equal(
    mirrorErrorWidth({
      mirrors: {
        users: { errorCount: 5, total: 10 },
        tasks: { errorCount: 5, total: 10 },
      },
    }),
    50,
  );
  assert.equal(
    mirrorErrorWidth({
      mirrors: {
        users: { errorCount: 20, total: 10 },
        tasks: { errorCount: 20, total: 10 },
      },
    }),
    100,
  );
});

test('buildOdooTip prioritizes request failures and missing diagnostics', () => {
  assert.equal(buildOdooTip(undefined), 'Waiting for live Odoo, Bakki Core, and media diagnostics.');
  assert.equal(buildOdooTip(undefined, 'boom'), 'Diagnostics request failed: boom');
});

test('buildOdooTip prefers the first backend-supplied deployment blocker when present', () => {
  const diagnostics = createDiagnosticsInput();
  diagnostics.deploymentBlockers = [
    {
      id: 'odoo-api-keys-fallback',
      label: 'Odoo credentials still using local fallback',
      detail: 'Odoo service credentials are still coming from API_Keys.txt fallback. Move them into runtime secrets before treating deployment as ready.',
    },
  ];

  assert.equal(
    buildOdooTip(diagnostics),
    'Odoo service credentials are still coming from API_Keys.txt fallback. Move them into runtime secrets before treating deployment as ready.',
  );
});

test('buildOdooTip reports the correct operational blocker', () => {
  const baseDiagnostics = createDiagnosticsInput();

  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      odoo: { ...baseDiagnostics.odoo, reachable: false },
    }),
    'Odoo Online is currently unreachable. Check service credentials and tenant API availability first.',
  );
  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      odoo: { ...baseDiagnostics.odoo, credentialSource: 'api_keys_file' },
    }),
    'Odoo service credentials are still coming from API_Keys.txt fallback. Move them into runtime secrets before treating deployment as ready.',
  );
  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      bakkiCore: { ...baseDiagnostics.bakkiCore, configured: false, ok: false },
    }),
    'Bakki Core is not healthy. Fix the PostgreSQL/PostGIS connection before trusting sync results.',
  );
  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      geometrySeed: {
        ...baseDiagnostics.geometrySeed,
        promotable: false,
        message: 'Geometry seed failed validation.',
      },
    }),
    'The current ranch/zone seed geometry is blocked from promotion. Clean the source geometry or explicitly enable the override only for deliberate local provisional testing.',
  );
  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      geometrySeed: {
        ...baseDiagnostics.geometrySeed,
        promotable: false,
        overrideEnabled: true,
        message: 'Geometry seed failed validation but override is enabled.',
      },
    }),
    'The geometry seed override is active. Bakki can use provisional ranch/zone geometry in this environment, but that state is not suitable for normal deployment.',
  );
  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      geometryPersistence: {
        ranchCount: 0,
        zoneCount: 0,
        areaCount: 0,
      },
    }),
    'Bakki Core is healthy, but no persisted ranch, zone, or area geometry exists yet. Run bootstrap after fixing the seed or import corrected geometry before treating maps as live.',
  );
  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      geometryPersistence: {
        ranchCount: 1,
        zoneCount: 5,
        areaCount: 0,
      },
    }),
    'Bakki Core geometry is only partially persisted. Complete ranch, zone, and area imports before treating maps as live.',
  );
  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      media: { ...baseDiagnostics.media, configured: false },
    }),
    'DigitalOcean Spaces is still not configured. Media uploads will remain unavailable until provider secrets are present.',
  );
  assert.equal(
    buildOdooTip({
      ...baseDiagnostics,
      mirrors: {
        users: { ...baseDiagnostics.mirrors.users, retryingCount: 1 },
        tasks: { ...baseDiagnostics.mirrors.tasks, retryingCount: 2 },
      },
    }),
    '3 mirrored records are carrying sync retry state. Clear those before promoting deployment.',
  );
  assert.equal(
    buildOdooTip(baseDiagnostics),
    'Odoo Online, Bakki Core, and media configuration are healthy from the backend perspective.',
  );
});

test('getGeometryPersistenceStatusLabel distinguishes empty, partial, and persisted states', () => {
  assert.equal(getGeometryPersistenceStatusLabel(undefined), 'Unknown');
  assert.equal(getGeometryPersistenceStatusLabel({ ranchCount: 0, zoneCount: 0, areaCount: 0 }), 'Empty');
  assert.equal(getGeometryPersistenceStatusLabel({ ranchCount: 1, zoneCount: 5, areaCount: 0 }), 'Partial');
  assert.equal(getGeometryPersistenceStatusLabel({ ranchCount: 1, zoneCount: 5, areaCount: 5 }), 'Persisted');
});

test('buildGeometryPersistenceDetail summarizes current counts', () => {
  assert.equal(buildGeometryPersistenceDetail(undefined), 'Checking persisted geometry counts.');
  assert.equal(
    buildGeometryPersistenceDetail({ ranchCount: 1, zoneCount: 5, areaCount: 8 }),
    '1 ranch, 5 zones, and 8 areas are currently persisted in Bakki Core.',
  );
});

test('getGeometrySeedStatusLabel distinguishes promotable, blocked, and override states', () => {
  assert.equal(getGeometrySeedStatusLabel(undefined), 'Unknown');
  assert.equal(getGeometrySeedStatusLabel({ promotable: true, overrideEnabled: false }), 'Promotable');
  assert.equal(getGeometrySeedStatusLabel({ promotable: false, overrideEnabled: false }), 'Needs topology cleanup');
  assert.equal(getGeometrySeedStatusLabel({ promotable: false, overrideEnabled: true }), 'Override enabled');
});

test('buildGeometrySeedDetail summarizes failures and override state', () => {
  assert.equal(buildGeometrySeedDetail(undefined), 'Checking geometry-seed validation.');
  assert.equal(
    buildGeometrySeedDetail({
      promotable: true,
      overrideEnabled: false,
      message: 'Geometry seed passed ranch-containment and zone-overlap validation.',
      containmentFailures: [],
      overlapPairs: [],
    }),
    'Geometry seed passed ranch-containment and zone-overlap validation.',
  );
  assert.equal(
    buildGeometrySeedDetail({
      promotable: false,
      overrideEnabled: true,
      message: 'Geometry seed failed validation.',
      containmentFailures: ['Zone 1'],
      overlapPairs: [['Zone 1', 'Zone 2']],
    }),
    'Geometry seed failed validation. Containment failures: Zone 1. Overlap pairs: Zone 1/Zone 2. Override is active for this environment.',
  );
});
