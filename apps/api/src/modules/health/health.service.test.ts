import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { HealthService } from './health.service';

type MirrorSummary = {
  errorCount: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  okCount: number;
  retryingCount: number;
  total: number;
};

type MockBundle = {
  authService: {
    getSession: (sessionToken?: string) => Promise<{ session: { authenticated: boolean; user: { role: 'owner' | 'planter' } } }>;
  };
  bakkiAreaMetrics: {
    listByZoneRefs: (zoneRefs: string[]) => Promise<Array<{ id: string }>>;
  };
  bakkiCore: {
    healthcheck: () => Promise<{
      appliedMigrationCount: number | null;
      configured: boolean;
      connectionMode: 'connection_string' | 'field_set' | 'missing';
      database: string | null;
      host: string | null;
      migrationTablePresent: boolean | null;
      message: string;
      missingFields: string[];
      ok: boolean;
      port: number | null;
      postgisAvailable: boolean | null;
      postgisVersion: string | null;
      serverVersion: string | null;
    }>;
    runMigrations: () => Promise<{
      configured: boolean;
      appliedMigrations: string[];
      skippedMigrations: string[];
      message: string;
    }>;
  };
  bakkiGeometry: {
    ensureAreaCatalog: () => Promise<void>;
    getPersistedGeometryCounts: () => Promise<{ areaCount: number; ranchCount: number; zoneCount: number }>;
    getSeedValidationStatus: () => {
      checkedAt: string;
      containmentFailureCount: number;
      containmentFailures: string[];
      message: string;
      overlapPairCount: number;
      overlapPairs: Array<[string, string]>;
      overrideEnabled: boolean;
      promotable: boolean;
      seedGeneratedAt: string;
      zonesWithinRanch: boolean;
    };
    listPersistedZoneRefs: () => Promise<string[]>;
    listZoneSummaries: () => Promise<Array<{ id: string }>>;
    promoteSeedGeometry: () => Promise<boolean>;
  };
  bakkiSpecies: {
    listSpecies: () => Promise<Array<{ id: string }>>;
  };
  bakkiTaskTemplates: {
    ensureSchema: () => Promise<void>;
    listActive: () => Promise<Array<{ id: string }>>;
  };
  bakkiTasks: {
    getSyncHealthSummary: () => Promise<MirrorSummary>;
    isConfigured: () => boolean;
    markSyncFailureByOdooTaskId: (odooTaskId: number, message: string) => Promise<void>;
  };
  bakkiUsers: {
    getSyncHealthSummary: () => Promise<MirrorSummary>;
    isConfigured: () => boolean;
  };
  dashboardWeather: {
    getHealthStatus: () => Promise<{
      available: boolean;
      checkedAt: string;
      conditionsCopy: string | null;
      conditionsValue: string | null;
      message: string;
      provider: 'open-meteo';
    }>;
  };
  mediaService: {
    createSigningProbe: () => Promise<{ configured: boolean; message: string }>;
    createUploadProbe: () => Promise<{ configured: boolean; message: string }>;
    getUploadStatus: () => {
      provider: 'digitalocean-spaces';
      configured: boolean;
      bucket: string | null;
      endpoint: string | null;
      region: string | null;
      cdnBaseUrl: string | null;
      missingFields: string[];
      supportsDirectUploadSigning: boolean;
      supportedOwners: Array<'task' | 'observation'>;
      message: string;
    };
  };
  odoo: {
    executeKw: <T>(model: string, method: string, args: unknown[]) => Promise<T>;
    healthcheck: () => Promise<{
      baseUrl: string | null;
      checkedAt: string;
      configured: boolean;
      credentialSource: 'environment' | 'api_keys_file' | 'missing';
      database: string | null;
      message: string;
      reachable: boolean;
    }>;
    isConfigured: () => boolean;
    searchRead: <T>(model: string) => Promise<T[]>;
  };
  odooTaskSync: {
    getReadiness: () => Promise<{
      checkedAt: string;
      configured: boolean;
      defaultProject: { id: number; name: string | null } | null;
      message: string;
      missingWorkflowStates: Array<'pending' | 'in_progress' | 'done' | 'cancelled'>;
      stageCounts: Record<'pending' | 'in_progress' | 'done' | 'cancelled', number>;
      stageMappings: Array<{
        id: number;
        name: string;
        sequence: number | null;
        fold: boolean;
        projectCount: number;
        workflowState: 'pending' | 'in_progress' | 'done' | 'cancelled';
      }>;
      writeReady: boolean;
    }>;
    provision: () => Promise<{ startedAt: string; completedAt: string; createdProject: { id: number; name: string } | null; createdStages: Array<{ id: number; name: string; workflowState: 'pending' | 'in_progress' | 'done' | 'cancelled' }>; message: string }>;
    runWriteProbe: () => Promise<{ startedAt: string; completedAt: string; probeTaskId: number | null; mirroredTaskId: number | null; taskTitle: string | null; finalStageName: string | null; message: string }>;
  };
  tasksService: {
    refreshMirrorForOdooTaskId: (odooTaskId: number) => Promise<{ id: number; odooStageName: string | null } | null>;
    refreshMirrorsFromOdoo: () => Promise<{ failed: number; fetched: number; synced: number }>;
  };
  usersService: {
    refreshMirrorsFromOdoo: () => Promise<{ failed: number; fetched: number; synced: number }>;
  };
};

function createMirrorSummary(partial: Partial<MirrorSummary> = {}): MirrorSummary {
  return {
    total: 1,
    okCount: 1,
    errorCount: 0,
    retryingCount: 0,
    lastAttemptAt: '2026-03-28T10:00:00.000Z',
    lastSuccessAt: '2026-03-28T10:05:00.000Z',
    ...partial,
  };
}

function createHealthService(overrides: Partial<MockBundle> = {}) {
  const defaults: MockBundle = {
    authService: {
      getSession: async () => ({
        session: {
          authenticated: true,
          user: { role: 'owner' },
        },
      }),
    },
    bakkiAreaMetrics: {
      listByZoneRefs: async () => [{ id: 'metrics-1' }],
    },
    bakkiCore: {
      healthcheck: async () => ({
        appliedMigrationCount: 1,
        configured: true,
        connectionMode: 'connection_string',
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
      }),
      runMigrations: async () => ({
        configured: true,
        appliedMigrations: ['001_initial.sql'],
        skippedMigrations: [],
        message: 'Bakki Core migrations applied.',
      }),
    },
    bakkiGeometry: {
      ensureAreaCatalog: async () => {},
      getPersistedGeometryCounts: async () => ({
        ranchCount: 1,
        zoneCount: 2,
        areaCount: 2,
      }),
      getSeedValidationStatus: () => ({
        checkedAt: '2026-03-28T10:00:00.000Z',
        containmentFailureCount: 4,
        containmentFailures: ['Zone 1', 'Zone 2', 'Zone 4', 'Zone 5'],
        message: 'Geometry seed failed validation: 4 containment issues and 4 overlap pairs detected. Promotion is blocked by default until the geometry is cleaned or BAKKI_CORE_ALLOW_INVALID_GEOMETRY_SEED=true is set.',
        overlapPairCount: 4,
        overlapPairs: [
          ['Zone 1', 'Zone 2'],
          ['Zone 2', 'Zone 3'],
          ['Zone 3', 'Zone 4'],
          ['Zone 4', 'Zone 5'],
        ],
        overrideEnabled: false,
        promotable: false,
        seedGeneratedAt: '2026-03-28T09:00:00.000Z',
        zonesWithinRanch: false,
      }),
      listPersistedZoneRefs: async () => ['zone-1', 'zone-2'],
      listZoneSummaries: async () => [{ id: 'zone-1' }, { id: 'zone-2' }],
      promoteSeedGeometry: async () => true,
    },
    bakkiSpecies: {
      listSpecies: async () => [{ id: 'species-1' }, { id: 'species-2' }],
    },
    bakkiTaskTemplates: {
      ensureSchema: async () => {},
      listActive: async () => [{ id: 'template-1' }],
    },
    bakkiTasks: {
      getSyncHealthSummary: async () => createMirrorSummary({ total: 3, okCount: 3 }),
      isConfigured: () => true,
      markSyncFailureByOdooTaskId: async () => {},
    },
    bakkiUsers: {
      getSyncHealthSummary: async () => createMirrorSummary({ total: 2, okCount: 2 }),
      isConfigured: () => true,
    },
    dashboardWeather: {
      getHealthStatus: async () => ({
        provider: 'open-meteo',
        checkedAt: '2026-03-28T10:00:00.000Z',
        available: true,
        conditionsValue: '9C / Overcast',
        conditionsCopy: 'Wind: 18km/h NW',
        message: 'Open-Meteo weather feed is reachable.',
      }),
    },
    mediaService: {
      createSigningProbe: async () => ({ configured: true, message: 'ok' }),
      createUploadProbe: async () => ({ configured: true, message: 'ok' }),
      getUploadStatus: () => ({
        provider: 'digitalocean-spaces',
        configured: false,
        bucket: null,
        endpoint: null,
        region: null,
        cdnBaseUrl: null,
        missingFields: ['SPACES_BUCKET'],
        supportsDirectUploadSigning: true,
        supportedOwners: ['task', 'observation'],
        message: 'Spaces is not configured.',
      }),
    },
    odoo: {
      executeKw: async <T>(_model: string, _method: string, _args: unknown[]) => true as T,
      healthcheck: async () => ({
        baseUrl: 'https://bakki.odoo.com',
        checkedAt: '2026-03-28T10:00:00.000Z',
        configured: true,
        credentialSource: 'environment',
        database: 'bakki',
        message: 'Odoo Online reachable.',
        reachable: true,
      }),
      isConfigured: () => true,
      searchRead: async <T>(model: string) => {
        if (model === 'project.project') {
          return [{ id: 7, name: 'Bakki Operations' }] as T[];
        }

        if (model === 'project.task.type') {
          return [
            { id: 1, name: 'To Do', sequence: 10, fold: false, project_ids: [7] },
            { id: 2, name: 'In Progress', sequence: 50, fold: false, project_ids: [7] },
            { id: 3, name: 'Done', sequence: 100, fold: true, project_ids: [7] },
            { id: 4, name: 'Cancelled', sequence: 110, fold: true, project_ids: [7] },
          ] as T[];
        }

        return [];
      },
    },
    odooTaskSync: {
      getReadiness: async () => ({
        checkedAt: '2026-03-28T10:00:00.000Z',
        configured: true,
        defaultProject: { id: 7, name: 'Bakki Operations' },
        message: 'Default project and standard stage mappings are available for Bakki task sync.',
        missingWorkflowStates: [],
        stageCounts: {
          pending: 1,
          in_progress: 1,
          done: 1,
          cancelled: 1,
        },
        stageMappings: [
          { id: 1, name: 'To Do', sequence: 10, fold: false, projectCount: 1, workflowState: 'pending' },
          { id: 2, name: 'In Progress', sequence: 50, fold: false, projectCount: 1, workflowState: 'in_progress' },
          { id: 3, name: 'Done', sequence: 100, fold: true, projectCount: 1, workflowState: 'done' },
          { id: 4, name: 'Cancelled', sequence: 110, fold: true, projectCount: 1, workflowState: 'cancelled' },
        ],
        writeReady: true,
      }),
      provision: async () => ({
        startedAt: '2026-03-28T10:00:00.000Z',
        completedAt: '2026-03-28T10:00:01.000Z',
        createdProject: null,
        createdStages: [],
        message: 'Odoo task sync prerequisites were already present.',
      }),
      runWriteProbe: async () => ({
        startedAt: '2026-03-28T10:00:00.000Z',
        completedAt: '2026-03-28T10:00:01.000Z',
        probeTaskId: 99,
        mirroredTaskId: 199,
        taskTitle: '[Bakki Sync Probe] 2026-03-28T10:00:00Z',
        finalStageName: 'Done',
        message: 'Odoo write probe completed.',
      }),
    },
    tasksService: {
      refreshMirrorForOdooTaskId: async () => null,
      refreshMirrorsFromOdoo: async () => ({ fetched: 4, synced: 4, failed: 0 }),
    },
    usersService: {
      refreshMirrorsFromOdoo: async () => ({ fetched: 2, synced: 2, failed: 0 }),
    },
  };

  const deps = { ...defaults, ...overrides };
  const service = new HealthService(
    deps.authService as never,
    deps.bakkiAreaMetrics as never,
    deps.bakkiCore as never,
    deps.bakkiGeometry as never,
    deps.bakkiSpecies as never,
    deps.bakkiTasks as never,
    deps.bakkiTaskTemplates as never,
    deps.bakkiUsers as never,
    deps.dashboardWeather as never,
    deps.mediaService as never,
    deps.odoo as never,
    deps.odooTaskSync as never,
    deps.tasksService as never,
    deps.usersService as never,
  );

  return { deps, service };
}

test('getOdooDiagnostics reports Bakki mirrors unavailable when Bakki Core is not configured', async () => {
  const { service } = createHealthService({
    bakkiCore: {
      healthcheck: async () => ({
        appliedMigrationCount: null,
        configured: false,
        connectionMode: 'missing',
        database: 'bakki_core',
        host: '127.0.0.1',
        migrationTablePresent: null,
        message: 'Bakki Core is not configured.',
        missingFields: ['BAKKI_CORE_DATABASE_URL', 'BAKKI_CORE_DB_PASSWORD'],
        ok: false,
        port: 5432,
        postgisAvailable: null,
        postgisVersion: null,
        serverVersion: null,
      }),
      runMigrations: async () => ({
        configured: false,
        appliedMigrations: [],
        skippedMigrations: [],
        message: 'Bakki Core is not configured.',
      }),
    },
    bakkiUsers: {
      isConfigured: () => false,
      getSyncHealthSummary: async () => createMirrorSummary(),
    },
    bakkiTasks: {
      isConfigured: () => false,
      getSyncHealthSummary: async () => createMirrorSummary(),
      markSyncFailureByOdooTaskId: async () => {},
    },
    bakkiGeometry: {
      ensureAreaCatalog: async () => {},
      getPersistedGeometryCounts: async () => ({
        ranchCount: 0,
        zoneCount: 0,
        areaCount: 0,
      }),
      getSeedValidationStatus: () => ({
        checkedAt: '2026-03-28T10:00:00.000Z',
        containmentFailureCount: 4,
        containmentFailures: ['Zone 1', 'Zone 2', 'Zone 4', 'Zone 5'],
        message: 'Geometry seed failed validation: 4 containment issues and 4 overlap pairs detected. Promotion is blocked by default until the geometry is cleaned or BAKKI_CORE_ALLOW_INVALID_GEOMETRY_SEED=true is set.',
        overlapPairCount: 4,
        overlapPairs: [
          ['Zone 1', 'Zone 2'],
          ['Zone 2', 'Zone 3'],
          ['Zone 3', 'Zone 4'],
          ['Zone 4', 'Zone 5'],
        ],
        overrideEnabled: false,
        promotable: false,
        seedGeneratedAt: '2026-03-28T09:00:00.000Z',
        zonesWithinRanch: false,
      }),
      listPersistedZoneRefs: async () => [],
      listZoneSummaries: async () => [],
      promoteSeedGeometry: async () => false,
    },
  });

  const diagnostics = await service.getOdooDiagnostics();

  assert.equal(diagnostics.bakkiCore.configured, false);
  assert.equal(diagnostics.bakkiCore.port, 5432);
  assert.equal(diagnostics.bakkiCore.serverVersion, null);
  assert.equal(diagnostics.bakkiCore.postgisAvailable, null);
  assert.equal(diagnostics.mirrors.users.total, 0);
  assert.equal(diagnostics.mirrors.tasks.total, 0);
  assert.equal(diagnostics.successRatePercent, null);
  assert.equal(diagnostics.taskSync.writeReady, true);
  assert.equal(diagnostics.weather.available, true);
  assert.deepEqual(diagnostics.geometryPersistence, {
    ranchCount: 0,
    zoneCount: 0,
    areaCount: 0,
  });
  assert.equal(diagnostics.deploymentBlockers[0]?.id, 'bakki-core-unhealthy');
  assert.equal(diagnostics.recommendedActions[0]?.id, 'fix-bakki-core-connectivity');
  assert.ok(!diagnostics.deploymentBlockers.some((item) => item.id === 'persisted-geometry-missing'));
  assert.ok(!diagnostics.deploymentBlockers.some((item) => item.id === 'persisted-geometry-partial'));
  assert.ok(diagnostics.syncHistory.some((item) => item.id === 'weather-provider'));
  assert.ok(diagnostics.syncHistory.some((item) => item.id === 'mirror-sync-unavailable'));
  assert.ok(diagnostics.syncHistory.some((item) => item.id === 'persisted-geometry-unavailable'));
});

test('getOdooDiagnostics reports weather feed warnings without treating them as deployment blockers', async () => {
  const { service } = createHealthService({
    dashboardWeather: {
      getHealthStatus: async () => ({
        provider: 'open-meteo',
        checkedAt: '2026-03-28T10:00:00.000Z',
        available: false,
        conditionsValue: null,
        conditionsCopy: null,
        message: 'Ranch centroid is unavailable, so the weather feed cannot be checked.',
      }),
    },
  });

  const diagnostics = await service.getOdooDiagnostics();

  assert.equal(diagnostics.weather.available, false);
  assert.equal(
    diagnostics.syncHistory.find((item) => item.id === 'weather-provider')?.detail,
    'Ranch centroid is unavailable, so the weather feed cannot be checked.',
  );
  assert.ok(!diagnostics.deploymentBlockers.some((item) => item.id === 'weather-unavailable'));
});

test('getOdooDiagnostics tolerates unhealthy Bakki Core without querying mirror health', async () => {
  let userMirrorCalls = 0;
  let taskMirrorCalls = 0;

  const { service } = createHealthService({
    bakkiCore: {
      healthcheck: async () => ({
        appliedMigrationCount: null,
        configured: true,
        connectionMode: 'field_set',
        database: 'bakki_core',
        host: '127.0.0.1',
        migrationTablePresent: null,
        message: 'connect ECONNREFUSED 127.0.0.1:5432',
        missingFields: [],
        ok: false,
        port: 5432,
        postgisAvailable: null,
        postgisVersion: null,
        serverVersion: null,
      }),
      runMigrations: async () => ({
        configured: true,
        appliedMigrations: [],
        skippedMigrations: [],
        message: 'Bakki Core schema is already up to date.',
      }),
    },
    bakkiUsers: {
      isConfigured: () => true,
      getSyncHealthSummary: async () => {
        userMirrorCalls += 1;
        throw new Error('should not query user mirror health while Bakki Core is unhealthy');
      },
    },
    bakkiTasks: {
      isConfigured: () => true,
      getSyncHealthSummary: async () => {
        taskMirrorCalls += 1;
        throw new Error('should not query task mirror health while Bakki Core is unhealthy');
      },
      markSyncFailureByOdooTaskId: async () => {},
    },
  });

  const diagnostics = await service.getOdooDiagnostics();

  assert.equal(userMirrorCalls, 0);
  assert.equal(taskMirrorCalls, 0);
  assert.equal(diagnostics.mirrors.users.total, 0);
  assert.equal(diagnostics.mirrors.tasks.total, 0);
  assert.equal(diagnostics.bakkiCore.port, 5432);
  assert.ok(diagnostics.syncHistory.some((item) => item.id === 'mirror-sync-unavailable'));
  assert.ok(diagnostics.deploymentBlockers.some((item) => item.id === 'bakki-core-unhealthy'));
  assert.ok(diagnostics.recommendedActions.some((item) => item.id === 'fix-bakki-core-connectivity'));
});

test('getOdooDiagnostics surfaces Bakki Core engine and migration metadata when the DB is healthy', async () => {
  const { service } = createHealthService();

  const diagnostics = await service.getOdooDiagnostics();

  assert.equal(diagnostics.bakkiCore.serverVersion, '16.3');
  assert.equal(diagnostics.bakkiCore.postgisAvailable, true);
  assert.equal(diagnostics.bakkiCore.postgisVersion, '3.4');
  assert.equal(diagnostics.bakkiCore.migrationTablePresent, true);
  assert.equal(diagnostics.bakkiCore.appliedMigrationCount, 1);
});

test('getOdooDiagnostics reports missing PostGIS and missing migrations on a reachable Bakki Core DB', async () => {
  const { service } = createHealthService({
    bakkiCore: {
      healthcheck: async () => ({
        appliedMigrationCount: null,
        configured: true,
        connectionMode: 'field_set',
        database: 'bakki_core',
        host: '127.0.0.1',
        migrationTablePresent: false,
        message: 'Bakki Core database connection is healthy.',
        missingFields: [],
        ok: true,
        port: 5432,
        postgisAvailable: false,
        postgisVersion: null,
        serverVersion: '16.3',
      }),
      runMigrations: async () => ({
        configured: true,
        appliedMigrations: [],
        skippedMigrations: [],
        message: 'Bakki Core schema is already up to date.',
      }),
    },
  });

  const diagnostics = await service.getOdooDiagnostics();

  assert.ok(diagnostics.deploymentBlockers.some((item) => item.id === 'bakki-core-postgis-missing'));
  assert.ok(diagnostics.deploymentBlockers.some((item) => item.id === 'bakki-core-migrations-missing'));
  assert.ok(diagnostics.recommendedActions.some((item) => item.id === 'enable-postgis'));
  assert.ok(diagnostics.recommendedActions.some((item) => item.id === 'run-bakki-core-migrations'));
});

test('getOdooDiagnostics recommends bootstrap when Bakki Core is healthy but persisted geometry is missing', async () => {
  const { service } = createHealthService({
    bakkiGeometry: {
      ensureAreaCatalog: async () => {},
      getPersistedGeometryCounts: async () => ({
        ranchCount: 0,
        zoneCount: 0,
        areaCount: 0,
      }),
      getSeedValidationStatus: () => ({
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
      }),
      listPersistedZoneRefs: async () => [],
      listZoneSummaries: async () => [],
      promoteSeedGeometry: async () => false,
    },
  });

  const diagnostics = await service.getOdooDiagnostics();

  assert.ok(diagnostics.deploymentBlockers.some((item) => item.id === 'persisted-geometry-missing'));
  assert.ok(diagnostics.recommendedActions.some((item) => item.id === 'bootstrap-or-import-geometry'));
});

test('runOdooSyncNow short-circuits cleanly when Odoo is not configured', async () => {
  let sessionChecks = 0;
  const { service } = createHealthService({
    authService: {
      getSession: async () => {
        sessionChecks += 1;
        return {
          session: {
            authenticated: true,
            user: { role: 'owner' },
          },
        };
      },
    },
    odoo: {
      executeKw: async <T>() => true as T,
      healthcheck: async () => ({
        baseUrl: null,
        checkedAt: '2026-03-28T10:00:00.000Z',
        configured: false,
        credentialSource: 'missing',
        database: null,
        message: 'Odoo service credentials are not configured.',
        reachable: false,
      }),
      isConfigured: () => false,
      searchRead: async <T>() => [] as T[],
    },
  });

  const result = await service.runOdooSyncNow();

  assert.equal(result.users.fetched, 0);
  assert.equal(result.tasks.synced, 0);
  assert.equal(result.message, 'Odoo service credentials are not configured.');
  assert.equal(sessionChecks, 0);
});

test('runBakkiCoreBootstrap rejects non-owner sessions', async () => {
  const { service } = createHealthService({
    authService: {
      getSession: async () => ({
        session: {
          authenticated: true,
          user: { role: 'planter' },
        },
      }),
    },
  });

  await assert.rejects(() => service.runBakkiCoreBootstrap('session-token'), UnauthorizedException);
});

test('runBakkiCoreBootstrap applies migrations and reports seeded counts', async () => {
  let ensuredAreaCatalog = false;
  let ensuredTaskTemplates = false;
  const { service } = createHealthService({
    bakkiGeometry: {
      ensureAreaCatalog: async () => {
        ensuredAreaCatalog = true;
      },
      getPersistedGeometryCounts: async () => ({
        ranchCount: 1,
        zoneCount: 3,
        areaCount: 3,
      }),
      getSeedValidationStatus: () => ({
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
      }),
      promoteSeedGeometry: async () => true,
      listPersistedZoneRefs: async () => ['zone-1', 'zone-2', 'zone-3'],
      listZoneSummaries: async () => [{ id: 'zone-1' }, { id: 'zone-2' }, { id: 'zone-3' }],
    },
    bakkiTaskTemplates: {
      ensureSchema: async () => {
        ensuredTaskTemplates = true;
      },
      listActive: async () => [{ id: 'template-1' }, { id: 'template-2' }],
    },
    bakkiSpecies: {
      listSpecies: async () => [{ id: 'species-1' }],
    },
    bakkiAreaMetrics: {
      listByZoneRefs: async (zoneRefs: string[]) => zoneRefs.map((zoneRef) => ({ id: `${zoneRef}-metrics` })),
    },
  });

  const result = await service.runBakkiCoreBootstrap('session-token');

  assert.equal(result.configured, true);
  assert.deepEqual(result.appliedMigrations, ['001_initial.sql']);
  assert.equal(result.seededZoneCount, 3);
  assert.equal(result.seededTaskTemplateCount, 2);
  assert.equal(result.seededSpeciesCount, 1);
  assert.equal(result.seededAreaMetricsCount, 3);
  assert.deepEqual(result.geometryPersistence, {
    ranchCount: 1,
    zoneCount: 3,
    areaCount: 3,
  });
  assert.equal(result.geometrySeed.promotable, true);
  assert.equal(ensuredAreaCatalog, true);
  assert.equal(ensuredTaskTemplates, true);
});

test('provisionOdooTaskSync creates the default project and missing standard stages', async () => {
  let called = false;
  const { service } = createHealthService({
    odooTaskSync: {
      getReadiness: async () => ({
        checkedAt: '2026-03-28T10:00:00.000Z',
        configured: true,
        defaultProject: null,
        message: 'missing',
        missingWorkflowStates: ['pending', 'in_progress', 'done', 'cancelled'],
        stageCounts: { pending: 0, in_progress: 0, done: 0, cancelled: 0 },
        stageMappings: [],
        writeReady: false,
      }),
      provision: async () => {
        called = true;
        return {
          startedAt: '2026-03-28T10:00:00.000Z',
          completedAt: '2026-03-28T10:00:01.000Z',
          createdProject: { id: 41, name: 'Bakki Operations' },
          createdStages: [
            { id: 101, name: 'To Do', workflowState: 'pending' },
            { id: 102, name: 'In Progress', workflowState: 'in_progress' },
            { id: 103, name: 'Done', workflowState: 'done' },
            { id: 104, name: 'Cancelled', workflowState: 'cancelled' },
          ],
          message: 'Odoo task sync prerequisites were provisioned.',
        };
      },
      runWriteProbe: async () => ({
        startedAt: '2026-03-28T10:00:00.000Z',
        completedAt: '2026-03-28T10:00:01.000Z',
        probeTaskId: null,
        mirroredTaskId: null,
        taskTitle: null,
        finalStageName: null,
        message: 'unused',
      }),
    },
  });

  const result = await service.provisionOdooTaskSync('session-token');

  assert.equal(called, true);
  assert.equal(result.createdProject?.id, 41);
  assert.equal(result.createdStages.length, 4);
  assert.deepEqual(
    result.createdStages.map((stage) => stage.name),
    ['To Do', 'In Progress', 'Done', 'Cancelled'],
  );
});

test('runOdooTaskWriteProbe creates a tagged task, syncs the mirror, and advances stages', async () => {
  let called = false;
  const { service } = createHealthService({
    odooTaskSync: {
      getReadiness: async () => ({
        checkedAt: '2026-03-28T10:00:00.000Z',
        configured: true,
        defaultProject: { id: 9, name: 'Bakki Operations' },
        message: 'ready',
        missingWorkflowStates: [],
        stageCounts: { pending: 1, in_progress: 1, done: 1, cancelled: 1 },
        stageMappings: [],
        writeReady: true,
      }),
      provision: async () => ({
        startedAt: '2026-03-28T10:00:00.000Z',
        completedAt: '2026-03-28T10:00:01.000Z',
        createdProject: null,
        createdStages: [],
        message: 'unused',
      }),
      runWriteProbe: async () => {
        called = true;
        return {
          startedAt: '2026-03-28T10:00:00.000Z',
          completedAt: '2026-03-28T10:00:01.000Z',
          probeTaskId: 501,
          mirroredTaskId: 7001,
          taskTitle: '[Bakki Sync Probe] 2026-03-28T10:00:00Z',
          finalStageName: 'Cancelled',
          message: 'Odoo write probe completed.',
        };
      },
    },
  });

  const result = await service.runOdooTaskWriteProbe('session-token');

  assert.equal(called, true);
  assert.equal(result.probeTaskId, 501);
  assert.equal(result.mirroredTaskId, 7001);
  assert.equal(result.finalStageName, 'Cancelled');
});
