import assert from 'node:assert/strict';
import test from 'node:test';
import { GLOBAL_RANCH_CONTRACT_TREE_GOAL } from '@bakki/domain';
import { DashboardService } from './dashboard.service';

function createDashboardService(overrides: Partial<{
  bakkiAreaMetrics: {
    isConfigured: () => boolean;
    listByZoneRefs: (zoneRefs: string[]) => Promise<Array<{
      currentDensityPer100Sqm: number;
      zoneRef: string | null;
    }>>;
  };
  bakkiGeometry: {
    getRanchCoordinateLabel: () => Promise<string | null>;
    isConfigured: () => boolean;
    listZoneSummaries: () => Promise<Array<{ id: string; areaCount?: number }>>;
  };
  bakkiPhases: {
    getActivePhaseMetrics: () => Promise<{
      averageDensity: number | null;
      fulfillmentPercent: number | null;
      name: string | null;
      totalContractGoal: number;
    } | null>;
    isConfigured: () => boolean;
  };
  bakkiSpecies: {
    isConfigured: () => boolean;
    listSpecies: () => Promise<Array<{ speciesRef: string }>>;
  };
  bakkiTasks: {
    isConfigured: () => boolean;
    listByOdooTaskIds: (ids: number[]) => Promise<Map<number, { areaRef: string | null; taskType: string | null }>>;
    listProgramCandidates: (today: string, limit: number) => Promise<Array<{
      areaRef: string | null;
      dueAt: string | null;
      odooTaskId: number;
      taskType: string | null;
      title: string;
    }>>;
  };
  dashboardWeather: {
    getCurrentConditions: () => Promise<{
      conditionsCopy: string;
      conditionsValue: string;
    } | null>;
  };
  contractsService: {
    getSummary: () => Promise<{
      globalFulfillmentPercent: number;
      globalGoalTreeCount: number;
      globalPlantedTreeCount: number;
      zones: unknown[];
    }>;
  };
  odoo: {
    isConfigured: () => boolean;
    searchRead: <T>() => Promise<T[]>;
  };
}> = {}) {
  return new DashboardService(
    (overrides.bakkiAreaMetrics ?? {
      isConfigured: () => false,
      listByZoneRefs: async () => [],
    }) as any,
    (overrides.bakkiGeometry ?? {
      getRanchCoordinateLabel: async () => null,
      isConfigured: () => false,
      listZoneSummaries: async () => [],
    }) as any,
    (overrides.bakkiPhases ?? {
      isConfigured: () => false,
      getActivePhaseMetrics: async () => null,
    }) as any,
    (overrides.bakkiSpecies ?? {
      isConfigured: () => false,
      listSpecies: async () => [],
    }) as any,
    (overrides.bakkiTasks ?? {
      isConfigured: () => false,
      listProgramCandidates: async () => [],
      listByOdooTaskIds: async () => new Map(),
    }) as any,
    (overrides.odoo ?? {
      isConfigured: () => false,
      searchRead: async <T>() => [] as T[],
    }) as any,
    (overrides.dashboardWeather ?? {
      getCurrentConditions: async () => null,
    }) as any,
    (overrides.contractsService ?? {
      getSummary: async () => ({
        globalFulfillmentPercent: 0,
        globalGoalTreeCount: GLOBAL_RANCH_CONTRACT_TREE_GOAL,
        globalPlantedTreeCount: 0,
        zones: [],
      }),
    }) as any,
  );
}

test('getSummary uses live weather conditions when the weather feed is available', async () => {
  const service = createDashboardService({
    dashboardWeather: {
      getCurrentConditions: async () => ({
        conditionsValue: '9C / Overcast',
        conditionsCopy: 'Wind: 18km/h NW',
      }),
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.conditionsValue, '9C / Overcast');
  assert.equal(summary.conditionsCopy, 'Wind: 18km/h NW');
});

test('getSummary reports unavailable weather when the weather feed cannot be resolved', async () => {
  const service = createDashboardService();

  const summary = await service.getSummary();

  assert.equal(summary.conditionsValue, 'Unavailable');
  assert.equal(summary.conditionsCopy, 'Weather feed unavailable');
});

test('getSummary defaults biodiversity to zero when Bakki Core species are not configured', async () => {
  const service = createDashboardService();

  const summary = await service.getSummary();

  assert.equal(summary.biodiversityActiveSpecies, '0');
  assert.equal(summary.biodiversityStackCount, '+0');
});

test('getSummary uses live ranch coordinates when geometry can provide them', async () => {
  const service = createDashboardService({
    bakkiGeometry: {
      getRanchCoordinateLabel: async () => '63.9012 N, 21.4456 W',
      isConfigured: () => true,
      listZoneSummaries: async () => [],
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.activeZonesCoordinatesValue, '63.9012 N, 21.4456 W');
});

test('getSummary reports unavailable coordinates when geometry cannot provide them', async () => {
  const service = createDashboardService({
    bakkiGeometry: {
      getRanchCoordinateLabel: async () => null,
      isConfigured: () => true,
      listZoneSummaries: async () => [],
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.activeZonesCoordinatesValue, 'Unavailable');
});

test('getSummary uses Bakki Core species count for biodiversity when configured', async () => {
  const service = createDashboardService({
    bakkiSpecies: {
      isConfigured: () => true,
      listSpecies: async () => [
        { speciesRef: 'species-1' },
        { speciesRef: 'species-2' },
        { speciesRef: 'species-3' },
        { speciesRef: 'species-4' },
        { speciesRef: 'species-5' },
        { speciesRef: 'species-6' },
      ],
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.biodiversityActiveSpecies, '6');
  assert.equal(summary.biodiversityStackCount, '+3');
});

test('getSummary reports zero active zones honestly when configured geometry has no persisted zones', async () => {
  const service = createDashboardService({
    bakkiAreaMetrics: {
      isConfigured: () => true,
      listByZoneRefs: async () => [],
    },
    bakkiGeometry: {
      getRanchCoordinateLabel: async () => null,
      isConfigured: () => true,
      listZoneSummaries: async () => [],
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.activeZonesTitle, '0 Active Zones');
  assert.equal(summary.activeZonesStatus, 'Avg. Density Unavailable');
});

test('getSummary leaves the program empty when Bakki task mirrors are configured but no tasks exist for today', async () => {
  const service = createDashboardService({
    bakkiTasks: {
      isConfigured: () => true,
      listProgramCandidates: async () => [],
      listByOdooTaskIds: async () => new Map(),
    },
  });

  const summary = await service.getSummary();

  assert.deepEqual(summary.programItems, []);
});

test('getSummary maps live task records into dashboard program items', async () => {
  const service = createDashboardService({
    bakkiTasks: {
      isConfigured: () => true,
      listProgramCandidates: async () => [
        {
          odooTaskId: 41,
          title: 'Density pass',
          dueAt: '2026-03-29T08:00:00.000Z',
          taskType: 'monitoring',
          areaRef: 'area-1',
        },
      ],
      listByOdooTaskIds: async () => new Map(),
    },
  });

  const summary = await service.getSummary();

  assert.deepEqual(summary.programItems, [
    {
      id: 'project-task-41',
      title: 'Monitoring: Density pass',
      subtitle: 'area-1',
      timeLabel: '2026-03-29',
      assigneeLabel: 'Assignee unavailable',
      icon: 'leaf',
      accent: 'green',
    },
  ]);
});

test('getSummary reports no active phase honestly when Bakki Core phases are configured but empty', async () => {
  const service = createDashboardService({
    bakkiAreaMetrics: {
      isConfigured: () => true,
      listByZoneRefs: async () => [
        { zoneRef: 'zone-1', currentDensityPer100Sqm: 20 },
        { zoneRef: 'zone-2', currentDensityPer100Sqm: 30 },
      ],
    },
    bakkiGeometry: {
      getRanchCoordinateLabel: async () => null,
      isConfigured: () => true,
      listZoneSummaries: async () => [{ id: 'zone-1' }, { id: 'zone-2' }],
    },
    bakkiPhases: {
      isConfigured: () => true,
      getActivePhaseMetrics: async () => null,
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.activePhase.name, 'No active planting phase');
  assert.equal(summary.activePhase.heroMetricValue, '0%');
  assert.equal(summary.activePhase.primaryMetricValue, '0 trees');
  assert.equal(summary.activePhase.secondaryMetricValue, '25 / 100m²');
  assert.equal(summary.activeZonesStatus, 'Avg. Density 25 / 100m²');
});

test('getSummary reports zero fulfillment and zero contract goal honestly for active phases', async () => {
  const service = createDashboardService({
    bakkiAreaMetrics: {
      isConfigured: () => true,
      listByZoneRefs: async () => [{ zoneRef: 'zone-1', currentDensityPer100Sqm: 18 }],
    },
    bakkiGeometry: {
      getRanchCoordinateLabel: async () => null,
      isConfigured: () => true,
      listZoneSummaries: async () => [{ id: 'zone-1' }],
    },
    bakkiPhases: {
      isConfigured: () => true,
      getActivePhaseMetrics: async () => ({
        averageDensity: null,
        fulfillmentPercent: null,
        name: 'Spring Contracts',
        totalContractGoal: 0,
      }),
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.activePhase.name, 'Spring Contracts');
  assert.equal(summary.activePhase.heroMetricValue, '0%');
  assert.equal(summary.activePhase.primaryMetricValue, '0 trees');
  assert.equal(summary.activePhase.secondaryMetricValue, '18 / 100m²');
});

test('getSummary maps ranch contract completion onto the dashboard summary', async () => {
  const service = createDashboardService({
    contractsService: {
      getSummary: async () => ({
        globalFulfillmentPercent: 73,
        globalGoalTreeCount: GLOBAL_RANCH_CONTRACT_TREE_GOAL,
        globalPlantedTreeCount: 87600,
        zones: [],
      }),
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.contractCompletionLabel, 'Global Contract');
  assert.equal(summary.contractCompletionValue, '73%');
  assert.equal(summary.contractCompletionCopy, '87,600 of 120,000 trees planted across all zones.');
});
