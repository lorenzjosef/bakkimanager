import type { BakkiTaskType, CreatePlantingPhaseRequest, PlantingWizardData } from '@bakki/domain';

export type PlantingWizardRenderState = 'loading' | 'unavailable' | 'ready';

export interface PlantingParticipantAssignmentDraft {
  areaId: string | null;
  trayCount: string;
}

export function resolvePlantingWizardRenderState(
  wizard: PlantingWizardData | null | undefined,
  isPending: boolean,
) {
  if (isPending && !wizard) {
    return 'loading' as const;
  }

  if (!wizard) {
    return 'unavailable' as const;
  }

  return 'ready' as const;
}

export function isPhaseInfoStepReady(
  phaseName: string,
  startDate: string,
  endDate: string,
  description: string,
) {
  return Boolean(phaseName.trim() && startDate && endDate && description.trim());
}

export function isPhaseTeamStepReady(participantIds: string[]) {
  return participantIds.length > 0;
}

export function isPhaseAreasStepReady(
  selectedAreaIds: string[],
  participantIds: string[],
  participantAssignmentsById: Record<string, PlantingParticipantAssignmentDraft>,
  areaSpeciesById: Record<string, string>,
) {
  return (
    selectedAreaIds.length > 0
    && participantIds.length > 0
    && participantIds.every((participantId) => {
      const contract = participantAssignmentsById[participantId];
      const areaId = contract?.areaId ?? '';
      return Boolean(
        areaId
        && selectedAreaIds.includes(areaId)
        && areaSpeciesById[areaId]?.trim()
        && contract.trayCount.trim()
        && Number(contract.trayCount) > 0,
      );
    })
  );
}

export function buildCreatePlantingPhasePayload(input: {
  phaseName: string;
  startDate: string;
  endDate: string;
  description: string;
  fieldLeadId: string;
  participantIds: string[];
  selectedAreaIds: string[];
  participantAssignmentsById: Record<string, PlantingParticipantAssignmentDraft>;
  areaSpeciesById: Record<string, string>;
  crewRotation: string;
  operationalNotes: string;
  taskType: BakkiTaskType;
}): CreatePlantingPhaseRequest {
  return {
    phaseName: input.phaseName,
    startDate: input.startDate,
    endDate: input.endDate,
    description: input.description,
    fieldLeadId: input.fieldLeadId,
    participantIds: input.participantIds,
    areaContracts: input.participantIds.map((participantId) => {
      const contract = input.participantAssignmentsById[participantId];
      const resolvedAreaId =
        contract?.areaId && input.selectedAreaIds.includes(contract.areaId)
          ? contract.areaId
          : input.selectedAreaIds[0] ?? '';
      return {
        areaId: resolvedAreaId,
        assignedUserProfileId: participantId,
        speciesRef: input.areaSpeciesById[resolvedAreaId] ?? '',
        trayCount: contract?.trayCount ? Number(contract.trayCount) : 0,
      };
    }),
    crewRotation: input.crewRotation,
    operationalNotes: input.operationalNotes,
    taskType: input.taskType,
  };
}

export function calculateAssignmentTreeCount(
  trayCount: string,
  treesPerTray: number | null | undefined,
) {
  const parsedTrayCount = Number(trayCount);

  if (
    !Number.isFinite(parsedTrayCount)
    || parsedTrayCount <= 0
    || typeof treesPerTray !== 'number'
    || !Number.isFinite(treesPerTray)
    || treesPerTray <= 0
  ) {
    return null;
  }

  return Math.round(parsedTrayCount * treesPerTray);
}
