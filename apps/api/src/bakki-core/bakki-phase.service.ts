import { Injectable } from '@nestjs/common';
import type { BakkiTaskType } from '@bakki/domain';
import type { PoolClient } from 'pg';
import { BakkiCoreService } from './bakki-core.service';
import { BakkiGeometryService } from './bakki-geometry.service';
import {
  type BakkiActivePhaseMetricsRow,
  type BakkiAreaContractByPhaseRow,
  type BakkiAreaContractRow,
  type BakkiPhaseInsertRow,
  type BakkiPhaseParticipantRow,
  type BakkiPhaseSummaryRow,
  groupAreaContractRowsByPhaseId,
  groupParticipantRowsByPhaseId,
  mapAreaContractRow,
  mapPhaseSummaryRow,
  toIsoDateString,
} from './bakki-phase.queries';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';

export interface BakkiPhaseSummaryRecord {
  areaCount: number;
  assignedContractCount: number;
  createdPhaseId: string;
  endDate: string;
  participantCount: number;
  phaseName: string;
  startDate: string;
  state: 'draft' | 'active' | 'done' | 'cancelled';
}

export interface BakkiActivePhaseMetrics {
  averageDensity: number | null;
  fulfillmentPercent: number | null;
  name: string | null;
  totalContractGoal: number;
}

export interface BakkiAreaContractRecord {
  areaRef: string;
  assignedUserId: number;
  assignedUserName: string | null;
  contractTreeGoal: number | null;
  phaseId: number;
  phaseName: string;
  phaseState: 'draft' | 'active' | 'done' | 'cancelled';
  speciesName: string | null;
  speciesRef: string | null;
  trayCount: number | null;
  treesPerTray: number | null;
  targetDensityPer100Sqm: number | null;
}

export interface BakkiPhaseParticipantRecord {
  phaseId: number;
  role: string | null;
  userId: number;
  userName: string | null;
}

export interface CreateBakkiPhaseInput {
  areaContracts: Array<{
    areaRef: string;
    assignedUserId: number;
    speciesName: string;
    speciesRef: string;
    trayCount: number;
    treesPerTray: number;
    contractTreeGoal?: number;
  }>;
  crewRotation?: string;
  description: string;
  endDate: string;
  fieldLeadUserId: number;
  operationalNotes?: string;
  participantUserIds: number[];
  phaseName: string;
  startDate: string;
  taskType?: BakkiTaskType;
}

@Injectable()
export class BakkiPhaseService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(
    private readonly bakkiCore: BakkiCoreService,
    private readonly bakkiGeometry: BakkiGeometryService,
  ) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async listRecentPhases(limit = 4) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiPhaseSummaryRow>(
      `
        select
          p.id,
          p.phase_name,
          p.start_date,
          p.end_date,
          p.state,
          count(distinct pp.bakki_user_id) as participant_count,
          count(distinct pac.area_ref) as area_count,
          count(distinct pac.id) as assigned_contract_count
        from bakki_phase p
        left join bakki_phase_participant pp on pp.phase_id = p.id
        left join bakki_phase_area_contract pac on pac.phase_id = p.id
        group by p.id
        order by p.start_date desc, p.id desc
        limit $1
      `,
      [limit],
    );

    return result.rows.map(mapPhaseSummaryRow);
  }

  async getActivePhaseMetrics(): Promise<BakkiActivePhaseMetrics | null> {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<BakkiActivePhaseMetricsRow>(
      `
        select
          p.phase_name,
          coalesce(sum(pac.contract_tree_goal), 0) as total_contract_goal,
          avg(pac.target_density_per_100sqm) as average_density
        from bakki_phase p
        left join bakki_phase_area_contract pac on pac.phase_id = p.id
        where p.state = 'active'
        group by p.id
        order by p.start_date desc, p.id desc
        limit 1
      `,
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      name: row.phase_name,
      totalContractGoal: Number(row.total_contract_goal ?? 0),
      averageDensity:
        typeof row.average_density === 'number'
          ? Math.round(row.average_density)
          : row.average_density
            ? Math.round(Number(row.average_density))
            : null,
      fulfillmentPercent: null,
    };
  }

  async getLatestContractsByAreaRefs(areaRefs: string[]) {
    await this.ensureSchema();
    if (areaRefs.length === 0) {
      return new Map<string, BakkiAreaContractRecord>();
    }

    const result = await this.bakkiCore.query<BakkiAreaContractRow>(
      `
        select distinct on (pac.area_ref)
          pac.area_ref,
          pac.assigned_user_id,
          u.display_name as assigned_user_name,
          pac.contract_tree_goal,
          pac.species_ref,
          pac.species_name,
          pac.tray_count,
          pac.trees_per_tray,
          pac.target_density_per_100sqm,
          p.id as phase_id,
          p.phase_name,
          p.state as phase_state
        from bakki_phase_area_contract pac
        join bakki_phase p on p.id = pac.phase_id
        left join bakki_user u on u.id = pac.assigned_user_id
        where pac.area_ref = any($1::text[])
        order by
          pac.area_ref asc,
          case p.state
            when 'active' then 0
            when 'draft' then 1
            when 'done' then 2
            else 3
          end asc,
          pac.id desc
      `,
      [areaRefs],
    );

    return new Map(
      result.rows.map((row) => [row.area_ref, mapAreaContractRow(row)]),
    );
  }

  async listContractsByPhaseIds(phaseIds: number[]) {
    await this.ensureSchema();
    if (phaseIds.length === 0) {
      return new Map<number, BakkiAreaContractRecord[]>();
    }

    const result = await this.bakkiCore.query<BakkiAreaContractByPhaseRow>(
      `
        select
          pac.area_ref,
          pac.assigned_user_id,
          u.display_name as assigned_user_name,
          pac.contract_tree_goal,
          pac.species_ref,
          pac.species_name,
          pac.tray_count,
          pac.trees_per_tray,
          pac.target_density_per_100sqm,
          p.id as phase_id,
          p.phase_name,
          p.state as phase_state
        from bakki_phase_area_contract pac
        join bakki_phase p on p.id = pac.phase_id
        left join bakki_user u on u.id = pac.assigned_user_id
        where pac.phase_id = any($1::bigint[])
        order by pac.phase_id asc, pac.sequence asc, pac.id asc
      `,
      [phaseIds],
    );

    return groupAreaContractRowsByPhaseId(result.rows);
  }

  async listParticipantsByPhaseIds(phaseIds: number[]) {
    await this.ensureSchema();
    if (phaseIds.length === 0) {
      return new Map<number, BakkiPhaseParticipantRecord[]>();
    }

    const result = await this.bakkiCore.query<BakkiPhaseParticipantRow>(
      `
        select
          pp.phase_id,
          pp.bakki_user_id,
          u.display_name,
          u.role
        from bakki_phase_participant pp
        join bakki_user u on u.id = pp.bakki_user_id
        where pp.phase_id = any($1::bigint[])
          and pp.state = 'active'
        order by pp.phase_id asc, lower(u.display_name) asc, u.id asc
      `,
      [phaseIds],
    );

    return groupParticipantRowsByPhaseId(result.rows);
  }

  async createPhase(input: CreateBakkiPhaseInput) {
    await this.ensureSchema();

    return this.bakkiCore.withClient(async (client) => {
      await client.query('begin');

      try {
        const phaseInsert = await client.query<BakkiPhaseInsertRow>(
          `
            insert into bakki_phase (
              phase_name,
              start_date,
              end_date,
              description,
              state,
              field_lead_user_id,
              crew_rotation,
              operational_notes,
              default_task_type
            )
            values ($1, $2, $3, $4, 'draft', $5, $6, $7, $8)
            returning id, phase_name, start_date, end_date, state
          `,
          [
            input.phaseName,
            input.startDate,
            input.endDate,
            input.description,
            input.fieldLeadUserId,
            input.crewRotation ?? null,
            input.operationalNotes ?? null,
            input.taskType ?? 'planting',
          ],
        );

        const phase = requireFirstRow(phaseInsert.rows, 'Failed to insert Bakki phase.');
        const uniqueParticipantIds = Array.from(new Set(input.participantUserIds));

        for (const participantUserId of uniqueParticipantIds) {
          await client.query(
            `
              insert into bakki_phase_participant (
                phase_id,
                bakki_user_id,
                state
              )
              values ($1, $2, 'active')
              on conflict (phase_id, bakki_user_id) do nothing
            `,
            [phase.id, participantUserId],
          );
        }

        for (const [index, contract] of input.areaContracts.entries()) {
          await client.query(
            `
              insert into bakki_phase_area_contract (
                phase_id,
                area_ref,
                assigned_user_id,
                species_ref,
                species_name,
                tray_count,
                trees_per_tray,
                contract_tree_goal,
                target_density_per_100sqm,
                sequence
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8, null, $9)
            `,
            [
              phase.id,
              contract.areaRef,
              contract.assignedUserId,
              contract.speciesRef,
              contract.speciesName,
              contract.trayCount,
              contract.treesPerTray,
              contract.contractTreeGoal ?? null,
              (index + 1) * 10,
            ],
          );
        }

        await client.query('commit');

        const uniqueAreaCount = new Set(input.areaContracts.map((contract) => contract.areaRef)).size;

        return {
          createdPhaseId: `phase-${phase.id}`,
          phaseName: phase.phase_name,
          startDate: toIsoDateString(phase.start_date),
          endDate: toIsoDateString(phase.end_date),
          state: phase.state,
          participantCount: uniqueParticipantIds.length,
          areaCount: uniqueAreaCount,
          assignedContractCount: input.areaContracts.length,
        } satisfies BakkiPhaseSummaryRecord;
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      }
    });
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
    await this.bakkiGeometry.ensureAreaCatalog();

    await this.bakkiCore.query(`
      create table if not exists bakki_phase (
        id bigserial primary key,
        phase_name text not null,
        start_date date not null,
        end_date date not null,
        description text not null default '',
        state text not null check (state in ('draft', 'active', 'done', 'cancelled')),
        field_lead_user_id bigint references bakki_user(id) on delete set null,
        crew_rotation text,
        operational_notes text,
        default_task_type text not null check (default_task_type in ('planting', 'monitoring', 'fertilizing')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create table if not exists bakki_phase_participant (
        phase_id bigint not null references bakki_phase(id) on delete cascade,
        bakki_user_id bigint not null references bakki_user(id) on delete restrict,
        state text not null default 'active' check (state in ('active', 'removed')),
        created_at timestamptz not null default now(),
        primary key (phase_id, bakki_user_id)
      )
    `);

    await this.bakkiCore.query(`
      create table if not exists bakki_phase_area_contract (
        id bigserial primary key,
        phase_id bigint not null references bakki_phase(id) on delete cascade,
        area_ref text not null references bakki_area(area_ref) on delete restrict,
        assigned_user_id bigint not null references bakki_user(id) on delete restrict,
        species_ref text,
        species_name text,
        tray_count integer,
        trees_per_tray integer,
        contract_tree_goal integer,
        target_density_per_100sqm numeric,
        sequence integer not null default 10,
        created_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      alter table bakki_phase_area_contract
      add column if not exists species_ref text
    `);
    await this.bakkiCore.query(`
      alter table bakki_phase_area_contract
      add column if not exists species_name text
    `);
    await this.bakkiCore.query(`
      alter table bakki_phase_area_contract
      add column if not exists tray_count integer
    `);
    await this.bakkiCore.query(`
      alter table bakki_phase_area_contract
      add column if not exists trees_per_tray integer
    `);

    await this.bakkiCore.query(`
      create index if not exists bakki_phase_state_idx
      on bakki_phase (state)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_phase_start_date_idx
      on bakki_phase (start_date desc)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_phase_participant_user_idx
      on bakki_phase_participant (bakki_user_id)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_phase_area_contract_phase_idx
      on bakki_phase_area_contract (phase_id, sequence)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_phase_area_contract_user_idx
      on bakki_phase_area_contract (assigned_user_id)
    `);
    await this.bakkiCore.query(`
      create unique index if not exists bakki_phase_area_contract_unique_area_idx
      on bakki_phase_area_contract (phase_id, area_ref)
    `);
    await this.bakkiCore.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conname = 'bakki_phase_area_contract_area_ref_fkey'
        ) then
          alter table bakki_phase_area_contract
          add constraint bakki_phase_area_contract_area_ref_fkey
          foreign key (area_ref) references bakki_area(area_ref) on delete restrict;
        end if;
      end
      $$;
    `);

    this.schemaEnsured = true;
  }
}

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query('rollback');
  } catch {
    // no-op rollback guard
  }
}
