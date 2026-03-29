import type {
  AreaGeometryProperties,
  ZoneGeometryProperties,
  ZoneSummary,
} from '@bakki/domain';
import { parseGeoJsonGeometry, toNullableNumber } from './bakki-geometry.helpers';
import { BakkiCoreService } from './bakki-core.service';

export interface RanchRow {
  geometry_geojson: string;
  name: string;
  ranch_ref: string;
  source_feature_name: string;
  source_file_name: string;
}

export interface ZoneRow {
  area_count?: number | string | null;
  area_hectares_estimate: number | string | null;
  geometry_geojson: string;
  name: string;
  prototype_interactive: boolean;
  status_label: string;
  zone_ref: string;
}

export interface BakkiAreaCatalogRecord {
  areaName: string;
  areaRef: string;
  assignedSpeciesRef: string | null;
  zoneRef: string;
}

export interface AreaCatalogRow {
  area_name: string;
  area_ref: string;
  area_hectares_estimate?: number | string | null;
  assigned_species_ref?: string | null;
  geometry_geojson?: string;
  zone_ref: string;
}

const RANCH_ROW_SELECT = `
  select
    ranch_ref,
    name,
    source_file_name,
    source_feature_name,
    ST_AsGeoJSON(boundary_geometry)::text as geometry_geojson
  from bakki_ranch
  order by ranch_ref asc
  limit 1
`;

const ZONE_SHARED_COLUMNS = `
  bakki_zone.zone_ref,
  bakki_zone.name,
  bakki_zone.status_label,
  bakki_zone.prototype_interactive,
  bakki_zone.area_hectares_estimate,
  ST_AsGeoJSON(bakki_zone.boundary_geometry)::text as geometry_geojson
`;

const ZONE_SUMMARY_SELECT = `
  select
    ${ZONE_SHARED_COLUMNS},
    count(area.area_ref)::text as area_count
  from bakki_zone
  left join bakki_area area on area.zone_ref = bakki_zone.zone_ref
  group by
    bakki_zone.zone_ref,
    bakki_zone.name,
    bakki_zone.status_label,
    bakki_zone.prototype_interactive,
    bakki_zone.area_hectares_estimate,
    bakki_zone.boundary_geometry,
    bakki_zone.sort_order
  order by bakki_zone.sort_order asc, bakki_zone.zone_ref asc
`;

const ZONE_GEOMETRY_SELECT = `
  select
    ${ZONE_SHARED_COLUMNS}
  from bakki_zone
`;

const AREA_SHARED_COLUMNS = `
  area_ref,
  zone_ref,
  name as area_name,
  assigned_species_ref
`;

const AREA_GEOMETRY_COLUMNS = `
  ${AREA_SHARED_COLUMNS},
  area_hectares_estimate,
  ST_AsGeoJSON(boundary_geometry)::text as geometry_geojson
`;

const AREA_CATALOG_SELECT = `
  select
    ${AREA_SHARED_COLUMNS}
  from bakki_area
`;

const AREA_GEOMETRY_SELECT = `
  select
    ${AREA_GEOMETRY_COLUMNS}
  from bakki_area
`;

export async function getPersistedRanchRow(bakkiCore: BakkiCoreService) {
  const result = await bakkiCore.query<RanchRow>(RANCH_ROW_SELECT);
  return result.rows[0] ?? null;
}

export async function queryZoneRows(
  bakkiCore: BakkiCoreService,
  options: {
    includeAreaCount?: boolean;
    zoneRefs?: string[];
  } = {},
) {
  if (options.includeAreaCount) {
    const result = await bakkiCore.query<ZoneRow>(ZONE_SUMMARY_SELECT);
    return result.rows;
  }

  if (options.zoneRefs) {
    const result = await bakkiCore.query<ZoneRow>(
      `
        ${ZONE_GEOMETRY_SELECT}
        where bakki_zone.zone_ref = any($1::text[])
        order by bakki_zone.sort_order asc, bakki_zone.zone_ref asc
      `,
      [options.zoneRefs],
    );
    return result.rows;
  }

  const result = await bakkiCore.query<ZoneRow>(
    `
      ${ZONE_GEOMETRY_SELECT}
      order by bakki_zone.sort_order asc, bakki_zone.zone_ref asc
    `,
  );
  return result.rows;
}

export async function queryAreaRows(
  bakkiCore: BakkiCoreService,
  options: {
    areaRef?: string;
    areaRefs?: string[];
    includeGeometry?: boolean;
  } = {},
) {
  const select = options.includeGeometry ? AREA_GEOMETRY_SELECT : AREA_CATALOG_SELECT;

  if (options.areaRef) {
    const result = await bakkiCore.query<AreaCatalogRow>(
      `
        ${select}
        where area_ref = $1
        limit 1
      `,
      [options.areaRef],
    );
    return result.rows;
  }

  if (options.areaRefs) {
    const result = await bakkiCore.query<AreaCatalogRow>(
      `
        ${select}
        where area_ref = any($1::text[])
        order by area_ref asc
      `,
      [options.areaRefs],
    );
    return result.rows;
  }

  const result = await bakkiCore.query<AreaCatalogRow>(
    `
      ${select}
      order by zone_ref asc, area_ref asc
    `,
  );
  return result.rows;
}

export async function getAreaRowByRef(bakkiCore: BakkiCoreService, areaRef: string) {
  const rows = await queryAreaRows(bakkiCore, { areaRef, includeGeometry: true });
  return rows[0] ?? null;
}

export function mapZoneSummary(row: ZoneRow): ZoneSummary {
  return {
    id: row.zone_ref,
    name: row.name,
    areaCount: Number(row.area_count ?? 0),
    statusLabel: row.status_label,
    prototypeInteractive: row.prototype_interactive,
  };
}

export function mapZoneFeature(row: ZoneRow) {
  return {
    type: 'Feature' as const,
    id: row.zone_ref,
    geometry: parseGeoJsonGeometry(row.geometry_geojson),
    properties: {
      id: row.zone_ref,
      name: row.name,
      statusLabel: row.status_label,
      prototypeInteractive: row.prototype_interactive,
      hectaresEstimate: toNullableNumber(row.area_hectares_estimate),
    },
  } satisfies {
    type: 'Feature';
    id: string;
    geometry: ReturnType<typeof parseGeoJsonGeometry>;
    properties: ZoneGeometryProperties;
  };
}

export function mapAreaCatalogRecord(row: AreaCatalogRow): BakkiAreaCatalogRecord {
  return {
    areaRef: row.area_ref,
    areaName: row.area_name,
    assignedSpeciesRef: row.assigned_species_ref?.trim() || null,
    zoneRef: row.zone_ref,
  };
}

export function mapAreaFeature(row: AreaCatalogRow) {
  return {
    type: 'Feature' as const,
    id: row.area_ref,
    geometry: parseGeoJsonGeometry(row.geometry_geojson!),
    properties: {
      areaRef: row.area_ref,
      zoneRef: row.zone_ref,
      name: row.area_name,
      hectaresEstimate: toNullableNumber(row.area_hectares_estimate),
    },
  } satisfies {
    type: 'Feature';
    id: string;
    geometry: ReturnType<typeof parseGeoJsonGeometry>;
    properties: AreaGeometryProperties;
  };
}
