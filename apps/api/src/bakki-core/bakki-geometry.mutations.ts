import type { GeoJsonGeometry } from '@bakki/domain';
import type { PoolClient } from 'pg';
import { BakkiCoreService } from './bakki-core.service';
import { requireFirstRow } from './query-result.utils';

interface AreaCatalogRow {
  area_hectares_estimate?: number | string | null;
  area_name: string;
  area_ref: string;
  assigned_species_ref?: string | null;
  zone_ref: string;
}

interface ZoneCatalogRow {
  name: string;
  ranch_ref: string;
  zone_ref: string;
}

interface UpdateZoneGeometryRow extends ZoneCatalogRow {
  area_hectares_estimate: number | string | null;
  updated_at: string;
}

interface UpdateAreaDetailsRow {
  area_name: string;
  area_ref: string;
  assigned_species_ref?: string | null;
  updated_at: string;
  zone_ref: string;
}

interface DeleteAreaValidationRow {
  area_name: string;
  area_ref: string;
  has_phase_contract: boolean;
  zone_ref: string;
}

export interface ImportBakkiAreaGeometryInput {
  areaRef: string;
  geometry: GeoJsonGeometry;
  name: string;
  sourceFeatureName?: string | null;
  sourceFileName?: string | null;
  zoneRef?: string | null;
}

export interface ImportBakkiAreaGeometryRow {
  action: 'insert' | 'update';
  areaRef: string;
  hectaresEstimate: number | null;
  name: string;
  sourceFeatureName: string | null;
  sourceFileName: string | null;
  zoneRef: string;
}

export interface ImportBakkiAreaGeometryResult {
  dryRun: boolean;
  importedCount: number;
  rows: ImportBakkiAreaGeometryRow[];
}

export interface UpdateBakkiZoneGeometryResult {
  hectaresEstimate: number | null;
  ranchRef: string;
  updatedAt: string;
  zoneName: string;
  zoneRef: string;
}

export interface UpdateBakkiAreaDetailsResult {
  areaName: string;
  areaRef: string;
  speciesRef: string | null;
  updatedAt: string;
  zoneRef: string;
}

export interface DeleteBakkiAreaResult {
  areaName: string;
  areaRef: string;
  deletedAt: string;
  zoneRef: string;
}

export async function importBakkiAreaGeometry({
  bakkiCore,
  ensureSchema,
  inputs,
  options = {},
}: {
  bakkiCore: BakkiCoreService;
  ensureSchema: () => Promise<void>;
  inputs: ImportBakkiAreaGeometryInput[];
  options?: { dryRun?: boolean };
}): Promise<ImportBakkiAreaGeometryResult> {
  if (!bakkiCore.isConfigured()) {
    throw new Error('Bakki Core database is not configured.');
  }

  if (inputs.length === 0) {
    return {
      dryRun: Boolean(options.dryRun),
      importedCount: 0,
      rows: [],
    };
  }

  await ensureSchema();

  return bakkiCore.withClient(async (client) => {
    const dryRun = Boolean(options.dryRun);
    const rows: ImportBakkiAreaGeometryRow[] = [];

    await client.query('begin');
    try {
      for (const input of inputs) {
        const areaRef = input.areaRef.trim();
        const name = input.name.trim();
        if (!areaRef) {
          throw new Error('Area import requires a non-empty areaRef.');
        }
        if (!name) {
          throw new Error(`Area import requires a non-empty name for ${areaRef}.`);
        }

        const geometryJson = JSON.stringify(input.geometry);
        const zoneRef =
          input.zoneRef?.trim()
          || (await resolveZoneRefForGeometry(client, geometryJson, areaRef));
        const existing = await client.query<{ exists: number }>(
          `
            select 1 as exists
            from bakki_area
            where area_ref = $1
            limit 1
          `,
          [areaRef],
        );

        const result = await client.query<AreaCatalogRow>(
          `
            insert into bakki_area (
              area_ref,
              zone_ref,
              name,
              boundary_geometry,
              source_file_name,
              source_feature_name,
              updated_at
            )
            values (
              $1,
              $2,
              $3,
              ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), 3)),
              $5,
              $6,
              now()
            )
            on conflict (area_ref)
            do update set
              zone_ref = excluded.zone_ref,
              name = excluded.name,
              boundary_geometry = excluded.boundary_geometry,
              source_file_name = excluded.source_file_name,
              source_feature_name = excluded.source_feature_name,
              updated_at = now()
            returning
              area_ref,
              zone_ref,
              name as area_name,
              area_hectares_estimate
          `,
          [
            areaRef,
            zoneRef,
            name,
            geometryJson,
            input.sourceFileName?.trim() || null,
            input.sourceFeatureName?.trim() || null,
          ],
        );

        const row = requireFirstRow(result.rows, `Failed to upsert Bakki area geometry for ${areaRef}.`);
        rows.push({
          action: existing.rows.length > 0 ? 'update' : 'insert',
          areaRef: row.area_ref,
          hectaresEstimate:
            row.area_hectares_estimate === null || row.area_hectares_estimate === undefined
              ? null
              : Number(row.area_hectares_estimate),
          name: row.area_name,
          sourceFeatureName: input.sourceFeatureName?.trim() || null,
          sourceFileName: input.sourceFileName?.trim() || null,
          zoneRef: row.zone_ref,
        });
      }

      if (dryRun) {
        await client.query('rollback');
      } else {
        await client.query('commit');
      }

      return {
        dryRun,
        importedCount: rows.length,
        rows,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
}

export async function updateBakkiZoneGeometry({
  bakkiCore,
  ensureSchema,
  geometry,
  zoneRef,
}: {
  bakkiCore: BakkiCoreService;
  ensureSchema: () => Promise<void>;
  geometry: GeoJsonGeometry;
  zoneRef: string;
}): Promise<UpdateBakkiZoneGeometryResult> {
  if (!bakkiCore.isConfigured()) {
    throw new Error('Bakki Core database is not configured.');
  }

  const normalizedZoneRef = zoneRef.trim();
  if (!normalizedZoneRef) {
    throw new Error('Zone update requires a non-empty zoneRef.');
  }

  await ensureSchema();

  return bakkiCore.withClient(async (client) => {
    await client.query('begin');
    try {
      const zoneResult = await client.query<ZoneCatalogRow>(
        `
          select
            zone_ref,
            ranch_ref,
            name
          from bakki_zone
          where zone_ref = $1
          limit 1
        `,
        [normalizedZoneRef],
      );
      const zone = requireFirstRow(zoneResult.rows, `Editable zone not found for ${normalizedZoneRef}.`);
      const geometryJson = JSON.stringify(geometry);
      const validation = await client.query<{
        overlaps_sibling_zone: boolean;
        ranch_contains_geometry: boolean;
        uncovered_area_ref: string | null;
      }>(
        `
          with proposed as (
            select ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 3)) as geometry
          )
          select
            exists(
              select 1
              from bakki_zone sibling
              cross join proposed
              where sibling.ranch_ref = $3
                and sibling.zone_ref <> $1
                and ST_Intersects(proposed.geometry, sibling.boundary_geometry)
                and not ST_Touches(proposed.geometry, sibling.boundary_geometry)
            ) as overlaps_sibling_zone,
            exists(
              select 1
              from bakki_ranch ranch
              cross join proposed
              where ranch.ranch_ref = $3
                and ST_CoveredBy(proposed.geometry, ranch.boundary_geometry)
            ) as ranch_contains_geometry,
            (
              select area.area_ref
              from bakki_area area
              cross join proposed
              where area.zone_ref = $1
                and not ST_CoveredBy(area.boundary_geometry, proposed.geometry)
              order by area.area_ref asc
              limit 1
            ) as uncovered_area_ref
        `,
        [normalizedZoneRef, geometryJson, zone.ranch_ref],
      );
      const validationRow = requireFirstRow(
        validation.rows,
        `Could not validate geometry update for zone ${normalizedZoneRef}.`,
      );

      if (!validationRow.ranch_contains_geometry) {
        throw new Error(`Zone ${normalizedZoneRef} must stay fully within ranch ${zone.ranch_ref}.`);
      }

      if (validationRow.overlaps_sibling_zone) {
        throw new Error(`Zone ${normalizedZoneRef} overlaps another zone in ranch ${zone.ranch_ref}.`);
      }

      if (validationRow.uncovered_area_ref) {
        throw new Error(
          `Zone ${normalizedZoneRef} must continue covering area ${validationRow.uncovered_area_ref}.`,
        );
      }

      const updateResult = await client.query<UpdateZoneGeometryRow>(
        `
          update bakki_zone
          set
            boundary_geometry = ST_Multi(
              ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), 3)
            ),
            updated_at = now()
          where zone_ref = $1
          returning
            zone_ref,
            ranch_ref,
            name,
            area_hectares_estimate,
            updated_at
        `,
        [normalizedZoneRef, geometryJson],
      );
      const row = requireFirstRow(
        updateResult.rows,
        `Failed to update Bakki zone geometry for ${normalizedZoneRef}.`,
      );

      await client.query('commit');

      return {
        hectaresEstimate:
          row.area_hectares_estimate === null || row.area_hectares_estimate === undefined
            ? null
            : Number(row.area_hectares_estimate),
        ranchRef: row.ranch_ref,
        updatedAt: row.updated_at,
        zoneName: row.name,
        zoneRef: row.zone_ref,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
}

export async function updateBakkiAreaDetails({
  assignedSpeciesRef,
  areaName,
  areaRef,
  bakkiCore,
  ensureSchema,
}: {
  assignedSpeciesRef?: string | null;
  areaName: string;
  areaRef: string;
  bakkiCore: BakkiCoreService;
  ensureSchema: () => Promise<void>;
}): Promise<UpdateBakkiAreaDetailsResult> {
  if (!bakkiCore.isConfigured()) {
    throw new Error('Bakki Core database is not configured.');
  }

  const normalizedAreaRef = areaRef.trim();
  const normalizedAreaName = areaName.trim();
  const normalizedAssignedSpeciesRef = assignedSpeciesRef?.trim() || null;
  if (!normalizedAreaRef) {
    throw new Error('Area update requires a non-empty areaRef.');
  }
  if (!normalizedAreaName) {
    throw new Error('Area update requires a non-empty name.');
  }

  await ensureSchema();

  const result = await bakkiCore.query<UpdateAreaDetailsRow>(
    `
      update bakki_area
      set
        name = $2,
        assigned_species_ref = $3,
        updated_at = now()
      where area_ref = $1
      returning
        area_ref,
        zone_ref,
        name as area_name,
        assigned_species_ref,
        updated_at
    `,
    [normalizedAreaRef, normalizedAreaName, normalizedAssignedSpeciesRef],
  );
  const row = requireFirstRow(
    result.rows,
    `Editable area not found for ${normalizedAreaRef}.`,
  );

  return {
    areaName: row.area_name,
    areaRef: row.area_ref,
    speciesRef: row.assigned_species_ref?.trim() || null,
    updatedAt: row.updated_at,
    zoneRef: row.zone_ref,
  };
}

export async function deleteBakkiArea({
  areaRef,
  bakkiCore,
  ensureSchema,
}: {
  areaRef: string;
  bakkiCore: BakkiCoreService;
  ensureSchema: () => Promise<void>;
}): Promise<DeleteBakkiAreaResult> {
  if (!bakkiCore.isConfigured()) {
    throw new Error('Bakki Core database is not configured.');
  }

  const normalizedAreaRef = areaRef.trim();
  if (!normalizedAreaRef) {
    throw new Error('Area deletion requires a non-empty areaRef.');
  }

  await ensureSchema();

  return bakkiCore.withClient(async (client) => {
    await client.query('begin');
    try {
      const validationResult = await client.query<DeleteAreaValidationRow>(
        `
          select
            area.area_ref,
            area.zone_ref,
            area.name as area_name,
            exists(
              select 1
              from bakki_phase_area_contract contract
              where contract.area_ref = area.area_ref
            ) as has_phase_contract
          from bakki_area area
          where area.area_ref = $1
          limit 1
        `,
        [normalizedAreaRef],
      );
      const area = requireFirstRow(
        validationResult.rows,
        `Editable area not found for ${normalizedAreaRef}.`,
      );

      if (area.has_phase_contract) {
        throw new Error(`Area ${area.area_name} is assigned to a planting phase and cannot be deleted.`);
      }

      const deleteResult = await client.query<UpdateAreaDetailsRow>(
        `
          delete from bakki_area
          where area_ref = $1
          returning
            area_ref,
            zone_ref,
            name as area_name,
            now()::text as updated_at
        `,
        [normalizedAreaRef],
      );
      const deletedArea = requireFirstRow(
        deleteResult.rows,
        `Failed to delete Bakki area ${normalizedAreaRef}.`,
      );

      await client.query('commit');

      return {
        areaName: deletedArea.area_name,
        areaRef: deletedArea.area_ref,
        deletedAt: deletedArea.updated_at,
        zoneRef: deletedArea.zone_ref,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  });
}

async function resolveZoneRefForGeometry(client: PoolClient, geometryJson: string, areaRef: string) {
  const result = await client.query<{ zone_ref: string }>(
    `
      select zone_ref
      from bakki_zone
      where ST_CoveredBy(
        ST_Multi(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 3)),
        boundary_geometry
      )
      order by sort_order asc, zone_ref asc
    `,
    [geometryJson],
  );

  if (result.rows.length === 1) {
    const [row] = result.rows;
    if (row?.zone_ref) {
      return row.zone_ref;
    }
    throw new Error(`Could not infer a parent zone for imported area ${areaRef}.`);
  }

  if (result.rows.length === 0) {
    throw new Error(`Could not infer a parent zone for imported area ${areaRef}.`);
  }

  throw new Error(`Imported area ${areaRef} matches multiple zones; zoneRef is required.`);
}
