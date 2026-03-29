import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlantingWizardData } from '@bakki/domain';
import { usePlantingWizardStore } from './plantingWizard';

const wizardData: PlantingWizardData = {
  areas: {
    assignPersonnelPlaceholder: 'Assign planter',
    speciesPlaceholder: 'Select species',
    trayCountHelp: 'Assign trays to calculate the planted tree count automatically.',
    trayCountPlaceholder: 'Enter tray count',
    saplingCapacityValue: '3 mapped',
    selectedAreaName: 'Select an area',
    selectedAreaStatus: 'Choose a mapped contract area.',
    selectedPersonnel: ['Owner One', 'Planter One'],
    soilCopy: 'Assign a planter, choose species, and define tray count before confirming the phase.',
    soilTitle: 'Area contract planning',
    totalAreaUnit: 'ha',
    totalAreaValue: '0',
  },
  confirm: {
    confirmLabel: 'Create Planting Phase',
    extraLabel: '3 personnel ready',
    teamMembers: [
      { avatarUrl: 'avatar-1', id: 'user-profile-1', name: 'Owner One', role: 'Owner' },
      { avatarUrl: 'avatar-2', id: 'user-profile-2', name: 'Planter One', role: 'Planter' },
      { avatarUrl: 'avatar-3', id: 'user-profile-3', name: 'Planter Two', role: 'Planter' },
    ],
    teamTitle: 'Assigned Team',
    title: 'Confirm Phase Setup',
    zoneCountLabel: '3 areas',
    zones: [
      {
        area: '12.4 ha',
        assignedSpeciesRef: 'downy-birch',
        goal: '1,200 trees',
        id: 'area-1',
        name: 'North Basin',
        species: [],
        subtitle: 'Zone: Zone 1',
      },
      {
        area: '8.9 ha',
        goal: '900 trees',
        id: 'area-2',
        name: 'East Ridge',
        species: [],
        subtitle: 'Zone: Zone 2',
      },
      {
        area: '6.2 ha',
        goal: 'Goal not set',
        id: 'area-3',
        name: 'South Rim',
        species: [],
        subtitle: 'Zone: Zone 3',
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
    coreCrew: ['Owner One', 'Planter One', 'Planter Two'],
    crewRotation: '',
    extraLabel: '3 personnel available',
    fieldLead: 'Owner One',
    operationalNotes: '',
    planterAllocation: 'Select at least one owner or planter',
    policyCopy: 'Each contracted area must be assigned to one participant before the phase can be created.',
    policyTitle: 'Assignment policy',
    preparedCrew: [
      { avatarUrl: 'avatar-1', id: 'user-profile-1', name: 'Owner One', role: 'Owner' },
      { avatarUrl: 'avatar-2', id: 'user-profile-2', name: 'Planter One', role: 'Planter' },
      { avatarUrl: 'avatar-3', id: 'user-profile-3', name: 'Planter Two', role: 'Planter' },
    ],
    preparedCrewTitle: 'Available Team',
    summaryLeadCrew: '1 assigned',
    summaryPlanters: '2 assigned',
    title: 'Crew Setup',
  },
};

test.beforeEach(() => {
  usePlantingWizardStore.getState().reset();
});

test.afterEach(() => {
  usePlantingWizardStore.getState().reset();
});

test('hydrateFromData initializes the wizard without preselecting participants', () => {
  const store = usePlantingWizardStore.getState();
  store.hydrateFromData(wizardData);

  const hydrated = usePlantingWizardStore.getState();

  assert.equal(hydrated.initialized, true);
  assert.equal(hydrated.fieldLeadId, null);
  assert.deepEqual(hydrated.participantIds, []);
  assert.deepEqual(
    hydrated.selectedAreaIds,
    wizardData.confirm.zones[0] ? [wizardData.confirm.zones[0].id] : [],
  );
  assert.equal(hydrated.activeAreaId, wizardData.confirm.zones[0]?.id ?? null);
  assert.deepEqual(hydrated.participantAssignmentsById, {});
  assert.equal(hydrated.areaSpeciesById[wizardData.confirm.zones[0]!.id], 'downy-birch');

  const firstSnapshot = {
    fieldLeadId: hydrated.fieldLeadId,
    participantIds: hydrated.participantIds,
  };

  store.hydrateFromData(wizardData);

  const secondHydration = usePlantingWizardStore.getState();
  assert.deepEqual(
    {
      fieldLeadId: secondHydration.fieldLeadId,
      participantIds: secondHydration.participantIds,
    },
    firstSnapshot,
  );
});

test('toggleParticipant removes the dropped participant assignment and preserves the remaining roster', () => {
  usePlantingWizardStore.getState().hydrateFromData(wizardData);
  usePlantingWizardStore.getState().toggleParticipant('user-profile-1');
  usePlantingWizardStore.getState().toggleParticipant('user-profile-2');

  const stateBefore = usePlantingWizardStore.getState();
  const removedLeadId = stateBefore.participantIds[0]!;
  const fallbackLeadId = stateBefore.participantIds[1]!;
  usePlantingWizardStore.getState().toggleParticipant(removedLeadId);

  const stateAfter = usePlantingWizardStore.getState();
  assert.equal(stateAfter.fieldLeadId, fallbackLeadId);
  assert.equal(stateAfter.participantIds.includes(removedLeadId), false);
  assert.equal(stateAfter.participantAssignmentsById[removedLeadId], undefined);
  assert.equal(
    stateAfter.participantAssignmentsById[fallbackLeadId]?.areaId,
    stateBefore.participantAssignmentsById[fallbackLeadId]?.areaId ?? stateBefore.selectedAreaIds[0] ?? null,
  );
});

test('toggleArea rehomes participant assignments when a selected area is removed', () => {
  usePlantingWizardStore.getState().hydrateFromData(wizardData);
  usePlantingWizardStore.getState().toggleParticipant('user-profile-1');

  const initialState = usePlantingWizardStore.getState();
  const initialAreaId = initialState.selectedAreaIds[0]!;
  const nextAreaId = wizardData.confirm.zones.find((zone) => zone.id !== initialAreaId)!.id;
  const firstParticipantId = initialState.participantIds[0]!;

  usePlantingWizardStore.getState().toggleArea(nextAreaId);
  const stateWithSecondArea = usePlantingWizardStore.getState();
  assert.equal(stateWithSecondArea.selectedAreaIds.includes(nextAreaId), true);

  usePlantingWizardStore.getState().setParticipantArea(firstParticipantId, initialAreaId);

  usePlantingWizardStore.getState().toggleArea(initialAreaId);
  const stateAfterRemoval = usePlantingWizardStore.getState();
  assert.equal(stateAfterRemoval.selectedAreaIds.includes(initialAreaId), false);
  assert.equal(stateAfterRemoval.activeAreaId, nextAreaId);
  assert.equal(stateAfterRemoval.participantAssignmentsById[firstParticipantId]?.areaId, nextAreaId);
});

test('area species and participant tray setters preserve the selected-area fallback', () => {
  usePlantingWizardStore.getState().hydrateFromData(wizardData);
  usePlantingWizardStore.getState().toggleParticipant('user-profile-1');
  usePlantingWizardStore.getState().toggleParticipant('user-profile-2');

  const state = usePlantingWizardStore.getState();
  const targetAreaId = state.selectedAreaIds[0]!;
  const targetParticipantId = state.participantIds[1]!;
  const expectedAreaId = state.participantAssignmentsById[targetParticipantId]?.areaId
    ?? state.selectedAreaIds[0]
    ?? state.activeAreaId
    ?? null;

  usePlantingWizardStore.getState().setAreaSpecies(targetAreaId, 'downy-birch');
  usePlantingWizardStore.getState().setParticipantTrayCount(targetParticipantId, '24');

  const updated = usePlantingWizardStore.getState().participantAssignmentsById[targetParticipantId];
  assert.equal(updated.trayCount, '24');
  assert.equal(updated.areaId, expectedAreaId);
  assert.equal(usePlantingWizardStore.getState().areaSpeciesById[targetAreaId], 'downy-birch');
});
