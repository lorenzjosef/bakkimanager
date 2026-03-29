import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AdjustSpeciesInventoryRequest,
  AdjustSpeciesInventoryResponse,
  CreateSpeciesRequest,
  CreateSpeciesResponse,
  UpdateSpeciesRequest,
  UpdateSpeciesResponse,
} from '@bakki/domain';
import { BakkiSpeciesService } from '../../bakki-core/bakki-species.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { requireOwnerSessionActor } from '../auth/owner-session.helpers';

const SPECIES_SYNC_STATUS = {
  title: 'Bakki Inventory Status',
  copy: 'Species records and inventory changes are currently stored in Bakki Core.',
} as const;

@Injectable()
export class SpeciesService {
  private readonly logger = new Logger(SpeciesService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly bakkiSpecies: BakkiSpeciesService,
  ) {}

  async listSpecies() {
    if (this.bakkiSpecies.isConfigured()) {
      try {
        const records = await this.bakkiSpecies.listSpecies();
        return records.map((record, index) => this.bakkiSpecies.mapRecordToRow(record, index));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Bakki Core species inventory read error';
        this.logger.warn(`Bakki Core species inventory unavailable. ${message}`);
        return [];
      }
    }

    return [];
  }

  async getDetail(id: string) {
    if (this.bakkiSpecies.isConfigured()) {
      try {
        const record = await this.bakkiSpecies.getBySpeciesRef(id);
        if (!record) {
          throw new NotFoundException(`No Bakki species found for ${id}`);
        }

        return this.bakkiSpecies.mapRecordToDetail(record);
      } catch (error) {
        this.rethrowConfiguredSpeciesError(
          error,
          'Bakki Core species detail is currently unavailable.',
          `species detail read for ${id}`,
        );
      }
    }

    throw new ServiceUnavailableException('Bakki Core species detail is currently unavailable.');
  }

  async createSpecies(
    input: CreateSpeciesRequest,
    sessionToken?: string,
  ): Promise<CreateSpeciesResponse> {
    const normalized = this.normalizeCreateSpeciesInput(input);
    const actor = await this.requireOwnerActor(sessionToken);

    if (this.bakkiSpecies.isConfigured()) {
      try {
        const code = await this.buildUniqueSpeciesCode(normalized.code, normalized.commonName);
        const created = await this.bakkiSpecies.createSpecies({
          speciesRef: code,
          commonName: normalized.commonName,
          botanicalName: normalized.botanicalName,
          inventoryUnit: normalized.inventoryUnit,
          quantityOnHand: normalized.initialQuantityOnHand,
          treesPerTray: normalized.treesPerTray,
          growthPhaseLabel: normalized.growthPhaseLabel,
          areaTypeLabel: normalized.areaTypeLabel,
          notes: normalized.notes,
        });

        await this.auditService.recordEvent({
          actor: actor.actorId,
          message: `Created species ${created.commonName}`,
          payload: {
            code: created.speciesRef,
            quantityOnHand: created.quantityOnHand,
            treesPerTray: created.treesPerTray,
          },
          targetModel: 'bakki_species',
          type: 'species.create',
        });

        return {
          createdSpeciesId: created.speciesRef,
          createdSpecies: {
            code: created.speciesRef,
            commonName: created.commonName,
            botanicalName: created.botanicalName,
            inventoryUnits: Math.round(created.quantityOnHand).toLocaleString('en-US'),
            totalPlanted: Math.round(created.totalPlanted).toLocaleString('en-US'),
            growthPhase: created.growthPhaseLabel || 'Seedling',
            areaType: created.areaTypeLabel || 'General',
          },
        };
      } catch (error) {
        this.rethrowConfiguredSpeciesError(
          error,
          'Bakki Core species inventory is currently unavailable, so species changes cannot be saved.',
          'species creation',
        );
      }
    }

    throw new ServiceUnavailableException(
      'Bakki Core species inventory is currently unavailable, so species changes cannot be saved.',
    );
  }

  async updateSpecies(
    id: string,
    input: UpdateSpeciesRequest,
    sessionToken?: string,
  ): Promise<UpdateSpeciesResponse> {
    const normalized = this.normalizeUpdateSpeciesInput(input);
    const actor = await this.requireOwnerActor(sessionToken);

    if (this.bakkiSpecies.isConfigured()) {
      try {
        const updated = await this.bakkiSpecies.updateSpecies(id, {
          commonName: normalized.commonName,
          botanicalName: normalized.botanicalName,
          inventoryUnit: normalized.inventoryUnit,
          treesPerTray: normalized.treesPerTray,
          growthPhaseLabel: normalized.growthPhaseLabel,
          areaTypeLabel: normalized.areaTypeLabel,
          notes: normalized.notes,
        });

        await this.auditService.recordEvent({
          actor: actor.actorId,
          message: `Updated species ${updated.commonName}`,
          payload: {
            areaType: updated.areaTypeLabel,
            growthPhase: updated.growthPhaseLabel,
            inventoryUnit: updated.inventoryUnit,
            treesPerTray: updated.treesPerTray,
          },
          targetModel: 'bakki_species',
          type: 'species.update',
        });

        return {
          updatedSpeciesId: updated.speciesRef,
          updatedSpecies: {
            code: updated.speciesRef,
            commonName: updated.commonName,
            botanicalName: updated.botanicalName,
            growthPhase: updated.growthPhaseLabel || 'Seedling',
            areaType: updated.areaTypeLabel || 'General',
            inventoryUnit: updated.inventoryUnit,
            notes: updated.notes || '',
          },
        };
      } catch (error) {
        this.rethrowConfiguredSpeciesError(
          error,
          'Bakki Core species inventory is currently unavailable, so species changes cannot be saved.',
          `species update for ${id}`,
        );
      }
    }

    throw new ServiceUnavailableException(
      'Bakki Core species inventory is currently unavailable, so species changes cannot be saved.',
    );
  }

  async adjustInventory(
    id: string,
    input: AdjustSpeciesInventoryRequest,
    sessionToken?: string,
  ): Promise<AdjustSpeciesInventoryResponse> {
    if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
      throw new BadRequestException('Inventory adjustment must be a non-zero number.');
    }

    const actor = await this.requireOwnerActor(sessionToken);

    if (this.bakkiSpecies.isConfigured()) {
      try {
        const adjustment = await this.bakkiSpecies.adjustInventory(id, input);

        await this.auditService.recordEvent({
          actor: actor.actorId,
          message: `Adjusted inventory for ${adjustment.species.commonName}`,
          payload: {
            quantityDelta: input.quantityDelta,
            quantityOnHand: adjustment.species.quantityOnHand,
            reason: input.reason,
          },
          targetModel: 'bakki_species',
          type: 'species.inventory_adjustment',
        });

        return {
          speciesId: adjustment.species.speciesRef,
          speciesName: adjustment.species.commonName,
          quantityOnHand: adjustment.species.quantityOnHand,
          totalPlanted: adjustment.species.totalPlanted,
          quantityDelta: input.quantityDelta,
          reason: input.reason,
          transactionId: adjustment.transactionId,
          occurredAt: adjustment.occurredAt,
        };
      } catch (error) {
        this.rethrowConfiguredSpeciesError(
          error,
          'Bakki Core species inventory is currently unavailable, so inventory changes cannot be saved.',
          `species inventory adjustment for ${id}`,
        );
      }
    }

    throw new ServiceUnavailableException(
      'Bakki Core species inventory is currently unavailable, so inventory changes cannot be saved.',
    );
  }

  getSyncStatus() {
    if (this.bakkiSpecies.isConfigured()) {
      return SPECIES_SYNC_STATUS;
    }

    return {
      title: 'Bakki Core Status',
      copy: 'Species inventory is currently unavailable. The registry is visible, but stock changes require Bakki Core connectivity.',
    };
  }

  private async requireOwnerActor(sessionToken?: string) {
    return requireOwnerSessionActor({
      authService: this.authService,
      sessionToken,
      unauthorizedMessage: 'Only Bakki owners can adjust inventory',
    });
  }

  private async buildUniqueSpeciesCode(code: string | undefined, commonName: string) {
    const base = this.normalizeSpeciesCode(code || commonName);
    let candidate = base;
    let suffix = 2;

    while (await this.speciesCodeExists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async speciesCodeExists(code: string) {
    if (this.bakkiSpecies.isConfigured()) {
      return this.bakkiSpecies.speciesRefExists(code);
    }

    return false;
  }

  private normalizeSpeciesCode(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalized) {
      throw new BadRequestException('Species code could not be derived.');
    }

    return normalized;
  }

  private normalizeCreateSpeciesInput(input: CreateSpeciesRequest) {
    const commonName = input.commonName.trim();
    const botanicalName = input.botanicalName.trim();
    const inventoryUnit = input.inventoryUnit?.trim() || 'trees';

    if (!commonName) {
      throw new BadRequestException('Common name is required.');
    }

    if (!botanicalName) {
      throw new BadRequestException('Botanical name is required.');
    }

    if (!Number.isFinite(input.initialQuantityOnHand) || input.initialQuantityOnHand < 0) {
      throw new BadRequestException('Initial quantity must be zero or a positive number.');
    }

    return {
      commonName,
      botanicalName,
      code: input.code?.trim() || undefined,
      inventoryUnit,
      initialQuantityOnHand: Math.round(input.initialQuantityOnHand),
      growthPhaseLabel: input.growthPhaseLabel?.trim() || undefined,
      areaTypeLabel: input.areaTypeLabel?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      treesPerTray:
        typeof input.treesPerTray === 'number' && Number.isFinite(input.treesPerTray) && input.treesPerTray > 0
          ? Math.round(input.treesPerTray)
          : undefined,
    };
  }

  private normalizeUpdateSpeciesInput(input: UpdateSpeciesRequest) {
    const commonName = input.commonName.trim();
    const botanicalName = input.botanicalName.trim();
    const inventoryUnit = input.inventoryUnit?.trim() || 'trees';

    if (!commonName) {
      throw new BadRequestException('Common name is required.');
    }

    if (!botanicalName) {
      throw new BadRequestException('Botanical name is required.');
    }

    return {
      commonName,
      botanicalName,
      inventoryUnit,
      growthPhaseLabel: input.growthPhaseLabel?.trim() || undefined,
      areaTypeLabel: input.areaTypeLabel?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      treesPerTray:
        typeof input.treesPerTray === 'number' && Number.isFinite(input.treesPerTray) && input.treesPerTray > 0
          ? Math.round(input.treesPerTray)
          : undefined,
    };
  }

  private rethrowConfiguredSpeciesError(
    error: unknown,
    clientMessage: string,
    logContext: string,
  ): never {
    if (
      error instanceof BadRequestException
      || error instanceof NotFoundException
      || error instanceof ServiceUnavailableException
      || error instanceof UnauthorizedException
    ) {
      throw error;
    }

    const detail = error instanceof Error ? error.message : 'Unknown species service error';
    this.logger.warn(`Bakki Core ${logContext} unavailable. ${detail}`);
    throw new ServiceUnavailableException(clientMessage);
  }
}
