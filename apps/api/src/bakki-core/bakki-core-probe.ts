import type { QueryResultRow } from 'pg';
import type { BakkiCoreConfig } from './bakki-core-config';

export interface BakkiCoreProbeMetadata {
  appliedMigrationCount: number | null;
  areaCount: number | null;
  areaTablePresent: boolean | null;
  database: string | null;
  host: string | null;
  migrationTablePresent: boolean | null;
  port: number | null;
  postgisAvailable: boolean | null;
  postgisVersion: string | null;
  ranchCount: number | null;
  ranchTablePresent: boolean | null;
  serverVersion: string | null;
  zoneCount: number | null;
  zoneTablePresent: boolean | null;
}

export interface BakkiCoreVerificationBlocker {
  detail: string;
  id: string;
  label: string;
}

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

export async function probeBakkiCoreQueryable(
  queryable: Queryable,
  config: Pick<BakkiCoreConfig, 'database' | 'host' | 'port'>,
): Promise<BakkiCoreProbeMetadata> {
  const diagnostics = await queryable.query<{
    area_table_present: boolean;
    migration_table_present: boolean;
    postgis_available: boolean;
    postgis_version: string | null;
    ranch_table_present: boolean;
    server_version: string;
    zone_table_present: boolean;
  }>(`
    select
      current_setting('server_version') as server_version,
      exists(select 1 from pg_extension where extname = 'postgis') as postgis_available,
      (select extversion from pg_extension where extname = 'postgis' limit 1) as postgis_version,
      exists(
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'bakki_core_schema_migrations'
      ) as migration_table_present,
      exists(
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'bakki_ranch'
      ) as ranch_table_present,
      exists(
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'bakki_zone'
      ) as zone_table_present,
      exists(
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'bakki_area'
      ) as area_table_present
  `);
  const row = diagnostics.rows[0];

  const appliedMigrationCount = row?.migration_table_present
    ? Number(
        (
          await queryable.query<{ count: string }>(
            'select count(*)::text as count from bakki_core_schema_migrations',
          )
        ).rows[0]?.count ?? '0',
      )
    : null;

  const ranchCount = row?.ranch_table_present
    ? Number((await queryable.query<{ count: string }>('select count(*)::text as count from bakki_ranch')).rows[0]?.count ?? '0')
    : null;
  const zoneCount = row?.zone_table_present
    ? Number((await queryable.query<{ count: string }>('select count(*)::text as count from bakki_zone')).rows[0]?.count ?? '0')
    : null;
  const areaCount = row?.area_table_present
    ? Number((await queryable.query<{ count: string }>('select count(*)::text as count from bakki_area')).rows[0]?.count ?? '0')
    : null;

  return {
    appliedMigrationCount,
    areaCount,
    areaTablePresent: row?.area_table_present ?? null,
    database: config.database,
    host: config.host,
    migrationTablePresent: row?.migration_table_present ?? null,
    port: config.port,
    postgisAvailable: row?.postgis_available ?? null,
    postgisVersion: row?.postgis_version ?? null,
    ranchCount,
    ranchTablePresent: row?.ranch_table_present ?? null,
    serverVersion: row?.server_version ?? null,
    zoneCount,
    zoneTablePresent: row?.zone_table_present ?? null,
  };
}

export function buildBakkiCoreVerificationBlockers(report: BakkiCoreProbeMetadata) {
  const blockers: BakkiCoreVerificationBlocker[] = [];

  if (report.postgisAvailable === false) {
    blockers.push({
      id: 'postgis-missing',
      label: 'PostGIS extension missing',
      detail: 'Install or enable the PostGIS extension before treating Bakki Core geometry as ready.',
    });
  }

  if (report.migrationTablePresent === false) {
    blockers.push({
      id: 'migration-table-missing',
      label: 'Bakki Core migrations have not been initialized',
      detail: 'Run Bakki Core migrations or bootstrap so the schema exists before syncing mirrors or geometry.',
    });
  }

  if (report.ranchTablePresent === false || report.zoneTablePresent === false || report.areaTablePresent === false) {
    blockers.push({
      id: 'geometry-tables-missing',
      label: 'Bakki Core geometry tables are incomplete',
      detail: 'Bakki Core geometry tables are missing. Run migrations/bootstrap before treating map persistence as ready.',
    });
  }

  return blockers;
}
