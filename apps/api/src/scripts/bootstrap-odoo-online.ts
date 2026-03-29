import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OdooService } from '../odoo/odoo.service';
import { OdooTaskSyncService } from '../modules/health/odoo-task-sync.service';

async function main() {
  const args = new Set(process.argv.slice(2));
  const json = args.has('--json');
  const skipProbe = args.has('--skip-probe');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const odoo = app.get(OdooService);
    const taskSync = app.get(OdooTaskSyncService);

    const health = await odoo.healthcheck();
    if (!health.configured || !health.reachable) {
      throw new Error(health.message);
    }

    const readinessBefore = await taskSync.getReadiness();
    const provisionResult = await taskSync.provision();
    const readinessAfter = await taskSync.getReadiness();
    const writeProbeResult = skipProbe ? null : await taskSync.runWriteProbe();

    const result = {
      health,
      provisionResult,
      readinessBefore,
      readinessAfter,
      writeProbeResult,
    };

    if (json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(`Odoo base URL: ${health.baseUrl}`);
    console.log(`Odoo database: ${health.database}`);
    console.log(`Odoo credential source: ${health.credentialSource}`);
    console.log(`Reachable: ${health.reachable ? 'yes' : 'no'}`);
    console.log(`Provision message: ${provisionResult.message}`);
    console.log(
      `Default project: ${readinessAfter.defaultProject?.name || 'missing'}`
        + ` | write ready: ${readinessAfter.writeReady ? 'yes' : 'no'}`,
    );
    console.log(
      `Missing workflow states: ${
        readinessAfter.missingWorkflowStates.length > 0
          ? readinessAfter.missingWorkflowStates.join(', ')
          : 'none'
      }`,
    );

    if (writeProbeResult) {
      console.log(`Write probe task: ${writeProbeResult.taskTitle}`);
      console.log(`Write probe Odoo task id: ${writeProbeResult.probeTaskId ?? 'n/a'}`);
      console.log(`Write probe final stage: ${writeProbeResult.finalStageName ?? 'n/a'}`);
      console.log(`Write probe message: ${writeProbeResult.message}`);
    } else {
      console.log('Write probe skipped.');
    }
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Odoo bootstrap failed: ${message}`);
  process.exitCode = 1;
});
