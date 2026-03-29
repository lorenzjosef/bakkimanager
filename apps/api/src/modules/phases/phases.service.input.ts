import { BadRequestException } from '@nestjs/common';
import type { CreatePlantingPhaseRequest } from '@bakki/domain';

export interface NormalizedCreatePhaseInput {
  areaContracts: Array<{
    areaId: string;
    assignedUserProfileId: string;
    speciesRef: string;
    trayCount: number;
  }>;
  crewRotation?: string;
  description: string;
  endDate: string;
  fieldLeadId: string;
  operationalNotes?: string;
  participantIds: string[];
  phaseName: string;
  startDate: string;
  taskType: CreatePlantingPhaseRequest['taskType'];
}

export function normalizeCreatePhaseInput(input: CreatePlantingPhaseRequest): NormalizedCreatePhaseInput {
  const participantIds = Array.from(
    new Set(input.participantIds.map((value) => value.trim()).filter(Boolean)),
  );
  const areaContracts = input.areaContracts
    .map((contract) => ({
      areaId: contract.areaId.trim(),
      assignedUserProfileId: contract.assignedUserProfileId.trim(),
      speciesRef: contract.speciesRef.trim(),
      trayCount:
        typeof contract.trayCount === 'number' && Number.isFinite(contract.trayCount)
          ? contract.trayCount
          : Number.NaN,
    }))
    .filter((contract) => contract.areaId && contract.assignedUserProfileId && contract.speciesRef);
  const startDate = input.startDate.trim();
  const endDate = input.endDate.trim();

  if (!input.phaseName.trim()) {
    throw new BadRequestException('Phase name is required.');
  }

  if (!startDate || !endDate) {
    throw new BadRequestException('Start date and end date are required.');
  }

  const parsedStartDate = Date.parse(startDate);
  const parsedEndDate = Date.parse(endDate);

  if (Number.isNaN(parsedStartDate) || Number.isNaN(parsedEndDate)) {
    throw new BadRequestException('Start date and end date must be valid dates.');
  }

  if (parsedEndDate < parsedStartDate) {
    throw new BadRequestException('End date must be on or after the start date.');
  }

  if (!input.fieldLeadId.trim()) {
    throw new BadRequestException('A field lead must be selected.');
  }

  if (participantIds.length === 0) {
    throw new BadRequestException('At least one team member must be assigned.');
  }

  if (areaContracts.length === 0) {
    throw new BadRequestException('At least one area contract must be selected.');
  }

  for (const contract of areaContracts) {
    if (!participantIds.includes(contract.assignedUserProfileId)) {
      throw new BadRequestException(
        'Each contracted area must be assigned to a planter selected in the phase team.',
      );
    }

    if (
      typeof contract.trayCount !== 'number'
      || !Number.isFinite(contract.trayCount)
      || contract.trayCount <= 0
    ) {
      throw new BadRequestException(
        'Each area assignment must include a positive tray count.',
      );
    }
  }

  return {
    phaseName: input.phaseName.trim(),
    startDate,
    endDate,
    description: input.description.trim(),
    fieldLeadId: input.fieldLeadId.trim(),
    participantIds,
    areaContracts,
    crewRotation: input.crewRotation?.trim() || undefined,
    operationalNotes: input.operationalNotes?.trim() || undefined,
    taskType: input.taskType,
  };
}

export function parseNumericId(value: string, prefix: string) {
  if (!value.startsWith(prefix)) {
    return null;
  }

  const numeric = Number(value.slice(prefix.length));
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}
