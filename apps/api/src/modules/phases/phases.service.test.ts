import assert from 'node:assert/strict';
import test from 'node:test';
import { PhasesService } from './phases.service';

function createPhasesService(overrides?: {
  bakkiPhases?: {
    isConfigured?: () => boolean;
    listRecentPhases?: (limit: number) => Promise<unknown[]>;
  };
  bakkiUsers?: {
    isConfigured?: () => boolean;
  };
}) {
  return new PhasesService(
    {
      recordEvent: async () => {},
    } as never,
    {
      getSession: async () => ({ session: null }),
    } as never,
    {
      listByAreaRefs: async () => [],
    } as never,
    {
      getAreasByRefs: async () => new Map(),
    } as never,
    {
      getBySpeciesRef: async () => null,
      isConfigured: () => false,
    } as never,
    {
      isConfigured:
        overrides?.bakkiPhases?.isConfigured
        ?? (() => false),
      listContractsByPhaseIds: async () => new Map(),
      listParticipantsByPhaseIds: async () => new Map(),
      listRecentPhases:
        overrides?.bakkiPhases?.listRecentPhases
        ?? (async () => []),
    } as never,
    {
      isConfigured: () => false,
    } as never,
    {
      isConfigured:
        overrides?.bakkiUsers?.isConfigured
        ?? (() => false),
      listUsers: async () => [],
    } as never,
    {
      isConfigured: () => false,
    } as never,
  );
}

test('getOverview returns an honest empty live state when Bakki Core phases are configured but empty', async () => {
  const service = createPhasesService({
    bakkiPhases: {
      isConfigured: () => true,
      listRecentPhases: async () => [],
    },
    bakkiUsers: {
      isConfigured: () => true,
    },
  });

  const overview = await service.getOverview();

  assert.deepEqual(overview.phases, []);
  assert.equal(overview.selectedPhaseId, null);
  assert.equal(overview.teamTotal, '0');
  assert.equal(overview.soilTrackingValue, '0%');
  assert.equal(overview.liveChipLabel, 'Awaiting Phase');
});

test('createPhase rejects when the live phase write backend is not fully configured', async () => {
  const service = createPhasesService();

  await assert.rejects(
    () => service.createPhase({
      phaseName: 'Spring Run',
      startDate: '2026-03-29',
      endDate: '2026-04-02',
      description: 'Test phase',
      fieldLeadId: 'user-profile-1',
      participantIds: ['user-profile-1'],
      areaContracts: [
        {
          areaId: 'area-1',
          assignedUserProfileId: 'user-profile-1',
          speciesRef: 'downy-birch',
          trayCount: 18,
        },
      ],
    }),
    /Planting phase creation is unavailable until Bakki Core, user mirror, and Odoo are configured/,
  );
});
