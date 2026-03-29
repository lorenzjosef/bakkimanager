import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlantingWizardData } from '@bakki/domain';
import {
  buildCreatePlantingPhasePayload,
  isPhaseAreasStepReady,
  isPhaseInfoStepReady,
  isPhaseTeamStepReady,
  resolvePlantingWizardRenderState,
} from './planting-wizard.utils';

const wizardData: PlantingWizardData = {
  areas: {
    assignPersonnelPlaceholder: 'Assign planter',
    speciesPlaceholder: 'Select species',
    trayCountHelp: 'Assign trays to calculate the planted tree count automatically.',
    trayCountPlaceholder: 'Enter tray count',
    saplingCapacityValue: '3 mapped',
    selectedAreaName: 'Select an area',
    selectedAreaStatus: 'Choose a mapped contract area.',
    selectedPersonnel: [],
    soilCopy: 'Assign a planter, choose species, and define tray count before confirming the phase.',
    soilTitle: 'Area contract planning',
    totalAreaUnit: 'ha',
    totalAreaValue: '0',
  },
  confirm: {
    confirmLabel: 'Create Planting Phase',
    extraLabel: '3 personnel ready',
    teamMembers: [
      { avatarUrl: 'avatar-1', id: 'user-1', name: 'Owner One', role: 'Owner' },
    ],
    teamTitle: 'Assigned Team',
    title: 'Confirm Phase Setup',
    zoneCountLabel: '1 area',
    zones: [
      {
        area: '12.4 ha',
        goal: '1,200 trees',
        id: 'area-1',
        name: 'North Basin',
        species: [],
        subtitle: 'Zone: Zone 1',
      },
    ],
  },
  info: {
    descriptionPlaceholder: 'Describe the restoration objective.',
    endDatePlaceholder: 'YYYY-MM-DD',
    phaseNamePlaceholder: 'Enter phase name',
    startDatePlaceholder: 'YYYY-MM-DD',
  },
  team: {
    copy: 'Select the crew for the next planting phase. Area assignments happen in the following step.',
    coreCrew: ['Owner One'],
    crewRotation: '',
    extraLabel: '1 personnel available',
    fieldLead: 'Owner One',
    operationalNotes: '',
    planterAllocation: 'Select at least one owner or planter',
    policyCopy: 'Each contracted area must be assigned to one participant before the phase can be created.',
    policyTitle: 'Assignment policy',
    preparedCrew: [
      { avatarUrl: 'avatar-1', id: 'user-1', name: 'Owner One', role: 'Owner' },
    ],
    preparedCrewTitle: 'Available Team',
    summaryLeadCrew: '1 assigned',
    summaryPlanters: '0 assigned',
    title: 'Crew Setup',
  },
};

test('resolvePlantingWizardRenderState distinguishes loading, unavailable, and ready states', () => {
  assert.equal(resolvePlantingWizardRenderState(undefined, true), 'loading');
  assert.equal(resolvePlantingWizardRenderState(undefined, false), 'unavailable');
  assert.equal(resolvePlantingWizardRenderState(wizardData, false), 'ready');
});

test('wizard readiness helpers enforce phase info, team, and area contract requirements', () => {
  assert.equal(isPhaseInfoStepReady('', '2026-04-01', '2026-04-08', 'Phase copy'), false);
  assert.equal(isPhaseInfoStepReady('North Slope', '2026-04-01', '2026-04-08', '  '), false);
  assert.equal(isPhaseInfoStepReady('North Slope', '2026-04-01', '2026-04-08', 'Phase copy'), true);

  assert.equal(isPhaseTeamStepReady([]), false);
  assert.equal(isPhaseTeamStepReady(['user-1']), true);

  assert.equal(isPhaseAreasStepReady([], [], {}, {}), false);
  assert.equal(
    isPhaseAreasStepReady(['area-1'], ['user-1'], {
      'user-1': {
        areaId: 'area-1',
        trayCount: '',
      },
    }, {
      'area-1': '',
    }),
    false,
  );
  assert.equal(
    isPhaseAreasStepReady(['area-1'], ['user-1'], {
      'user-1': {
        areaId: 'area-1',
        trayCount: '12',
      },
    }, {
      'area-1': 'downy-birch',
    }),
    true,
  );
});

test('buildCreatePlantingPhasePayload maps selected area contracts and normalizes numeric fields', () => {
  assert.deepEqual(
    buildCreatePlantingPhasePayload({
      phaseName: 'North Slope Spring 2026',
      startDate: '2026-04-01',
      endDate: '2026-04-12',
      description: 'Restore the north slope contract sectors.',
      fieldLeadId: 'user-lead',
      participantIds: ['user-lead', 'user-planter'],
      selectedAreaIds: ['area-1', 'area-2'],
      participantAssignmentsById: {
        'user-planter': {
          areaId: 'area-1',
          trayCount: '12',
        },
        'user-lead': {
          areaId: 'area-2',
          trayCount: '8',
        },
      },
      areaSpeciesById: {
        'area-1': 'downy-birch',
        'area-2': 'sitka-spruce',
      },
      crewRotation: 'A / B rotation',
      operationalNotes: 'Watch the upper ridge wind exposure.',
      taskType: 'planting',
    }),
    {
      phaseName: 'North Slope Spring 2026',
      startDate: '2026-04-01',
      endDate: '2026-04-12',
      description: 'Restore the north slope contract sectors.',
      fieldLeadId: 'user-lead',
      participantIds: ['user-lead', 'user-planter'],
      areaContracts: [
        {
          areaId: 'area-2',
          assignedUserProfileId: 'user-lead',
          speciesRef: 'sitka-spruce',
          trayCount: 8,
        },
        {
          areaId: 'area-1',
          assignedUserProfileId: 'user-planter',
          speciesRef: 'downy-birch',
          trayCount: 12,
        },
      ],
      crewRotation: 'A / B rotation',
      operationalNotes: 'Watch the upper ridge wind exposure.',
      taskType: 'planting',
    },
  );
});
