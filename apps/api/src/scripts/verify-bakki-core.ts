import { Pool } from 'pg';
import {
  buildBakkiCoreVerificationBlockers,
  probeBakkiCoreQueryable,
} from '../bakki-core/bakki-core-probe';
import { resolveBakkiCoreConfig, resolveBakkiCoreConfigStatus } from '../bakki-core/bakki-core-config';

async function main() {
  const args = new Set(process.argv.slice(2));
  const json = args.has('--json');
  const config = resolveBakkiCoreConfig();
  const status = resolveBakkiCoreConfigStatus();

  if (!status.configured) {
    const report = {
      configured: false,
      connectionMode: status.connectionMode,
      database: status.database,
      host: status.host,
      port: config.port,
      blockers: [
        {
          id: 'db-config-missing',
          label: 'Bakki Core DB config is incomplete',
          detail: status.message,
        },
      ],
      message: status.message,
      ok: false,
    };

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Bakki Core verify: blocked`);
      console.log(`Connection mode: ${status.connectionMode}`);
      console.log(`Endpoint: ${status.host ?? 'n/a'}:${config.port} / ${status.database ?? 'n/a'}`);
      console.log(`- ${status.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const pool = config.connectionString
    ? new Pool({
        connectionString: config.connectionString,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      })
    : new Pool({
        database: config.database,
        host: config.host,
        password: config.password ?? undefined,
        port: config.port,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        user: config.user,
      });

  try {
    const metadata = await probeBakkiCoreQueryable(pool, {
      database: config.database,
      host: config.host,
      port: config.port,
    });
    const blockers = buildBakkiCoreVerificationBlockers(metadata);
    const report = {
      ...metadata,
      blockers,
      connectionMode: status.connectionMode,
      configured: true,
      message:
        blockers.length === 0
          ? 'Bakki Core verification passed.'
          : 'Bakki Core verification found readiness blockers.',
      ok: blockers.length === 0,
    };

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Bakki Core verify: ${report.ok ? 'ready' : 'blocked'}`);
      console.log(`Connection mode: ${report.connectionMode}`);
      console.log(`Endpoint: ${report.host ?? 'n/a'}:${report.port ?? 'n/a'} / ${report.database ?? 'n/a'}`);
      console.log(`PostgreSQL: ${report.serverVersion ?? 'n/a'}`);
      console.log(
        `PostGIS: ${
          report.postgisAvailable
            ? report.postgisVersion ?? 'installed'
            : report.postgisAvailable === false
              ? 'missing'
              : 'n/a'
        }`,
      );
      console.log(
        `Migrations: ${
          report.migrationTablePresent
            ? `${report.appliedMigrationCount ?? 0} applied`
            : report.migrationTablePresent === false
              ? 'table missing'
              : 'n/a'
        }`,
      );
      console.log(
        `Geometry rows: ranches=${report.ranchCount ?? 'n/a'} zones=${report.zoneCount ?? 'n/a'} areas=${report.areaCount ?? 'n/a'}`,
      );

      if (blockers.length > 0) {
        for (const blocker of blockers) {
          console.log(`- ${blocker.label}: ${blocker.detail}`);
        }
      }
    }

    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const report = {
      configured: true,
      connectionMode: status.connectionMode,
      database: config.database,
      host: config.host,
      port: config.port,
      blockers: [
        {
          id: 'db-connection-failed',
          label: 'Bakki Core DB connection failed',
          detail: message,
        },
      ],
      message,
      ok: false,
    };

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Bakki Core verify: blocked`);
      console.log(`Connection mode: ${status.connectionMode}`);
      console.log(`Endpoint: ${config.host}:${config.port} / ${config.database}`);
      console.log(`- Bakki Core DB connection failed: ${message}`);
    }
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
