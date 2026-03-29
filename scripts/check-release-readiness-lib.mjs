import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  analyzeBundleAssets,
  formatKilobytes,
} from './check-web-bundle-lib.mjs';

export const DIST_ASSETS_DIR = path.resolve('apps/admin-web/dist/assets');
export const GEOMETRY_SEED_PATH = path.resolve('docs/seeds/geometry-seed.json');

function scanBalancedJsonObject(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      if (inString) {
        escaping = true;
      }
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

export function parseJsonObjectFromMixedOutput(text) {
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '{') {
      continue;
    }

    const candidate = scanBalancedJsonObject(text, index);

    if (!candidate) {
      continue;
    }

    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  throw new Error('No JSON object found in command output.');
}

export function runJsonCommand({
  command,
  args,
  cwd = process.cwd(),
  env = process.env,
  spawnSyncImpl = spawnSync,
}) {
  const result = spawnSyncImpl(command, args, {
    cwd,
    encoding: 'utf8',
    env,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const combinedOutput = [stdout, stderr].filter(Boolean).join('\n');
  const parsed = parseJsonObjectFromMixedOutput(combinedOutput);

  return {
    command: [command, ...args].join(' '),
    exitCode: typeof result.status === 'number' ? result.status : result.error ? 1 : 0,
    output: combinedOutput,
    parsed,
  };
}

export function readGeometrySeedSummary({
  geometrySeedPath = GEOMETRY_SEED_PATH,
  readFileSyncImpl = readFileSync,
} = {}) {
  const raw = readFileSyncImpl(geometrySeedPath, 'utf8');
  const seed = JSON.parse(raw);
  const validation = seed.validation ?? {};
  const containmentFailures = validation.containment_failures ?? [];
  const overlapPairs = validation.zone_overlap_pairs ?? [];
  const promotable = Boolean(validation.zones_within_ranch) && containmentFailures.length === 0 && overlapPairs.length === 0;

  return {
    checkedAt: new Date().toISOString(),
    containmentFailureCount: containmentFailures.length,
    containmentFailures,
    overlapPairCount: overlapPairs.length,
    overlapPairs,
    promotable,
    seedGeneratedAt: seed.generated_at ?? null,
    sourceFiles: seed.source_files ?? {},
    zonesWithinRanch: Boolean(validation.zones_within_ranch),
  };
}

export function buildWebBundleReport({
  distAssetsDir = DIST_ASSETS_DIR,
  readdirSyncImpl = readdirSync,
  statSyncImpl = statSync,
} = {}) {
  const files = readdirSyncImpl(distAssetsDir);

  return analyzeBundleAssets({
    distAssetsDir,
    files,
    getFileSize(entryChunk) {
      return statSyncImpl(path.join(distAssetsDir, entryChunk)).size;
    },
  });
}

function pushUniqueAction(actions, action) {
  if (actions.some((existing) => existing.id === action.id)) {
    return;
  }

  actions.push(action);
}

function pushUniqueBlocker(blockers, blocker) {
  if (blockers.some((existing) => existing.id === blocker.id && existing.source === blocker.source)) {
    return;
  }

  blockers.push(blocker);
}

export function buildReleaseReadinessReport({
  checkedAt = new Date().toISOString(),
  doctorResult,
  bakkiCoreVerifyResult,
  webBundleResult,
  geometrySeedResult,
}) {
  const blockers = [];
  const recommendedActions = [];
  const doctorBlockers = doctorResult?.deploymentBlockers ?? [];
  const doctorActions = doctorResult?.recommendedActions ?? [];
  const verifyBlockers = bakkiCoreVerifyResult?.blockers ?? [];

  for (const blocker of doctorBlockers) {
    pushUniqueBlocker(blockers, {
      ...blocker,
      source: 'runtime-doctor',
    });
  }

  for (const action of doctorActions) {
    pushUniqueAction(recommendedActions, {
      ...action,
      source: 'runtime-doctor',
    });
  }

  if (bakkiCoreVerifyResult && bakkiCoreVerifyResult.ok === false) {
    for (const blocker of verifyBlockers) {
      pushUniqueBlocker(blockers, {
        ...blocker,
        source: 'bakki-core-verify',
      });
    }
  }

  if (!webBundleResult.ok) {
    pushUniqueBlocker(blockers, {
      id: 'web-bundle-check-failed',
      label: 'Web bundle guard failed',
      detail: webBundleResult.entryChunkWithinLimit
        ? `Missing lazy chunks: ${webBundleResult.missingPrefixes.join(', ')}`
        : `Entry chunk ${formatKilobytes(webBundleResult.entryChunkBytes)} is above limit ${formatKilobytes(webBundleResult.entryChunkLimitBytes)}.`,
      source: 'web-bundle',
    });
    pushUniqueAction(recommendedActions, {
      id: 'rebuild-web-bundle',
      label: 'Rebuild the web app and rerun the bundle guard',
      detail: 'Ensure the entry chunk stays under the configured limit and all expected lazy chunks are emitted.',
      command: 'yarn workspace @bakki/admin-web build && yarn web:bundle:check',
      source: 'web-bundle',
    });
  }

  if (!geometrySeedResult.promotable) {
    pushUniqueBlocker(blockers, {
      id: 'geometry-seed-not-promotable',
      label: 'Geometry seed is not promotable',
      detail: `Containment failures=${geometrySeedResult.containmentFailureCount}, overlap pairs=${geometrySeedResult.overlapPairCount}.`,
      source: 'geometry-seed',
    });
    pushUniqueAction(recommendedActions, {
      id: 'fix-geometry-seed',
      label: 'Fix ranch and zone seed geometry',
      detail: 'Update the ranch/zone KML or regenerate the seed artifacts until geometry validation passes.',
      command: 'yarn seed:geometry:view && yarn seed:geometry:validate',
      source: 'geometry-seed',
    });
  }

  const runtimeDoctorOk = doctorBlockers.length === 0;
  const bakkiCoreVerifyOk = bakkiCoreVerifyResult?.ok === true;
  const webBundleOk = webBundleResult.ok === true;
  const geometrySeedOk = geometrySeedResult.promotable === true;

  return {
    checkedAt,
    ok: runtimeDoctorOk && bakkiCoreVerifyOk && webBundleOk && geometrySeedOk,
    blockerCount: blockers.length,
    actionCount: recommendedActions.length,
    blockers,
    recommendedActions,
    checks: {
      runtimeDoctor: {
        command: 'yarn doctor --json',
        deploymentBlockerCount: doctorBlockers.length,
        label: 'Runtime doctor',
        message:
          doctorBlockers.length === 0
            ? 'Runtime diagnostics cleared all deployment blockers.'
            : `${doctorBlockers.length} deployment blocker(s) reported by runtime diagnostics.`,
        ok: runtimeDoctorOk,
      },
      bakkiCoreVerify: {
        command: 'yarn bakki-core:verify --json',
        label: 'Bakki Core verify',
        message: bakkiCoreVerifyResult?.message ?? 'Bakki Core verification output unavailable.',
        ok: bakkiCoreVerifyOk,
      },
      webBundle: {
        command: 'yarn web:bundle:check --json',
        entryChunk: webBundleResult.entryChunk,
        entryChunkBytes: webBundleResult.entryChunkBytes,
        entryChunkLimitBytes: webBundleResult.entryChunkLimitBytes,
        label: 'Web bundle',
        message: webBundleResult.ok
          ? 'Web bundle guard passed.'
          : webBundleResult.entryChunkWithinLimit
            ? `Missing lazy chunks: ${webBundleResult.missingPrefixes.join(', ')}`
            : `Entry chunk ${formatKilobytes(webBundleResult.entryChunkBytes)} is above the limit ${formatKilobytes(webBundleResult.entryChunkLimitBytes)}.`,
        missingPrefixes: webBundleResult.missingPrefixes,
        ok: webBundleOk,
      },
      geometrySeed: {
        command: 'yarn seed:geometry:validate',
        containmentFailureCount: geometrySeedResult.containmentFailureCount,
        label: 'Geometry seed',
        message: geometrySeedResult.promotable
          ? 'Geometry seed validation passed.'
          : `Containment failures=${geometrySeedResult.containmentFailureCount}, overlap pairs=${geometrySeedResult.overlapPairCount}.`,
        ok: geometrySeedOk,
        overlapPairCount: geometrySeedResult.overlapPairCount,
        promotable: geometrySeedResult.promotable,
        seedGeneratedAt: geometrySeedResult.seedGeneratedAt,
      },
    },
  };
}
