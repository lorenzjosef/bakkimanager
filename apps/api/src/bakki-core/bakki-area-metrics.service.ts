import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { BakkiCoreService } from './bakki-core.service';
import { BakkiGeometryService } from './bakki-geometry.service';
import { BakkiTreeSurveyService } from './bakki-tree-survey.service';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';

export interface BakkiAreaMetricsRecord {
  areaName: string;
  areaRef: string;
  currentDensityPer100Sqm: number;
  currentTreeCount: number | null;
  source?: 'legacy_area_metrics' | 'plot_estimate_projection';
  updatedAt: string;
  zoneRef: string | null;
}

export interface RecordAreaObservationInput {
  actorUserId?: number | null;
  areaRef: string;
  densityPer100Sqm: number;
  notes?: string;
  observedAt?: string;
  taskRef?: string | null;
  treeCount?: number | null;
}

export interface UpdateAreaMetricsInput {
  areaRef: string;
  densityPer100Sqm: number;
  treeCount?: number | null;
}

@Injectable()
export class BakkiAreaMetricsService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(
    private readonly bakkiCore: BakkiCoreService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiTreeSurvey: BakkiTreeSurveyService,
  ) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async getByAreaRef(areaRef: string) {
    const records = await this.listByAreaRefs([areaRef]);
    return records[0] ?? null;
  }

  async listByZoneRefs(zoneRefs: string[]) {
    await this.ensureSchema();
    if (zoneRefs.length === 0) {
      return [];
    }

    const result = await this.bakkiCore.query<BakkiAreaMetricsRow>(
      `
        select
          area_ref,
          zone_ref,
          area_name,
          current_density_per_100sqm,
          current_tree_count,
          updated_at
        from bakki_area_metrics
        where zone_ref = any($1::text[])
        order by area_ref asc
      `,
      [zoneRefs],
    );
    const recordsByAreaRef = new Map(
      result.rows.map((row) => {
        const mapped = mapAreaRow(row);
        return [mapped.areaRef, mapped] as const;
      }),
    );

    try {
      const allAreas = await this.bakkiGeometry.listAreas();
      const areaRefs = [...allAreas.values()]
        .filter((area) => zoneRefs.includes(area.zoneRef))
        .map((area) => area.areaRef);
      const projected = await this.listProjectedByAreaRefs(areaRefs);
      for (const [areaRef, projectedRecord] of projected) {
        recordsByAreaRef.set(areaRef, projectedRecord);
      }
    } catch {
      // Keep legacy records only when geometry/projection lookups are unavailable.
    }

    return [...recordsByAreaRef.values()]
      .filter((record) => record.zoneRef && zoneRefs.includes(record.zoneRef))
      .sort((left, right) => left.areaRef.localeCompare(right.areaRef));
  }

  async listByAreaRefs(areaRefs: string[]) {
    await this.ensureSchema();
    if (areaRefs.length === 0) {
      return [];
    }

    const result = await this.bakkiCore.query<BakkiAreaMetricsRow>(
      `
        select
          area_ref,
          zone_ref,
          area_name,
          current_density_per_100sqm,
          current_tree_count,
          updated_at
        from bakki_area_metrics
        where area_ref = any($1::text[])
        order by area_ref asc
      `,
      [areaRefs],
    );
    const recordsByAreaRef = new Map(
      result.rows.map((row) => {
        const mapped = mapAreaRow(row);
        return [mapped.areaRef, mapped] as const;
      }),
    );
    const projected = await this.listProjectedByAreaRefs(areaRefs);
    for (const [areaRef, projectedRecord] of projected) {
      recordsByAreaRef.set(areaRef, projectedRecord);
    }

    return areaRefs
      .map((areaRef) => recordsByAreaRef.get(areaRef))
      .filter((record): record is BakkiAreaMetricsRecord => Boolean(record));
  }

  async listLatestObservationRefsByAreaRefs(areaRefs: string[]) {
    await this.ensureSchema();
    if (areaRefs.length === 0) {
      return new Map<string, string>();
    }

    const result = await this.bakkiCore.query<{
      area_ref: string;
      id: number | string;
    }>(
      `
        select distinct on (area_ref)
          area_ref,
          id
        from bakki_area_observation
        where area_ref = any($1::text[])
        order by area_ref asc, observed_at desc, id desc
      `,
      [areaRefs],
    );

    return new Map(
      result.rows.map((row) => [row.area_ref, `observation-${Number(row.id)}`] as const),
    );
  }

  async updateMetrics(input: UpdateAreaMetricsInput) {
    await this.ensureSchema();
    const area = await this.requireAreaCatalogRecord(input.areaRef);
    return this.bakkiCore.withClient(async (client) => {
      const result = await client.query<BakkiAreaMetricsRow>(
        `
          insert into bakki_area_metrics (
            area_ref,
            zone_ref,
            area_name,
            current_density_per_100sqm,
            current_tree_count,
            updated_at
          )
          values ($1, $2, $3, $4, $5, now())
          on conflict (area_ref)
          do update set
            current_density_per_100sqm = excluded.current_density_per_100sqm,
            current_tree_count = coalesce(excluded.current_tree_count, bakki_area_metrics.current_tree_count),
            updated_at = now()
          returning
            area_ref,
            zone_ref,
            area_name,
            current_density_per_100sqm,
            current_tree_count,
            updated_at
        `,
        [
          input.areaRef,
          area.zoneRef,
          area.areaName,
          input.densityPer100Sqm,
          typeof input.treeCount === 'number' ? Math.round(input.treeCount) : null,
        ],
      );

      return mapAreaRow(requireFirstRow(result.rows, 'Failed to upsert Bakki area metrics.'));
    });
  }

  async recordObservation(input: RecordAreaObservationInput) {
    await this.ensureSchema();

    return this.bakkiCore.withClient(async (client) => {
      const metrics = await this.updateMetricsWithClient(client, {
        areaRef: input.areaRef,
        densityPer100Sqm: input.densityPer100Sqm,
        treeCount:
          typeof input.treeCount === 'number'
            ? Math.round(input.treeCount)
            : input.treeCount === null
              ? null
              : undefined,
      });

      const observationResult = await client.query<BakkiAreaObservationRow>(
        `
          insert into bakki_area_observation (
            area_ref,
            task_ref,
            actor_user_id,
            measured_density_per_100sqm,
            measured_tree_count,
            notes,
            observed_at
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning id, observed_at
        `,
        [
          input.areaRef,
          input.taskRef ?? null,
          input.actorUserId ?? null,
          input.densityPer100Sqm,
          typeof input.treeCount === 'number' ? Math.round(input.treeCount) : null,
          input.notes?.trim() || null,
          input.observedAt?.trim() || new Date().toISOString(),
        ],
      );
      const observation = requireFirstRow(
        observationResult.rows,
        'Failed to insert Bakki area observation.',
      );

      return {
        areaMetrics: metrics,
        observationId: `observation-${Number(observation.id)}`,
        recordedAt:
          observation.observed_at instanceof Date
            ? observation.observed_at.toISOString()
            : new Date(observation.observed_at).toISOString(),
      };
    });
  }

  private async updateMetricsWithClient(client: PoolClient, input: UpdateAreaMetricsInput) {
    const area = await this.requireAreaCatalogRecord(input.areaRef);
    const result = await client.query<BakkiAreaMetricsRow>(
      `
        insert into bakki_area_metrics (
          area_ref,
          zone_ref,
          area_name,
          current_density_per_100sqm,
          current_tree_count,
          updated_at
        )
        values ($1, $2, $3, $4, $5, now())
        on conflict (area_ref)
        do update set
          current_density_per_100sqm = excluded.current_density_per_100sqm,
          current_tree_count = coalesce(excluded.current_tree_count, bakki_area_metrics.current_tree_count),
          updated_at = now()
        returning
          area_ref,
          zone_ref,
          area_name,
          current_density_per_100sqm,
          current_tree_count,
          updated_at
      `,
      [
        input.areaRef,
        area.zoneRef,
        area.areaName,
        input.densityPer100Sqm,
        typeof input.treeCount === 'number' ? Math.round(input.treeCount) : null,
      ],
    );

    return mapAreaRow(requireFirstRow(result.rows, 'Failed to upsert Bakki area metrics.'));
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
      create table if not exists bakki_area_metrics (
        area_ref text primary key references bakki_area(area_ref) on delete cascade,
        zone_ref text,
        area_name text not null,
        current_density_per_100sqm numeric not null,
        current_tree_count integer,
        updated_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create table if not exists bakki_area_observation (
        id bigserial primary key,
        area_ref text not null references bakki_area(area_ref) on delete cascade,
        task_ref text,
        actor_user_id bigint references bakki_user(id) on delete set null,
        measured_density_per_100sqm numeric not null,
        measured_tree_count integer,
        notes text,
        observed_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create index if not exists bakki_area_metrics_zone_ref_idx
      on bakki_area_metrics (zone_ref)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_area_observation_area_ref_idx
      on bakki_area_observation (area_ref, observed_at desc)
    `);
    await this.bakkiCore.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conname = 'bakki_area_metrics_area_ref_fkey'
        ) then
          alter table bakki_area_metrics
          add constraint bakki_area_metrics_area_ref_fkey
          foreign key (area_ref) references bakki_area(area_ref) on delete cascade;
        end if;
      end
      $$;
    `);
    await this.bakkiCore.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conname = 'bakki_area_observation_area_ref_fkey'
        ) then
          alter table bakki_area_observation
          add constraint bakki_area_observation_area_ref_fkey
          foreign key (area_ref) references bakki_area(area_ref) on delete cascade;
        end if;
      end
      $$;
    `);

    this.schemaEnsured = true;
  }

  private async listProjectedByAreaRefs(areaRefs: string[]) {
    if (!this.bakkiTreeSurvey.isConfigured() || areaRefs.length === 0) {
      return new Map<string, BakkiAreaMetricsRecord>();
    }

    try {
      const rollups = await this.bakkiTreeSurvey.listAreaRollups(areaRefs);
      if (rollups.size === 0) {
        return new Map<string, BakkiAreaMetricsRecord>();
      }

      const areaCatalog = await this.bakkiGeometry.getAreasByRefs([...rollups.keys()]);
      return new Map(
        [...rollups.values()].map((rollup) => {
          const area = areaCatalog.get(rollup.areaRef);
          return [
            rollup.areaRef,
            {
              areaRef: rollup.areaRef,
              zoneRef: rollup.zoneRef ?? area?.zoneRef ?? null,
              areaName: area?.areaName ?? rollup.areaRef,
              currentDensityPer100Sqm: rollup.estimatedDensityPer100Sqm,
              currentTreeCount: Math.round(rollup.estimatedTreeCount),
              source: 'plot_estimate_projection',
              updatedAt: rollup.updatedAt,
            } satisfies BakkiAreaMetricsRecord,
          ] as const;
        }),
      );
    } catch {
      return new Map<string, BakkiAreaMetricsRecord>();
    }
  }

  private async requireAreaCatalogRecord(areaRef: string) {
    const areaCatalog = await this.bakkiGeometry.getAreasByRefs([areaRef]);
    const area = areaCatalog.get(areaRef);
    if (!area) {
      throw new Error(`Area ${areaRef} is not present in Bakki Core geometry.`);
    }

    return area;
  }
}

interface BakkiAreaMetricsRow {
  area_name: string;
  area_ref: string;
  current_density_per_100sqm: number | string;
  current_tree_count: number | null;
  updated_at: Date | string;
  zone_ref: string | null;
}

interface BakkiAreaObservationRow {
  id: number | string;
  observed_at: Date | string;
}

function mapAreaRow(row: BakkiAreaMetricsRow): BakkiAreaMetricsRecord {
  return {
    areaRef: row.area_ref,
    zoneRef: row.zone_ref,
    areaName: row.area_name,
    currentDensityPer100Sqm: Number(row.current_density_per_100sqm),
    currentTreeCount: row.current_tree_count === null ? null : Number(row.current_tree_count),
    source: 'legacy_area_metrics',
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString(),
  };
}
