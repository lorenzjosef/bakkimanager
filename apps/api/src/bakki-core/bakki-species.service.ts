import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdjustSpeciesInventoryRequest,
  SpeciesInventoryDetail,
  SpeciesRecord,
} from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import { BakkiCoreService } from './bakki-core.service';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';
import {
  BAKKI_SPECIES_SELECT_FIELDS,
  type BakkiInventoryTransactionRow,
  type BakkiSpeciesRow,
  mapSpeciesRow,
  resolveGrowthTone,
  resolveSpeciesVisual,
  SPECIES_BOOTSTRAP_SEED,
} from './bakki-species.queries';

export interface BakkiSpeciesRecord {
  active: boolean;
  areaTypeLabel: string | null;
  botanicalName: string;
  commonName: string;
  growthPhaseLabel: string | null;
  inventoryUnit: string;
  notes: string | null;
  quantityOnHand: number;
  speciesRef: string;
  treesPerTray: number | null;
  totalPlanted: number;
}

@Injectable()
export class BakkiSpeciesService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly bakkiCore: BakkiCoreService) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async listSpecies() {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiSpeciesRow>(
      `
        select
          ${BAKKI_SPECIES_SELECT_FIELDS}
        from bakki_species
        where active = true
        order by lower(common_name) asc, species_ref asc
      `,
    );

    return result.rows.map(mapSpeciesRow);
  }

  async getBySpeciesRef(speciesRef: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiSpeciesRow>(
      `
        select
          ${BAKKI_SPECIES_SELECT_FIELDS}
        from bakki_species
        where species_ref = $1
        limit 1
      `,
      [speciesRef],
    );

    const row = result.rows[0];
    return row ? mapSpeciesRow(row) : null;
  }

  async createSpecies(input: {
    areaTypeLabel?: string;
    botanicalName: string;
    commonName: string;
    growthPhaseLabel?: string;
    inventoryUnit: string;
    notes?: string;
    quantityOnHand: number;
    speciesRef: string;
    treesPerTray?: number;
  }) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiSpeciesRow>(
      `
        insert into bakki_species (
          species_ref,
          common_name,
          botanical_name,
          inventory_unit,
          quantity_on_hand,
          total_planted,
          trees_per_tray,
          growth_phase_label,
          area_type_label,
          notes,
          active,
          updated_at
        )
        values ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, true, now())
        returning
          ${BAKKI_SPECIES_SELECT_FIELDS}
      `,
      [
        input.speciesRef,
        input.commonName,
        input.botanicalName,
        input.inventoryUnit,
        Math.round(input.quantityOnHand),
        input.treesPerTray ?? null,
        input.growthPhaseLabel ?? null,
        input.areaTypeLabel ?? null,
        input.notes ?? null,
      ],
    );

    return mapSpeciesRow(requireFirstRow(result.rows, 'Failed to insert Bakki species.'));
  }

  async updateSpecies(
    speciesRef: string,
    input: {
      areaTypeLabel?: string;
      botanicalName: string;
      commonName: string;
      growthPhaseLabel?: string;
      inventoryUnit: string;
      notes?: string;
      treesPerTray?: number;
    },
  ) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiSpeciesRow>(
      `
        update bakki_species
        set
          common_name = $2,
          botanical_name = $3,
          inventory_unit = $4,
          trees_per_tray = $5,
          growth_phase_label = $6,
          area_type_label = $7,
          notes = $8,
          updated_at = now()
        where species_ref = $1
        returning
          ${BAKKI_SPECIES_SELECT_FIELDS}
      `,
      [
        speciesRef,
        input.commonName,
        input.botanicalName,
        input.inventoryUnit,
        input.treesPerTray ?? null,
        input.growthPhaseLabel ?? null,
        input.areaTypeLabel ?? null,
        input.notes ?? null,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Species could not be found.');
    }

    return mapSpeciesRow(row);
  }

  async adjustInventory(
    speciesRef: string,
    input: AdjustSpeciesInventoryRequest,
  ) {
    await this.ensureSchema();

    return this.bakkiCore.withClient(async (client) => {
      await client.query('begin');

      try {
        const speciesResult = await client.query<BakkiSpeciesRow>(
          `
            select
              ${BAKKI_SPECIES_SELECT_FIELDS}
            from bakki_species
            where species_ref = $1
            limit 1
            for update
          `,
          [speciesRef],
        );

        const speciesRow = speciesResult.rows[0];
        if (!speciesRow) {
          throw new NotFoundException('Species could not be found.');
        }

        const current = mapSpeciesRow(speciesRow);
        const nextQuantity = current.quantityOnHand + input.quantityDelta;
        if (nextQuantity < 0) {
          throw new BadRequestException('Inventory adjustment would reduce stock below zero.');
        }

        const nextTotalPlanted =
          input.reason === 'planting' && input.quantityDelta < 0
            ? current.totalPlanted + Math.abs(input.quantityDelta)
            : current.totalPlanted;

        const updateResult = await client.query<BakkiSpeciesRow>(
          `
            update bakki_species
            set
              quantity_on_hand = $2,
              total_planted = $3,
              updated_at = now()
            where species_ref = $1
            returning
              ${BAKKI_SPECIES_SELECT_FIELDS}
          `,
          [speciesRef, nextQuantity, nextTotalPlanted],
        );

        const transactionResult = await client.query<BakkiInventoryTransactionRow>(
          `
            insert into bakki_inventory_transaction (
              species_ref,
              quantity_delta,
              quantity_after,
              reason,
              note,
              occurred_at
            )
            values ($1, $2, $3, $4, $5, now())
            returning id, occurred_at
          `,
          [speciesRef, input.quantityDelta, nextQuantity, input.reason, input.note?.trim() || null],
        );

        const updatedSpecies = requireFirstRow(
          updateResult.rows,
          'Failed to update Bakki species inventory.',
        );
        const inventoryTransaction = requireFirstRow(
          transactionResult.rows,
          'Failed to insert Bakki inventory transaction.',
        );

        await client.query('commit');

        return {
          species: mapSpeciesRow(updatedSpecies),
          transactionId: `inventory-transaction-${inventoryTransaction.id}`,
          occurredAt:
            inventoryTransaction.occurred_at instanceof Date
              ? inventoryTransaction.occurred_at.toISOString()
              : new Date(inventoryTransaction.occurred_at).toISOString(),
        };
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      }
    });
  }

  async speciesRefExists(speciesRef: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<{ count: string }>(
      'select count(*)::text as count from bakki_species where species_ref = $1',
      [speciesRef],
    );
    return Number(result.rows[0]?.count ?? 0) > 0;
  }

  mapRecordToRow(record: BakkiSpeciesRecord, index: number): SpeciesRecord {
    const visual = resolveSpeciesVisual(record.speciesRef, index);
    return {
      id: record.speciesRef,
      commonName: record.commonName,
      botanicalName: record.botanicalName,
      inventoryUnits: Math.round(record.quantityOnHand).toLocaleString('en-US'),
      totalPlanted: Math.round(record.totalPlanted).toLocaleString('en-US'),
      treesPerTray: record.treesPerTray,
      growthPhase: record.growthPhaseLabel || 'Unspecified',
      growthTone: resolveGrowthTone(record.growthPhaseLabel),
      areaType: record.areaTypeLabel || 'Unassigned',
      thumbnailUrl: visual.thumbnailUrl,
      thumbnailClassName: visual.thumbnailClassName,
    };
  }

  mapRecordToDetail(record: BakkiSpeciesRecord): SpeciesInventoryDetail {
    return {
      areaType: record.areaTypeLabel || 'Unassigned',
      growthPhase: record.growthPhaseLabel || 'Unspecified',
      heroImageUrl: localAssetUrls.speciesHero,
      heroTag: record.areaTypeLabel || 'Species Record',
      inventoryUnit: record.inventoryUnit,
      name: record.commonName,
      botanicalName: record.botanicalName,
      notes: record.notes || 'No species notes have been recorded yet.',
      treesPerTray: record.treesPerTray,
      metrics: [
        {
          label: 'Stock on Hand',
          value: Math.round(record.quantityOnHand).toLocaleString('en-US'),
          metaIconUrl: localAssetUrls.verified,
          metaText: record.inventoryUnit,
        },
        {
          label: 'Trees / Tray',
          value:
            typeof record.treesPerTray === 'number' && Number.isFinite(record.treesPerTray)
              ? Math.round(record.treesPerTray).toLocaleString('en-US')
              : 'Unavailable',
          metaIconUrl: localAssetUrls.verified,
          metaText: 'used for planting assignments',
        },
        {
          label: 'Total Planted',
          value: Math.round(record.totalPlanted).toLocaleString('en-US'),
          metaIconUrl: localAssetUrls.trend,
          metaText: record.growthPhaseLabel || 'Growth phase',
        },
      ],
      actionIconUrl: localAssetUrls.editSpecies,
      actionLabel: 'Edit Species Parameters',
    };
  }

  private async ensureSchema() {
    await ensureSchemaInitialized({
      getSchemaInitPromise: () => this.schemaInitPromise,
      initialize: () => this.ensureSchemaInternal(),
      isConfigured: this.bakkiCore.isConfigured(),
      schemaEnsured: this.schemaEnsured,
      setSchemaInitPromise: (promise) => {
        this.schemaInitPromise = promise;
      },
    });
  }

  private async ensureSchemaInternal() {
    await this.bakkiCore.query(`
      create table if not exists bakki_species (
        species_ref text primary key,
        common_name text not null,
        botanical_name text not null,
        inventory_unit text not null default 'trees',
        quantity_on_hand integer not null default 0,
        total_planted integer not null default 0,
        trees_per_tray integer,
        growth_phase_label text,
        area_type_label text,
        notes text,
        active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      alter table bakki_species
      add column if not exists trees_per_tray integer
    `);

    await this.bakkiCore.query(`
      create table if not exists bakki_inventory_transaction (
        id bigserial primary key,
        species_ref text not null references bakki_species(species_ref) on delete restrict,
        quantity_delta integer not null,
        quantity_after integer not null,
        reason text not null check (reason in ('adjustment', 'correction', 'planting', 'monitoring', 'fertilizing')),
        note text,
        phase_ref text,
        task_ref text,
        occurred_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create index if not exists bakki_species_common_name_idx
      on bakki_species (lower(common_name))
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_inventory_transaction_species_ref_idx
      on bakki_inventory_transaction (species_ref, occurred_at desc)
    `);

    await this.seedFixtureSpecies();
    this.schemaEnsured = true;
  }

  private async seedFixtureSpecies() {
    for (const seed of SPECIES_BOOTSTRAP_SEED) {
      await this.bakkiCore.query(
        `
          insert into bakki_species (
            species_ref,
            common_name,
            botanical_name,
            inventory_unit,
            quantity_on_hand,
            total_planted,
            trees_per_tray,
            growth_phase_label,
            area_type_label,
            notes,
            active
          )
          values ($1, $2, $3, 'trees', $4, $5, $6, $7, $8, $9, true)
          on conflict (species_ref) do update
          set trees_per_tray = coalesce(bakki_species.trees_per_tray, excluded.trees_per_tray)
        `,
        [
          seed.speciesRef,
          seed.commonName,
          seed.botanicalName,
          seed.quantityOnHand,
          seed.totalPlanted,
          seed.treesPerTray,
          seed.growthPhaseLabel,
          seed.areaTypeLabel,
          seed.notes,
        ],
      );
    }
  }
}

async function rollbackQuietly(client: { query: (sql: string) => Promise<unknown> }) {
  try {
    await client.query('rollback');
  } catch {
    // Ignore rollback errors because the original failure is more relevant.
  }
}
