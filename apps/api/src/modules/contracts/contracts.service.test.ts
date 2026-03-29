import assert from 'node:assert/strict';
import test from 'node:test';
import { ContractsService } from './contracts.service';

function createContractsService(overrides: Partial<{
  bakkiAreaMetrics: {
    isConfigured: () => boolean;
    listByAreaRefs: (areaRefs: string[]) => Promise<Array<{
      areaRef: string;
      currentTreeCount: number | null;
    }>>;
  };
  bakkiGeometry: {
    listAreas: () => Promise<Map<string, { areaRef: string; areaName: string; zoneRef: string }>>;
    listZoneSummaries: () => Promise<Array<{ id: string; name: string }>>;
  };
  bakkiPhases: {
    getLatestContractsByAreaRefs: (areaRefs: string[]) => Promise<Map<string, { contractTreeGoal: number | null }>>;
    isConfigured: () => boolean;
  };
}> = {}) {
  return new ContractsService(
    (overrides.bakkiAreaMetrics ?? {
      isConfigured: () => false,
      listByAreaRefs: async () => [],
    }) as never,
    (overrides.bakkiGeometry ?? {
      listAreas: async () => new Map(),
      listZoneSummaries: async () => [],
    }) as never,
    (overrides.bakkiPhases ?? {
      getLatestContractsByAreaRefs: async () => new Map(),
      isConfigured: () => false,
    }) as never,
  );
}

test('getSummary aggregates area tree counts into zones and lets over-fulfilled zones compensate globally', async () => {
  const service = createContractsService({
    bakkiAreaMetrics: {
      isConfigured: () => true,
      listByAreaRefs: async () => [
        { areaRef: 'area-1a', currentTreeCount: 30000 },
        { areaRef: 'area-1b', currentTreeCount: 30000 },
        { areaRef: 'area-2a', currentTreeCount: 60000 },
      ],
    },
    bakkiGeometry: {
      listAreas: async () => new Map([
        ['area-1a', { areaRef: 'area-1a', areaName: 'North Bench', zoneRef: 'zone-1' }],
        ['area-1b', { areaRef: 'area-1b', areaName: 'Creek Shelf', zoneRef: 'zone-1' }],
        ['area-2a', { areaRef: 'area-2a', areaName: 'South Rise', zoneRef: 'zone-2' }],
      ]),
      listZoneSummaries: async () => [
        { id: 'zone-1', name: 'Zone 1' },
        { id: 'zone-2', name: 'Zone 2' },
      ],
    },
    bakkiPhases: {
      getLatestContractsByAreaRefs: async () => new Map([
        ['area-1a', { contractTreeGoal: 35000 }],
        ['area-1b', { contractTreeGoal: 35000 }],
        ['area-2a', { contractTreeGoal: 50000 }],
      ]),
      isConfigured: () => true,
    },
  });

  const summary = await service.getSummary();

  assert.equal(summary.globalGoalTreeCount, 120000);
  assert.equal(summary.globalPlantedTreeCount, 120000);
  assert.equal(summary.globalFulfillmentPercent, 100);
  assert.deepEqual(summary.zones.map((zone) => ({
    zoneId: zone.zoneId,
    goal: zone.goalTreeCount,
    planted: zone.plantedTreeCount,
    fulfillment: zone.fulfillmentPercent,
  })), [
    { zoneId: 'zone-1', goal: 70000, planted: 60000, fulfillment: 86 },
    { zoneId: 'zone-2', goal: 50000, planted: 60000, fulfillment: 120 },
  ]);
});
