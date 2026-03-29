import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBakkiCoreVerificationBlockers,
  probeBakkiCoreQueryable,
} from './bakki-core-probe';

test('buildBakkiCoreVerificationBlockers reports missing PostGIS and migrations', () => {
  const blockers = buildBakkiCoreVerificationBlockers({
    appliedMigrationCount: null,
    areaCount: null,
    areaTablePresent: false,
    database: 'bakki_core',
    host: '127.0.0.1',
    migrationTablePresent: false,
    port: 5432,
    postgisAvailable: false,
    postgisVersion: null,
    ranchCount: null,
    ranchTablePresent: false,
    serverVersion: '16.3',
    zoneCount: null,
    zoneTablePresent: false,
  });

  assert.deepEqual(
    blockers.map((blocker) => blocker.id),
    ['postgis-missing', 'migration-table-missing', 'geometry-tables-missing'],
  );
});

test('buildBakkiCoreVerificationBlockers returns no blockers for a ready database', () => {
  assert.deepEqual(
    buildBakkiCoreVerificationBlockers({
      appliedMigrationCount: 13,
      areaCount: 5,
      areaTablePresent: true,
      database: 'bakki_core',
      host: '127.0.0.1',
      migrationTablePresent: true,
      port: 5432,
      postgisAvailable: true,
      postgisVersion: '3.4',
      ranchCount: 1,
      ranchTablePresent: true,
      serverVersion: '16.3',
      zoneCount: 5,
      zoneTablePresent: true,
    }),
    [],
  );
});

test('probeBakkiCoreQueryable reads engine, migration, and geometry metadata', async () => {
  const queries: string[] = [];

  const result = await probeBakkiCoreQueryable(
    {
      async query<T extends Record<string, unknown> = Record<string, unknown>>(text: string) {
        queries.push(text);

        if (text.includes('current_setting')) {
          return {
            rows: [{
              server_version: '16.3',
              postgis_available: true,
              postgis_version: '3.4',
              migration_table_present: true,
              ranch_table_present: true,
              zone_table_present: true,
              area_table_present: true,
            }] as unknown as T[],
          } as { rows: T[] };
        }

        if (text.includes('bakki_core_schema_migrations')) {
          return { rows: [{ count: '13' }] as unknown as T[] };
        }

        if (text.includes('from bakki_ranch')) {
          return { rows: [{ count: '1' }] as unknown as T[] };
        }

        if (text.includes('from bakki_zone')) {
          return { rows: [{ count: '5' }] as unknown as T[] };
        }

        if (text.includes('from bakki_area')) {
          return { rows: [{ count: '5' }] as unknown as T[] };
        }

        throw new Error(`Unexpected query: ${text}`);
      },
    },
    {
      database: 'bakki_core',
      host: '127.0.0.1',
      port: 5432,
    },
  );

  assert.equal(result.serverVersion, '16.3');
  assert.equal(result.postgisAvailable, true);
  assert.equal(result.postgisVersion, '3.4');
  assert.equal(result.appliedMigrationCount, 13);
  assert.equal(result.ranchCount, 1);
  assert.equal(result.zoneCount, 5);
  assert.equal(result.areaCount, 5);
  assert.equal(queries.length, 5);
});
