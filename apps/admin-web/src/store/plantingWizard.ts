import { create } from 'zustand';
import type { BakkiTaskType, PlantingWizardData } from '@bakki/domain';

interface AreaContractDraft {
  areaId: string | null;
  trayCount: string;
}

interface PlantingWizardDraftState {
  initialized: boolean;
  phaseName: string;
  startDate: string;
  endDate: string;
  description: string;
  fieldLeadId: string | null;
  participantIds: string[];
  crewRotation: string;
  operationalNotes: string;
  selectedAreaIds: string[];
  participantAssignmentsById: Record<string, AreaContractDraft>;
  areaSpeciesById: Record<string, string>;
  activeAreaId: string | null;
  taskType: BakkiTaskType;
  hydrateFromData: (wizard: PlantingWizardData) => void;
  reset: () => void;
  setPhaseName: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setDescription: (value: string) => void;
  toggleParticipant: (value: string) => void;
  setCrewRotation: (value: string) => void;
  setOperationalNotes: (value: string) => void;
  toggleArea: (value: string) => void;
  setActiveAreaId: (value: string) => void;
  setTaskType: (value: BakkiTaskType) => void;
  setAreaSpecies: (areaId: string, speciesRef: string) => void;
  setParticipantArea: (participantId: string, areaId: string) => void;
  setParticipantTrayCount: (participantId: string, value: string) => void;
}

const initialState = {
  initialized: false,
  phaseName: '',
  startDate: '',
  endDate: '',
  description: '',
  fieldLeadId: null,
  participantIds: [] as string[],
  crewRotation: '',
  operationalNotes: '',
  selectedAreaIds: [] as string[],
  participantAssignmentsById: {} as Record<string, AreaContractDraft>,
  areaSpeciesById: {} as Record<string, string>,
  activeAreaId: null as string | null,
  taskType: 'planting' as BakkiTaskType,
};

function createParticipantAssignmentDraft(areaId: string | null): AreaContractDraft {
  return {
    areaId,
    trayCount: '',
  };
}

export const usePlantingWizardStore = create<PlantingWizardDraftState>((set) => ({
  ...initialState,
  hydrateFromData: (wizard) =>
    set((state) => {
      if (state.initialized) {
        return state;
      }

      const availableMembers = wizard.confirm.teamMembers.length > 0
        ? wizard.confirm.teamMembers
        : wizard.team.preparedCrew;
      const availableAreas = wizard.confirm.zones;
      const defaultFieldLeadId = null;
      const defaultParticipantIds: string[] = [];
      const defaultAreaIds = availableAreas[0] ? [availableAreas[0].id] : [];
      const defaultAreaSpecies = Object.fromEntries(
        availableAreas.map((area) => [area.id, area.assignedSpeciesRef ?? '']),
      ) as Record<string, string>;
      const defaultParticipantAssignments = Object.fromEntries(
        defaultParticipantIds.map((participantId) => [
          participantId,
          createParticipantAssignmentDraft(defaultAreaIds[0] ?? null),
        ]),
      ) as Record<string, AreaContractDraft>;

      return {
        initialized: true,
        phaseName: '',
        startDate: '',
        endDate: '',
        description: '',
        fieldLeadId: defaultFieldLeadId,
        participantIds: defaultParticipantIds,
        crewRotation: wizard.team.crewRotation,
        operationalNotes: wizard.team.operationalNotes,
        selectedAreaIds: defaultAreaIds,
        participantAssignmentsById: defaultParticipantAssignments,
        areaSpeciesById: defaultAreaSpecies,
        activeAreaId: defaultAreaIds[0] ?? null,
        taskType: 'planting',
      };
    }),
  reset: () => set(initialState),
  setPhaseName: (value) => set((state) => (state.phaseName === value ? state : { phaseName: value })),
  setStartDate: (value) => set((state) => (state.startDate === value ? state : { startDate: value })),
  setEndDate: (value) => set((state) => (state.endDate === value ? state : { endDate: value })),
  setDescription: (value) => set((state) => (state.description === value ? state : { description: value })),
  toggleParticipant: (value) =>
    set((state) => {
      const isSelected = state.participantIds.includes(value);
      const nextParticipantIds = isSelected
        ? state.participantIds.filter((entry) => entry !== value)
        : [...state.participantIds, value];
      const nextFieldLeadId =
        state.fieldLeadId === value && isSelected
          ? nextParticipantIds[0] ?? null
          : state.fieldLeadId ?? nextParticipantIds[0] ?? null;
      const fallbackAreaId = state.selectedAreaIds[0] ?? state.activeAreaId ?? null;

      const nextAssignments = Object.fromEntries(
        nextParticipantIds.map((participantId) => [
          participantId,
          state.participantAssignmentsById[participantId] ?? createParticipantAssignmentDraft(fallbackAreaId),
        ]),
      ) as Record<string, AreaContractDraft>;

      return {
        participantIds: nextParticipantIds,
        fieldLeadId: nextFieldLeadId,
        participantAssignmentsById: nextAssignments,
      };
    }),
  setCrewRotation: (value) =>
    set((state) => (state.crewRotation === value ? state : { crewRotation: value })),
  setOperationalNotes: (value) =>
    set((state) => (state.operationalNotes === value ? state : { operationalNotes: value })),
  toggleArea: (value) =>
    set((state) => {
      const isSelected = state.selectedAreaIds.includes(value);
      const nextAreaIds = isSelected
        ? state.selectedAreaIds.filter((entry) => entry !== value)
        : [...state.selectedAreaIds, value];
      const nextActiveAreaId =
        state.activeAreaId === value && isSelected
          ? nextAreaIds[0] ?? null
          : state.activeAreaId ?? value;
      const fallbackAreaId = nextAreaIds[0] ?? null;

      return {
        selectedAreaIds: nextAreaIds,
        activeAreaId: nextActiveAreaId,
        areaSpeciesById: state.areaSpeciesById[value]
          ? state.areaSpeciesById
          : {
              ...state.areaSpeciesById,
              [value]: '',
            },
        participantAssignmentsById: Object.fromEntries(
          Object.entries(state.participantAssignmentsById).map(([participantId, contract]) => [
            participantId,
            {
              ...contract,
              areaId:
                contract.areaId === value && isSelected
                  ? fallbackAreaId
                  : contract.areaId ?? (!isSelected ? value : fallbackAreaId),
            },
          ]),
        ),
      };
    }),
  setActiveAreaId: (value) =>
    set((state) => {
      if (state.activeAreaId === value) {
        return state;
      }

      return { activeAreaId: value };
    }),
  setTaskType: (value) => set((state) => (state.taskType === value ? state : { taskType: value })),
  setAreaSpecies: (areaId, speciesRef) =>
    set((state) => ({
      areaSpeciesById: {
        ...state.areaSpeciesById,
        [areaId]: speciesRef,
      },
    })),
  setParticipantArea: (participantId, areaId) =>
    set((state) => ({
      participantAssignmentsById: {
        ...state.participantAssignmentsById,
        [participantId]: {
          areaId,
          trayCount: state.participantAssignmentsById[participantId]?.trayCount ?? '',
        },
      },
    })),
  setParticipantTrayCount: (participantId, value) =>
    set((state) => ({
      participantAssignmentsById: {
        ...state.participantAssignmentsById,
        [participantId]: {
          areaId:
            state.participantAssignmentsById[participantId]?.areaId
            ?? state.selectedAreaIds[0]
            ?? state.activeAreaId
            ?? null,
          trayCount: value,
        },
      },
    })),
}));
