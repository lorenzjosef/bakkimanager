import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { Logger } from '@nestjs/common';
import type {
  CreatePlantingPhaseRequest,
  CreatePlantingPhaseResponse,
} from '@bakki/domain';
import type { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import type { BakkiPhaseService } from '../../bakki-core/bakki-phase.service';
import type { BakkiSpeciesService } from '../../bakki-core/bakki-species.service';
import type { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import type { OdooService } from '../../odoo/odoo.service';
import type { AuditService } from '../audit/audit.service';
import type { AuthService } from '../auth/auth.service';
import { requireOwnerSessionActor } from '../auth/owner-session.helpers';
import {
  normalizeCreatePhaseInput,
  parseNumericId,
} from './phases.service.helpers';

interface PhaseMutationDeps {
  auditService: AuditService;
  authService: AuthService;
  bakkiGeometry: Pick<BakkiGeometryService, 'getAreasByRefs'>;
  bakkiPhases: Pick<BakkiPhaseService, 'createPhase' | 'isConfigured'>;
  bakkiSpecies: Pick<BakkiSpeciesService, 'getBySpeciesRef' | 'isConfigured'>;
  bakkiUsers: Pick<BakkiUserMirrorService, 'getById' | 'isConfigured'>;
  logger: Pick<Logger, 'error'>;
  odoo: Pick<OdooService, 'isConfigured'>;
}

export async function createPhase(
  deps: PhaseMutationDeps,
  input: CreatePlantingPhaseRequest,
  sessionToken?: string,
): Promise<CreatePlantingPhaseResponse> {
  const normalized = normalizeCreatePhaseInput(input);
  if (!hasLivePhaseWriteBackend(deps)) {
    throw new ServiceUnavailableException(
      'Planting phase creation is unavailable until Bakki Core, user mirror, and Odoo are configured.',
    );
  }

  const actor = await requireOwnerSessionActor({
    authService: deps.authService,
    sessionToken,
    unauthorizedMessage: 'Only Bakki owners can create planting phases',
  });

  const fieldLeadUserId = parseNumericId(normalized.fieldLeadId, 'user-profile-');
  const participantUserIds = normalized.participantIds
    .map((value) => parseNumericId(value, 'user-profile-'))
    .filter((value): value is number => value !== null);
  const areaContracts = normalized.areaContracts.map((contract, index) => {
    const assignedUserId = parseNumericId(
      contract.assignedUserProfileId,
      'user-profile-',
    );

    if (!contract.areaId || !assignedUserId) {
      throw new BadRequestException(
        `Area contract ${index + 1} contains invalid area or assigned-user references.`,
      );
    }

    return {
      areaRef: contract.areaId,
      assignedUserId,
      speciesRef: contract.speciesRef,
      trayCount: Math.round(contract.trayCount),
    };
  });

  if (
    !fieldLeadUserId
    || participantUserIds.length === 0
    || areaContracts.length === 0
  ) {
    throw new BadRequestException('Phase references are invalid for Bakki Core-backed creation.');
  }

  if (!participantUserIds.includes(fieldLeadUserId)) {
    participantUserIds.unshift(fieldLeadUserId);
  }

  for (const contract of areaContracts) {
    if (!participantUserIds.includes(contract.assignedUserId)) {
      participantUserIds.push(contract.assignedUserId);
    }
  }

  try {
    const resolvedUsers = await Promise.all(
      Array.from(
        new Set([fieldLeadUserId, ...participantUserIds, ...areaContracts.map((contract) => contract.assignedUserId)]),
      ).map(async (userId) => ({
        userId,
        mirror: await deps.bakkiUsers.getById(userId),
      })),
    );

    for (const { userId, mirror } of resolvedUsers) {
      if (!mirror || !mirror.active) {
        throw new BadRequestException(`Referenced user ${userId} is not available for phase assignment.`);
      }
    }

    const areasByRef = await deps.bakkiGeometry.getAreasByRefs(
      areaContracts.map((contract) => contract.areaRef),
    );
    for (const contract of areaContracts) {
      if (!areasByRef.has(contract.areaRef)) {
        throw new BadRequestException(`Referenced area ${contract.areaRef} is not available for phase assignment.`);
      }
    }

    const resolvedSpecies = await Promise.all(
      Array.from(new Set(areaContracts.map((contract) => contract.speciesRef))).map(async (speciesRef) => ({
        speciesRef,
        species: await deps.bakkiSpecies.getBySpeciesRef(speciesRef),
      })),
    );
    const speciesByRef = new Map(
      resolvedSpecies.map(({ speciesRef, species }) => [speciesRef, species] as const),
    );

    const createdPhase = await deps.bakkiPhases.createPhase({
      phaseName: normalized.phaseName,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      description: normalized.description,
      fieldLeadUserId,
      participantUserIds,
      areaContracts: areaContracts.map((contract) => {
        const species = speciesByRef.get(contract.speciesRef);
        if (!species || !species.active) {
          throw new BadRequestException(`Referenced species ${contract.speciesRef} is not available for planting assignments.`);
        }

        if (
          typeof species.treesPerTray !== 'number'
          || !Number.isFinite(species.treesPerTray)
          || species.treesPerTray <= 0
        ) {
          throw new BadRequestException(
            `Species ${species.commonName} is missing trees-per-tray metadata required for planting assignments.`,
          );
        }

        return {
          ...contract,
          speciesName: species.commonName,
          treesPerTray: species.treesPerTray,
          contractTreeGoal: contract.trayCount * species.treesPerTray,
        };
      }),
      crewRotation: normalized.crewRotation,
      operationalNotes: normalized.operationalNotes,
      taskType: normalized.taskType,
    });

    await deps.auditService.recordEvent({
      actor: actor.actorId,
      message: `Created planting phase ${normalized.phaseName}`,
      payload: {
        areaCount: new Set(areaContracts.map((contract) => contract.areaRef)).size,
        assignedContractCount: areaContracts.length,
        participantCount: participantUserIds.length,
      },
      targetModel: 'bakki_phase',
      targetResId: parseNumericId(createdPhase.createdPhaseId, 'phase-') ?? undefined,
      type: 'phase.create',
    });

    return createdPhase;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown Bakki Core planting phase create error';
    deps.logger.error(`Bakki Core planting phase creation failed: ${message}`);
    throw new BadRequestException('Planting phase could not be created.');
  }
}

function hasLivePhaseWriteBackend(deps: PhaseMutationDeps) {
  return deps.bakkiPhases.isConfigured()
    && deps.bakkiSpecies.isConfigured()
    && deps.bakkiUsers.isConfigured()
    && deps.odoo.isConfigured();
}
