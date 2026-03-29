import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { HealthService } from '../modules/health/health.service';

async function main() {
  const args = new Set(process.argv.slice(2));
  const json = args.has('--json');
  const strict = args.has('--strict');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const health = app.get(HealthService);
    const result = await health.getOdooDiagnostics();

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      if (strict && result.deploymentBlockers.length > 0) {
        process.exitCode = 1;
      }
      return;
    }

    console.log(`Checked at: ${result.checkedAt}`);
    console.log(`Odoo reachable: ${result.odoo.reachable ? 'yes' : 'no'} (${result.odoo.message})`);
    console.log(`Odoo credential source: ${result.odoo.credentialSource}`);
    console.log(`Task sync write ready: ${result.taskSync.writeReady ? 'yes' : 'no'}`);
    console.log(`Bakki Core configured: ${result.bakkiCore.configured ? 'yes' : 'no'} (${result.bakkiCore.message})`);
    console.log(
      `Bakki Core endpoint: ${result.bakkiCore.host ?? 'n/a'}:${result.bakkiCore.port ?? 'n/a'} / ${result.bakkiCore.database ?? 'n/a'}`,
    );
    console.log(
      `Bakki Core engine: PostgreSQL ${result.bakkiCore.serverVersion ?? 'n/a'} / PostGIS ${
        result.bakkiCore.postgisAvailable
          ? result.bakkiCore.postgisVersion ?? 'installed'
          : result.bakkiCore.postgisAvailable === false
            ? 'missing'
            : 'n/a'
      }`,
    );
    console.log(
      `Bakki Core migrations: ${
        result.bakkiCore.migrationTablePresent
          ? `${result.bakkiCore.appliedMigrationCount ?? 0} applied`
          : result.bakkiCore.migrationTablePresent === false
            ? 'table missing'
            : 'n/a'
      }`,
    );
    console.log(
      `Persisted geometry: ranches=${result.geometryPersistence.ranchCount} zones=${result.geometryPersistence.zoneCount} areas=${result.geometryPersistence.areaCount}`,
    );
    console.log(`Geometry seed promotable: ${result.geometrySeed.promotable ? 'yes' : 'no'} (${result.geometrySeed.message})`);
    console.log(`Media configured: ${result.media.configured ? 'yes' : 'no'} (${result.media.message})`);
    console.log(
      `User mirrors: total=${result.mirrors.users.total} ok=${result.mirrors.users.okCount} error=${result.mirrors.users.errorCount}`,
    );
    console.log(
      `Task mirrors: total=${result.mirrors.tasks.total} ok=${result.mirrors.tasks.okCount} error=${result.mirrors.tasks.errorCount}`,
    );
    console.log(`Deployment blockers: ${result.deploymentBlockers.length}`);
    for (const blocker of result.deploymentBlockers) {
      console.log(`- ${blocker.label}: ${blocker.detail}`);
    }
    console.log(`Recommended actions: ${result.recommendedActions.length}`);
    for (const action of result.recommendedActions) {
      console.log(`- ${action.label}: ${action.detail}${action.command ? ` [${action.command}]` : ''}`);
    }

    if (strict && result.deploymentBlockers.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Runtime diagnostics failed: ${message}`);
  process.exitCode = 1;
});
