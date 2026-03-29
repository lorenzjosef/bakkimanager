import { spawnSync } from 'node:child_process';
import process from 'node:process';

import {
  buildComposeArgs,
  getDbActionBlockers,
  createDbReport,
  getDbDoctorBlockers,
  probeDbReachability,
} from './manage-bakki-core-db-lib.mjs';

const ACTIONS = new Set(['up', 'down', 'logs', 'doctor']);

function detectContainerTool() {
  const dockerComposePlugin = spawnSync('docker', ['compose', 'version'], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (dockerComposePlugin.status === 0) {
    return {
      name: 'docker',
      composeBaseArgs: ['compose'],
      displayCommand: 'docker compose',
    };
  }

  const legacyDockerCompose = spawnSync('docker-compose', ['version'], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (legacyDockerCompose.status === 0) {
    return {
      name: 'docker-compose',
      composeBaseArgs: [],
      displayCommand: 'docker-compose',
    };
  }

  return null;
}

function printHumanReport(report) {
  process.stdout.write(`Bakki Core DB action: ${report.action}\n`);
  process.stdout.write(`Compose file: ${report.composeFile}\n`);
  process.stdout.write(`Env file: ${report.envFile ?? 'missing'}\n`);
  process.stdout.write(`Container tool: ${report.containerTool?.displayCommand ?? 'missing'}\n`);
  process.stdout.write(`DB target: ${report.dbTarget.label}\n`);
  process.stdout.write(`DB connection mode: ${report.dbTarget.connectionMode}\n`);
  process.stdout.write(`DB target scope: ${report.targetScope}\n`);

  if (report.dbTarget.parseError) {
    process.stdout.write(`DB config error: ${report.dbTarget.parseError}\n`);
  }

  if (report.reachability) {
    process.stdout.write(
      `DB reachability: ${report.reachability.reachable ? 'reachable' : 'unreachable'} (${report.reachability.message})\n`,
    );
  }

  if (report.blockers.length === 0) {
    process.stdout.write('Status: ready\n');
    return;
  }

  process.stdout.write('Status: blocked\n');
  for (const blocker of report.blockers) {
    process.stdout.write(`- ${blocker.label}: ${blocker.detail}\n`);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const action = args.find((arg) => !arg.startsWith('--')) ?? 'doctor';

  if (!ACTIONS.has(action)) {
    process.stderr.write(`Unknown action: ${action}\n`);
    process.stderr.write('Expected one of: up, down, logs, doctor\n');
    process.exit(1);
  }

  const containerTool = detectContainerTool();
  const report = createDbReport({
    cwd: process.cwd(),
    containerTool,
  });
  report.action = action;

  if (action === 'doctor') {
    report.reachability = await probeDbReachability(report.dbTarget);
    report.blockers = getDbDoctorBlockers({
      blockers: report.blockers,
      containerTool,
      dbTarget: report.dbTarget,
      reachability: report.reachability,
      targetScope: report.targetScope,
    });
    report.ok = report.blockers.length === 0;

    if (jsonMode) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      printHumanReport(report);
    }
    process.exit(report.ok ? 0 : 1);
  }

  const baseReport = {
    action,
    blockers: getDbActionBlockers({
      blockers: report.blockers,
      containerTool,
      targetScope: report.targetScope,
      dbTarget: report.dbTarget,
    }),
    composeFile: report.composeFile,
    containerTool: report.containerTool,
    dbTarget: report.dbTarget,
    envFile: report.envFile,
    targetScope: report.targetScope,
    ok: report.blockers.length === 0,
  };

  baseReport.ok = baseReport.blockers.length === 0;

  if (baseReport.blockers.length > 0) {
    if (jsonMode) {
      process.stdout.write(`${JSON.stringify(baseReport, null, 2)}\n`);
    } else {
      printHumanReport(baseReport);
    }
    process.exit(1);
  }

  const actionArgs =
    action === 'up'
      ? ['up', '-d']
      : action === 'down'
        ? ['down']
        : ['logs', '-f', 'bakki-postgis'];

  const composeArgs = buildComposeArgs({
    envFile: baseReport.envFile,
    composeBaseArgs: baseReport.containerTool.composeBaseArgs,
    action: actionArgs,
  });

  const result = spawnSync(baseReport.containerTool.name, composeArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  process.exit(result.status ?? 1);
}

void run();
