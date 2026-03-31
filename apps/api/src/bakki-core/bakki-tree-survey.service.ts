import { Injectable } from '@nestjs/common';
import type { GeoJsonGeometry } from '@bakki/domain';
import type { PoolClient } from 'pg';
import { BakkiCoreService } from './bakki-core.service';
import { BakkiGeometryService } from './bakki-geometry.service';
import { requireFirstRow } from './query-result.utils';
import { ensureSchemaInitialized } from './schema-init.utils';

export interface BakkiTreePlotRecord {
  areaHectares: number | null;
  createdAt: string;
  createdByUserId: number | null;
  description: string | null;
  geometry: GeoJsonGeometry;
  name: string;
  plotRef: string;
  ranchRef: string;
  updatedAt: string;
}

export interface BakkiTreePlotEstimateRecord {
  confidenceLevel: 'low' | 'medium' | 'high';
  coveredAreaSqm: number;
  coverageRatio: number;
  estimatedDensityPer100Sqm: number;
  estimatedTreeCount: number;
  meanDiameterCm: number | null;
  meanHeightM: number | null;
  sampleCount: number;
  updatedAt: string;
}

export interface BakkiTreePlotSummaryRecord extends Omit<BakkiTreePlotRecord, 'createdByUserId' | 'geometry'> {
  estimate: BakkiTreePlotEstimateRecord | null;
}

export interface BakkiTreePlotSampleRecord {
  actorUserId: number | null;
  id: string;
  measuredDensityPer100Sqm: number;
  meanDiameterCm: number | null;
  meanHeightM: number | null;
  notes: string | null;
  plotRef: string;
  sampleGeometry: GeoJsonGeometry | null;
  sampledAreaSqm: number;
  sampledAt: string;
  sizeDistribution: Array<Record<string, unknown>> | null;
  taskRef: string | null;
  treeCount: number;
}

export interface CreateTreePlotInput {
  createdByUserId?: number | null;
  description?: string;
  geometry: GeoJsonGeometry;
  name: string;
  plotRef?: string;
  ranchRef?: string;
}

export interface UpdateTreePlotInput {
  description?: string;
  geometry?: GeoJsonGeometry;
  name?: string;
}

export interface RecordTreePlotSampleInput {
  actorUserId?: number | null;
  densityPer100Sqm: number;
  meanDiameterCm?: number | null;
  meanHeightM?: number | null;
  notes?: string;
  sampleGeometry?: GeoJsonGeometry | null;
  sampledAreaSqm?: number;
  sampledAt?: string;
  sizeDistribution?: Array<Record<string, unknown>> | null;
  taskRef?: string | null;
  treeCount?: number;
}

export interface TreePlotAreaRollupRecord {
  areaRef: string;
  estimatedDensityPer100Sqm: number;
  estimatedTreeCount: number;
  meanDiameterCm: number | null;
  meanHeightM: number | null;
  overlapAreaSqm: number;
  plotCount: number;
  updatedAt: string;
  zoneRef: string | null;
}

export interface TreePlotZoneRollupRecord {
  estimatedDensityPer100Sqm: number;
  estimatedTreeCount: number;
  meanDiameterCm: number | null;
  meanHeightM: number | null;
  overlapAreaSqm: number;
  plotCount: number;
  updatedAt: string;
  zoneRef: string;
}

@Injectable()
export class BakkiTreeSurveyService {
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(
    private readonly bakkiCore: BakkiCoreService,
    private readonly bakkiGeometry: BakkiGeometryService,
  ) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async listPlots(ranchRef?: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<TreePlotSummaryRow>(
      `
        select
          p.plot_ref,
          p.ranch_ref,
          p.name,
          p.description,
          p.area_hectares,
          p.created_at,
          p.updated_at,
          e.estimated_tree_count,
          e.estimated_density_per_100sqm,
          e.mean_height_m,
          e.mean_diameter_cm,
          e.covered_area_sqm,
          e.coverage_ratio,
          e.sample_count,
          e.confidence_level,
          e.computed_at
        from bakki_tree_plot p
        left join bakki_tree_plot_estimate e on e.plot_ref = p.plot_ref
        where ($1::text is null or p.ranch_ref = $1)
        order by p.updated_at desc, p.plot_ref asc
      `,
      [ranchRef ?? null],
    );

    return result.rows.map(mapPlotSummaryRow);
  }

  async getPlot(plotRef: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<TreePlotDetailRow>(
      `
        select
          p.plot_ref,
          p.ranch_ref,
          p.name,
          p.description,
          p.area_hectares,
          p.created_by_user_id,
          p.created_at,
          p.updated_at,
          ST_AsGeoJSON(p.boundary_geometry)::text as geometry_geojson,
          e.estimated_tree_count,
          e.estimated_density_per_100sqm,
          e.mean_height_m,
          e.mean_diameter_cm,
          e.covered_area_sqm,
          e.coverage_ratio,
          e.sample_count,
          e.confidence_level,
          e.computed_at
        from bakki_tree_plot p
        left join bakki_tree_plot_estimate e on e.plot_ref = p.plot_ref
        where p.plot_ref = $1
        limit 1
      `,
      [plotRef],
    );

    const row = result.rows[0];
    return row ? mapPlotDetailRow(row) : null;
  }

  async createPlot(input: CreateTreePlotInput) {
    await this.ensureSchema();
    await this.bakkiGeometry.ensureAreaCatalog();

    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new Error('Plot name is required.');
    }

    return this.bakkiCore.withClient(async (client) => {
      await client.query('begin');
      try {
        const ranchRef = input.ranchRef?.trim() || 'ranch-main';
        const plotRef = input.plotRef?.trim() || `plot-${Date.now()}`;
        const inserted = await client.query<TreePlotDetailRow>(
          `
            insert into bakki_tree_plot (
              plot_ref,
              ranch_ref,
              name,
              description,
              boundary_geometry,
              bbox,
              area_hectares,
              created_by_user_id,
              created_at,
              updated_at
            )
            values (
              $1,
              $2,
              $3,
              $4,
              ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), 3)),
              ST_Envelope(ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), 3))),
              round((ST_Area(ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), 3))::geography) / 10000.0)::numeric, 2),
              $6,
              now(),
              now()
            )
            returning
              plot_ref,
              ranch_ref,
              name,
              description,
              area_hectares,
              created_by_user_id,
              created_at,
              updated_at,
              ST_AsGeoJSON(boundary_geometry)::text as geometry_geojson,
              null::numeric as estimated_tree_count,
              null::numeric as estimated_density_per_100sqm,
              null::numeric as mean_height_m,
              null::numeric as mean_diameter_cm,
              null::numeric as covered_area_sqm,
              null::numeric as coverage_ratio,
              null::integer as sample_count,
              null::text as confidence_level,
              null::timestamptz as computed_at
          `,
          [
            plotRef,
            ranchRef,
            normalizedName,
            input.description?.trim() || null,
            JSON.stringify(input.geometry),
            input.createdByUserId ?? null,
          ],
        );

        const created = requireFirstRow(inserted.rows, 'Failed to create tree survey plot.');
        await this.recomputeEstimateWithClient(client, created.plot_ref);
        await client.query('commit');
        const persisted = await this.getPlot(created.plot_ref);
        return requireFirstRow(
          persisted ? [persisted] : [],
          `Failed to reload created tree survey plot ${created.plot_ref}.`,
        );
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      }
    });
  }

  async updatePlot(plotRef: string, input: UpdateTreePlotInput) {
    await this.ensureSchema();
    const patches: string[] = [];
    const params: unknown[] = [];
    let parameterIndex = 1;

    if (typeof input.name === 'string') {
      const normalized = input.name.trim();
      if (!normalized) {
        throw new Error('Plot name is required.');
      }
      patches.push(`name = $${parameterIndex}`);
      params.push(normalized);
      parameterIndex += 1;
    }

    if (typeof input.description === 'string') {
      patches.push(`description = $${parameterIndex}`);
      params.push(input.description.trim() || null);
      parameterIndex += 1;
    }

    if (input.geometry) {
      const geometryParamIndex = parameterIndex;
      patches.push(
        `boundary_geometry = ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($${geometryParamIndex}), 4326), 3))`,
      );
      params.push(JSON.stringify(input.geometry));
      parameterIndex += 1;
      patches.push(
        `bbox = ST_Envelope(ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($${geometryParamIndex}), 4326), 3)))`,
      );
      patches.push(
        `area_hectares = round((ST_Area(ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($${geometryParamIndex}), 4326), 3))::geography) / 10000.0)::numeric, 2)`,
      );
    }

    if (patches.length === 0) {
      return this.getPlot(plotRef);
    }

    return this.bakkiCore.withClient(async (client) => {
      await client.query('begin');
      try {
        params.push(plotRef);
        const result = await client.query<{ plot_ref: string }>(
          `
            update bakki_tree_plot
            set
              ${patches.join(', ')},
              updated_at = now()
            where plot_ref = $${parameterIndex}
            returning plot_ref
          `,
          params,
        );
        const row = result.rows[0];
        if (!row) {
          await client.query('rollback');
          return null;
        }

        await this.recomputeEstimateWithClient(client, row.plot_ref);
        await client.query('commit');
        return this.getPlot(row.plot_ref);
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      }
    });
  }

  async listSamples(plotRef: string) {
    await this.ensureSchema();
    const result = await this.bakkiCore.query<TreePlotSampleRow>(
      `
        select
          id,
          plot_ref,
          sampled_area_sqm,
          measured_density_per_100sqm,
          tree_count,
          mean_height_m,
          mean_diameter_cm,
          size_distribution,
          actor_user_id,
          task_ref,
          notes,
          sampled_at,
          ST_AsGeoJSON(sample_geometry)::text as sample_geometry_geojson
        from bakki_tree_plot_sample
        where plot_ref = $1
        order by sampled_at desc, id desc
      `,
      [plotRef],
    );
    return result.rows.map(mapSampleRow);
  }

  async recordSample(plotRef: string, input: RecordTreePlotSampleInput) {
    await this.ensureSchema();
    if (!Number.isFinite(input.densityPer100Sqm) || input.densityPer100Sqm <= 0) {
      throw new Error('Sample density must be a positive number.');
    }

    if (
      typeof input.treeCount === 'number'
      && (!Number.isFinite(input.treeCount) || input.treeCount < 0)
    ) {
      throw new Error('Sample tree count must be zero or a positive number.');
    }

    if (
      typeof input.sampledAreaSqm === 'number'
      && (!Number.isFinite(input.sampledAreaSqm) || input.sampledAreaSqm <= 0)
    ) {
      throw new Error('Sampled area must be a positive number when provided.');
    }

    return this.bakkiCore.withClient(async (client) => {
      await client.query('begin');
      try {
        const sampledAreaSqm = await resolveSampledAreaSqm(client, {
          densityPer100Sqm: input.densityPer100Sqm,
          sampleGeometry: input.sampleGeometry,
          sampledAreaSqm: input.sampledAreaSqm,
          treeCount: input.treeCount,
        });
        const treeCount = typeof input.treeCount === 'number'
          ? Math.round(input.treeCount)
          : Math.max(0, Math.round((input.densityPer100Sqm * sampledAreaSqm) / 100));

        const insertResult = await client.query<TreePlotSampleRow>(
          `
            insert into bakki_tree_plot_sample (
              plot_ref,
              sample_geometry,
              sampled_area_sqm,
              measured_density_per_100sqm,
              tree_count,
              mean_height_m,
              mean_diameter_cm,
              size_distribution,
              actor_user_id,
              task_ref,
              notes,
              sampled_at,
              created_at
            )
            values (
              $1,
              case when $2::text is null then null else ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 3)) end,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8::jsonb,
              $9,
              $10,
              $11,
              $12::timestamptz,
              now()
            )
            returning
              id,
              plot_ref,
              sampled_area_sqm,
              measured_density_per_100sqm,
              tree_count,
              mean_height_m,
              mean_diameter_cm,
              size_distribution,
              actor_user_id,
              task_ref,
              notes,
              sampled_at,
              ST_AsGeoJSON(sample_geometry)::text as sample_geometry_geojson
          `,
          [
            plotRef,
            input.sampleGeometry ? JSON.stringify(input.sampleGeometry) : null,
            sampledAreaSqm,
            input.densityPer100Sqm,
            treeCount,
            normalizeNullableNumeric(input.meanHeightM),
            normalizeNullableNumeric(input.meanDiameterCm),
            input.sizeDistribution ? JSON.stringify(input.sizeDistribution) : null,
            input.actorUserId ?? null,
            input.taskRef ?? null,
            input.notes?.trim() || null,
            input.sampledAt?.trim() || new Date().toISOString(),
          ],
        );
        const inserted = requireFirstRow(
          insertResult.rows,
          `Failed to insert sample for plot ${plotRef}.`,
        );
        await this.recomputeEstimateWithClient(client, plotRef);
        await client.query('commit');
        return mapSampleRow(inserted);
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      }
    });
  }

  async listAreaRollups(areaRefs: string[]) {
    await this.ensureSchema();
    if (areaRefs.length === 0) {
      return new Map<string, TreePlotAreaRollupRecord>();
    }

    const result = await this.bakkiCore.query<TreePlotAreaRollupRow>(
      `
        with overlap as (
          select
            a.area_ref,
            a.zone_ref,
            p.plot_ref,
            e.estimated_density_per_100sqm,
            e.mean_height_m,
            e.mean_diameter_cm,
            e.computed_at,
            ST_Area(ST_Intersection(p.boundary_geometry, a.boundary_geometry)::geography) as overlap_area_sqm
          from bakki_area a
          join bakki_tree_plot p on ST_Intersects(p.boundary_geometry, a.boundary_geometry)
          join bakki_tree_plot_estimate e on e.plot_ref = p.plot_ref
          where a.area_ref = any($1::text[])
        )
        select
          area_ref,
          zone_ref,
          sum(overlap_area_sqm) as overlap_area_sqm,
          case
            when sum(overlap_area_sqm) > 0
              then sum(estimated_density_per_100sqm * overlap_area_sqm) / sum(overlap_area_sqm)
            else null
          end as estimated_density_per_100sqm,
          round(sum((estimated_density_per_100sqm * overlap_area_sqm) / 100.0)) as estimated_tree_count,
          case
            when sum(case when mean_height_m is not null then overlap_area_sqm else 0 end) > 0
              then sum(coalesce(mean_height_m, 0) * overlap_area_sqm)
                / sum(case when mean_height_m is not null then overlap_area_sqm else 0 end)
            else null
          end as mean_height_m,
          case
            when sum(case when mean_diameter_cm is not null then overlap_area_sqm else 0 end) > 0
              then sum(coalesce(mean_diameter_cm, 0) * overlap_area_sqm)
                / sum(case when mean_diameter_cm is not null then overlap_area_sqm else 0 end)
            else null
          end as mean_diameter_cm,
          count(distinct plot_ref)::integer as plot_count,
          max(computed_at) as updated_at
        from overlap
        where overlap_area_sqm > 0
        group by area_ref, zone_ref
      `,
      [areaRefs],
    );

    return new Map(
      result.rows.map((row) => [row.area_ref, mapAreaRollupRow(row)] as const),
    );
  }

  async listZoneRollups(zoneRefs: string[]) {
    await this.ensureSchema();
    if (zoneRefs.length === 0) {
      return new Map<string, TreePlotZoneRollupRecord>();
    }

    const result = await this.bakkiCore.query<TreePlotZoneRollupRow>(
      `
        with overlap as (
          select
            z.zone_ref,
            p.plot_ref,
            e.estimated_density_per_100sqm,
            e.mean_height_m,
            e.mean_diameter_cm,
            e.computed_at,
            ST_Area(ST_Intersection(p.boundary_geometry, z.boundary_geometry)::geography) as overlap_area_sqm
          from bakki_zone z
          join bakki_tree_plot p on ST_Intersects(p.boundary_geometry, z.boundary_geometry)
          join bakki_tree_plot_estimate e on e.plot_ref = p.plot_ref
          where z.zone_ref = any($1::text[])
        )
        select
          zone_ref,
          sum(overlap_area_sqm) as overlap_area_sqm,
          case
            when sum(overlap_area_sqm) > 0
              then sum(estimated_density_per_100sqm * overlap_area_sqm) / sum(overlap_area_sqm)
            else null
          end as estimated_density_per_100sqm,
          round(sum((estimated_density_per_100sqm * overlap_area_sqm) / 100.0)) as estimated_tree_count,
          case
            when sum(case when mean_height_m is not null then overlap_area_sqm else 0 end) > 0
              then sum(coalesce(mean_height_m, 0) * overlap_area_sqm)
                / sum(case when mean_height_m is not null then overlap_area_sqm else 0 end)
            else null
          end as mean_height_m,
          case
            when sum(case when mean_diameter_cm is not null then overlap_area_sqm else 0 end) > 0
              then sum(coalesce(mean_diameter_cm, 0) * overlap_area_sqm)
                / sum(case when mean_diameter_cm is not null then overlap_area_sqm else 0 end)
            else null
          end as mean_diameter_cm,
          count(distinct plot_ref)::integer as plot_count,
          max(computed_at) as updated_at
        from overlap
        where overlap_area_sqm > 0
        group by zone_ref
      `,
      [zoneRefs],
    );

    return new Map(
      result.rows.map((row) => [row.zone_ref, mapZoneRollupRow(row)] as const),
    );
  }

  private async recomputeEstimateWithClient(client: PoolClient, plotRef: string) {
    const aggregation = await client.query<TreePlotAggregateRow>(
      `
        select
          p.plot_ref,
          coalesce(ST_Area(p.boundary_geometry::geography), 0) as plot_area_sqm,
          coalesce(sum(s.sampled_area_sqm), 0) as covered_area_sqm,
          count(s.id)::integer as sample_count,
          case
            when coalesce(sum(s.sampled_area_sqm), 0) > 0
              then sum(s.measured_density_per_100sqm * s.sampled_area_sqm)
                / sum(s.sampled_area_sqm)
            else null
          end as weighted_density_per_100sqm,
          case
            when coalesce(sum(case when s.mean_height_m is not null then s.sampled_area_sqm else 0 end), 0) > 0
              then sum(coalesce(s.mean_height_m, 0) * s.sampled_area_sqm)
                / sum(case when s.mean_height_m is not null then s.sampled_area_sqm else 0 end)
            else null
          end as weighted_mean_height_m,
          case
            when coalesce(sum(case when s.mean_diameter_cm is not null then s.sampled_area_sqm else 0 end), 0) > 0
              then sum(coalesce(s.mean_diameter_cm, 0) * s.sampled_area_sqm)
                / sum(case when s.mean_diameter_cm is not null then s.sampled_area_sqm else 0 end)
            else null
          end as weighted_mean_diameter_cm
        from bakki_tree_plot p
        left join bakki_tree_plot_sample s on s.plot_ref = p.plot_ref
        where p.plot_ref = $1
        group by p.plot_ref, p.boundary_geometry
      `,
      [plotRef],
    );

    const row = aggregation.rows[0];
    if (!row) {
      return null;
    }

    const plotAreaSqm = Math.max(0, Number(row.plot_area_sqm ?? 0));
    const coveredAreaSqm = Math.max(0, Number(row.covered_area_sqm ?? 0));
    const sampleCount = Number(row.sample_count ?? 0);
    const weightedDensity = normalizeNullableNumeric(row.weighted_density_per_100sqm);
    const estimatedDensityPer100Sqm = weightedDensity ?? 0;
    const estimatedTreeCount = Math.round((estimatedDensityPer100Sqm * plotAreaSqm) / 100);
    const coverageRatio = plotAreaSqm > 0 ? Math.min(1, coveredAreaSqm / plotAreaSqm) : 0;
    const confidenceLevel = toConfidenceLevel(sampleCount, coverageRatio);

    if (sampleCount === 0 || estimatedDensityPer100Sqm <= 0) {
      await client.query(
        'delete from bakki_tree_plot_estimate where plot_ref = $1',
        [plotRef],
      );
      return null;
    }

    await client.query(
      `
        insert into bakki_tree_plot_estimate (
          plot_ref,
          estimated_tree_count,
          estimated_density_per_100sqm,
          mean_height_m,
          mean_diameter_cm,
          covered_area_sqm,
          coverage_ratio,
          sample_count,
          confidence_level,
          computed_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        on conflict (plot_ref)
        do update set
          estimated_tree_count = excluded.estimated_tree_count,
          estimated_density_per_100sqm = excluded.estimated_density_per_100sqm,
          mean_height_m = excluded.mean_height_m,
          mean_diameter_cm = excluded.mean_diameter_cm,
          covered_area_sqm = excluded.covered_area_sqm,
          coverage_ratio = excluded.coverage_ratio,
          sample_count = excluded.sample_count,
          confidence_level = excluded.confidence_level,
          computed_at = now()
      `,
      [
        plotRef,
        estimatedTreeCount,
        estimatedDensityPer100Sqm,
        normalizeNullableNumeric(row.weighted_mean_height_m),
        normalizeNullableNumeric(row.weighted_mean_diameter_cm),
        coveredAreaSqm,
        coverageRatio,
        sampleCount,
        confidenceLevel,
      ],
    );

    return {
      confidenceLevel,
      coveredAreaSqm,
      coverageRatio,
      estimatedDensityPer100Sqm,
      estimatedTreeCount,
      meanDiameterCm: normalizeNullableNumeric(row.weighted_mean_diameter_cm),
      meanHeightM: normalizeNullableNumeric(row.weighted_mean_height_m),
      sampleCount,
      updatedAt: new Date().toISOString(),
    } satisfies BakkiTreePlotEstimateRecord;
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
      create table if not exists bakki_tree_plot (
        plot_ref text primary key,
        ranch_ref text not null references bakki_ranch(ranch_ref) on delete cascade,
        name text not null,
        description text,
        boundary_geometry geometry(MultiPolygon, 4326) not null,
        bbox geometry(Polygon, 4326),
        area_hectares numeric,
        created_by_user_id bigint references bakki_user(id) on delete set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);
    await this.bakkiCore.query(`
      create table if not exists bakki_tree_plot_sample (
        id bigserial primary key,
        plot_ref text not null references bakki_tree_plot(plot_ref) on delete cascade,
        sample_geometry geometry(MultiPolygon, 4326),
        sampled_area_sqm numeric not null check (sampled_area_sqm > 0),
        measured_density_per_100sqm numeric not null check (measured_density_per_100sqm > 0),
        tree_count integer not null check (tree_count >= 0),
        mean_height_m numeric,
        mean_diameter_cm numeric,
        size_distribution jsonb,
        actor_user_id bigint references bakki_user(id) on delete set null,
        task_ref text,
        notes text,
        sampled_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      )
    `);
    await this.bakkiCore.query(`
      create table if not exists bakki_tree_plot_estimate (
        plot_ref text primary key references bakki_tree_plot(plot_ref) on delete cascade,
        estimated_tree_count numeric not null,
        estimated_density_per_100sqm numeric not null,
        mean_height_m numeric,
        mean_diameter_cm numeric,
        covered_area_sqm numeric not null,
        coverage_ratio numeric not null,
        sample_count integer not null,
        confidence_level text not null check (confidence_level in ('low', 'medium', 'high')),
        computed_at timestamptz not null default now()
      )
    `);

    await this.bakkiCore.query(`
      create index if not exists bakki_tree_plot_boundary_geometry_gix
      on bakki_tree_plot using gist (boundary_geometry)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_tree_plot_ranch_ref_idx
      on bakki_tree_plot (ranch_ref)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_tree_plot_sample_plot_ref_idx
      on bakki_tree_plot_sample (plot_ref, sampled_at desc)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_tree_plot_sample_geometry_gix
      on bakki_tree_plot_sample using gist (sample_geometry)
    `);
    this.schemaEnsured = true;
  }
}

interface TreePlotSummaryRow {
  area_hectares: number | string | null;
  confidence_level: string | null;
  computed_at: Date | string | null;
  covered_area_sqm: number | string | null;
  coverage_ratio: number | string | null;
  created_at: Date | string;
  description: string | null;
  estimated_density_per_100sqm: number | string | null;
  estimated_tree_count: number | string | null;
  mean_diameter_cm: number | string | null;
  mean_height_m: number | string | null;
  name: string;
  plot_ref: string;
  ranch_ref: string;
  sample_count: number | string | null;
  updated_at: Date | string;
}

interface TreePlotDetailRow extends TreePlotSummaryRow {
  created_by_user_id: number | null;
  geometry_geojson: string;
}

interface TreePlotSampleRow {
  actor_user_id: number | null;
  id: number | string;
  measured_density_per_100sqm: number | string;
  mean_diameter_cm: number | string | null;
  mean_height_m: number | string | null;
  notes: string | null;
  plot_ref: string;
  sample_geometry_geojson: string | null;
  sampled_area_sqm: number | string;
  sampled_at: Date | string;
  size_distribution: Array<Record<string, unknown>> | null;
  task_ref: string | null;
  tree_count: number | string;
}

interface TreePlotAggregateRow {
  covered_area_sqm: number | string;
  plot_area_sqm: number | string;
  plot_ref: string;
  sample_count: number | string;
  weighted_density_per_100sqm: number | string | null;
  weighted_mean_diameter_cm: number | string | null;
  weighted_mean_height_m: number | string | null;
}

interface TreePlotAreaRollupRow {
  area_ref: string;
  estimated_density_per_100sqm: number | string | null;
  estimated_tree_count: number | string | null;
  mean_diameter_cm: number | string | null;
  mean_height_m: number | string | null;
  overlap_area_sqm: number | string;
  plot_count: number | string;
  updated_at: Date | string | null;
  zone_ref: string | null;
}

interface TreePlotZoneRollupRow {
  estimated_density_per_100sqm: number | string | null;
  estimated_tree_count: number | string | null;
  mean_diameter_cm: number | string | null;
  mean_height_m: number | string | null;
  overlap_area_sqm: number | string;
  plot_count: number | string;
  updated_at: Date | string | null;
  zone_ref: string;
}

function mapPlotSummaryRow(row: TreePlotSummaryRow): BakkiTreePlotSummaryRecord {
  return {
    plotRef: row.plot_ref,
    ranchRef: row.ranch_ref,
    name: row.name,
    description: row.description,
    areaHectares: normalizeNullableNumeric(row.area_hectares),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    estimate: mapEstimateRow(row),
  };
}

function mapPlotDetailRow(row: TreePlotDetailRow): BakkiTreePlotRecord & {
  estimate: BakkiTreePlotEstimateRecord | null;
} {
  return {
    ...mapPlotSummaryRow(row),
    createdByUserId: row.created_by_user_id === null ? null : Number(row.created_by_user_id),
    geometry: JSON.parse(row.geometry_geojson) as GeoJsonGeometry,
  };
}

function mapEstimateRow(row: TreePlotSummaryRow): BakkiTreePlotEstimateRecord | null {
  if (
    row.estimated_density_per_100sqm === null
    || row.estimated_tree_count === null
    || row.sample_count === null
    || !row.confidence_level
  ) {
    return null;
  }

  return {
    confidenceLevel: asConfidenceLevel(row.confidence_level),
    coveredAreaSqm: Number(row.covered_area_sqm ?? 0),
    coverageRatio: Number(row.coverage_ratio ?? 0),
    estimatedDensityPer100Sqm: Number(row.estimated_density_per_100sqm),
    estimatedTreeCount: Number(row.estimated_tree_count),
    meanHeightM: normalizeNullableNumeric(row.mean_height_m),
    meanDiameterCm: normalizeNullableNumeric(row.mean_diameter_cm),
    sampleCount: Number(row.sample_count),
    updatedAt: row.computed_at ? toIsoString(row.computed_at) : toIsoString(row.updated_at),
  };
}

function mapSampleRow(row: TreePlotSampleRow): BakkiTreePlotSampleRecord {
  return {
    id: `sample-${Number(row.id)}`,
    plotRef: row.plot_ref,
    sampledAreaSqm: Number(row.sampled_area_sqm),
    measuredDensityPer100Sqm: Number(row.measured_density_per_100sqm),
    treeCount: Number(row.tree_count),
    meanHeightM: normalizeNullableNumeric(row.mean_height_m),
    meanDiameterCm: normalizeNullableNumeric(row.mean_diameter_cm),
    sizeDistribution: row.size_distribution ?? null,
    actorUserId: row.actor_user_id === null ? null : Number(row.actor_user_id),
    taskRef: row.task_ref,
    notes: row.notes,
    sampledAt: toIsoString(row.sampled_at),
    sampleGeometry: row.sample_geometry_geojson
      ? (JSON.parse(row.sample_geometry_geojson) as GeoJsonGeometry)
      : null,
  };
}

function mapAreaRollupRow(row: TreePlotAreaRollupRow): TreePlotAreaRollupRecord {
  return {
    areaRef: row.area_ref,
    zoneRef: row.zone_ref,
    overlapAreaSqm: Number(row.overlap_area_sqm),
    estimatedDensityPer100Sqm: Number(row.estimated_density_per_100sqm ?? 0),
    estimatedTreeCount: Number(row.estimated_tree_count ?? 0),
    meanHeightM: normalizeNullableNumeric(row.mean_height_m),
    meanDiameterCm: normalizeNullableNumeric(row.mean_diameter_cm),
    plotCount: Number(row.plot_count),
    updatedAt: row.updated_at ? toIsoString(row.updated_at) : new Date().toISOString(),
  };
}

function mapZoneRollupRow(row: TreePlotZoneRollupRow): TreePlotZoneRollupRecord {
  return {
    zoneRef: row.zone_ref,
    overlapAreaSqm: Number(row.overlap_area_sqm),
    estimatedDensityPer100Sqm: Number(row.estimated_density_per_100sqm ?? 0),
    estimatedTreeCount: Number(row.estimated_tree_count ?? 0),
    meanHeightM: normalizeNullableNumeric(row.mean_height_m),
    meanDiameterCm: normalizeNullableNumeric(row.mean_diameter_cm),
    plotCount: Number(row.plot_count),
    updatedAt: row.updated_at ? toIsoString(row.updated_at) : new Date().toISOString(),
  };
}

function asConfidenceLevel(value: string): 'low' | 'medium' | 'high' {
  return value === 'high' || value === 'medium' || value === 'low'
    ? value
    : 'low';
}

function toConfidenceLevel(
  sampleCount: number,
  coverageRatio: number,
): 'low' | 'medium' | 'high' {
  if (sampleCount >= 3 && coverageRatio >= 0.35) {
    return 'high';
  }
  if (sampleCount >= 2 && coverageRatio >= 0.15) {
    return 'medium';
  }
  return 'low';
}

function normalizeNullableNumeric(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function resolveSampledAreaSqm(
  client: PoolClient,
  input: Pick<RecordTreePlotSampleInput, 'densityPer100Sqm' | 'sampleGeometry' | 'sampledAreaSqm' | 'treeCount'>,
) {
  if (typeof input.sampledAreaSqm === 'number' && input.sampledAreaSqm > 0) {
    return input.sampledAreaSqm;
  }

  if (input.sampleGeometry) {
    const geometryResult = await client.query<{ sample_area_sqm: number | string | null }>(
      `
        select ST_Area(ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 3))::geography) as sample_area_sqm
      `,
      [JSON.stringify(input.sampleGeometry)],
    );
    const sampleAreaSqm = Number(geometryResult.rows[0]?.sample_area_sqm ?? 0);
    if (sampleAreaSqm > 0) {
      return sampleAreaSqm;
    }
  }

  const maybeTreeCount = normalizeNullableNumeric(input.treeCount);
  if (maybeTreeCount !== null && maybeTreeCount >= 0 && input.densityPer100Sqm > 0) {
    return Math.max(1, (maybeTreeCount * 100) / input.densityPer100Sqm);
  }

  return 100;
}

async function rollbackQuietly(client: PoolClient) {
  try {
    await client.query('rollback');
  } catch {
    // no-op
  }
}
