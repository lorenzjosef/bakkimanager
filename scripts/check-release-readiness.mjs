import {
  buildReleaseReadinessReport,
  buildWebBundleReport,
  readGeometrySeedSummary,
  runJsonCommand,
} from './check-release-readiness-lib.mjs';

function getYarnCommand() {
  return process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
}

function buildFallbackDoctorResult(error) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    deploymentBlockers: [
      {
        id: 'runtime-doctor-failed',
        label: 'Runtime doctor failed',
        detail: message,
      },
    ],
    recommendedActions: [
      {
        id: 'rerun-runtime-doctor',
        label: 'Rerun runtime doctor',
        detail: 'Fix the doctor command failure and rerun runtime diagnostics.',
        command: 'yarn doctor --json',
      },
    ],
  };
}

function buildFallbackBakkiCoreVerifyResult(error) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    blockers: [
      {
        id: 'bakki-core-verify-failed',
        label: 'Bakki Core verify failed',
        detail: message,
      },
    ],
    message,
    ok: false,
  };
}

function printReport(report) {
  console.log(`Checked at: ${report.checkedAt}`);
  console.log(`Release readiness: ${report.ok ? 'ready' : 'blocked'}`);
  console.log('Checks:');
  console.log(`- ${report.checks.runtimeDoctor.label}: ${report.checks.runtimeDoctor.ok ? 'ready' : 'blocked'} (${report.checks.runtimeDoctor.message})`);
  console.log(`- ${report.checks.bakkiCoreVerify.label}: ${report.checks.bakkiCoreVerify.ok ? 'ready' : 'blocked'} (${report.checks.bakkiCoreVerify.message})`);
  console.log(`- ${report.checks.webBundle.label}: ${report.checks.webBundle.ok ? 'ready' : 'blocked'} (${report.checks.webBundle.message})`);
  console.log(`- ${report.checks.geometrySeed.label}: ${report.checks.geometrySeed.ok ? 'ready' : 'blocked'} (${report.checks.geometrySeed.message})`);
  console.log(`Blockers: ${report.blockerCount}`);
  for (const blocker of report.blockers) {
    console.log(`- [${blocker.source}] ${blocker.label}: ${blocker.detail}`);
  }
  console.log(`Recommended actions: ${report.actionCount}`);
  for (const action of report.recommendedActions) {
    console.log(`- [${action.source}] ${action.label}: ${action.detail}${action.command ? ` [${action.command}]` : ''}`);
  }
}

try {
  const wantsJson = process.argv.includes('--json');
  const yarnCommand = getYarnCommand();

  let doctorResult;
  try {
    doctorResult = runJsonCommand({
      command: yarnCommand,
      args: ['--silent', 'doctor', '--json'],
    }).parsed;
  } catch (error) {
    doctorResult = buildFallbackDoctorResult(error);
  }

  let bakkiCoreVerifyResult;
  try {
    bakkiCoreVerifyResult = runJsonCommand({
      command: yarnCommand,
      args: ['--silent', 'bakki-core:verify', '--json'],
    }).parsed;
  } catch (error) {
    bakkiCoreVerifyResult = buildFallbackBakkiCoreVerifyResult(error);
  }

  const webBundleResult = buildWebBundleReport();
  const geometrySeedResult = readGeometrySeedSummary();
  const report = buildReleaseReadinessReport({
    doctorResult,
    bakkiCoreVerifyResult,
    webBundleResult,
    geometrySeedResult,
  });

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown release-readiness failure.';

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  } else {
    console.error(message);
  }

  process.exitCode = 1;
}
