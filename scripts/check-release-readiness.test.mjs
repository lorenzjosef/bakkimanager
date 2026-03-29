import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildReleaseReadinessReport,
  parseJsonObjectFromMixedOutput,
  readGeometrySeedSummary,
} from './check-release-readiness-lib.mjs';

test('parseJsonObjectFromMixedOutput extracts JSON from mixed logs and suffix noise', () => {
  const parsed = parseJsonObjectFromMixedOutput(`
warn before json
{"ok":false,"message":"connect ECONNREFUSED","nested":{"count":2}}
error after json
  `);

  assert.deepEqual(parsed, {
    ok: false,
    message: 'connect ECONNREFUSED',
    nested: {
      count: 2,
    },
  });
});

test('readGeometrySeedSummary marks the current clean seed as promotable', () => {
  const summary = readGeometrySeedSummary({
    readFileSyncImpl() {
      return JSON.stringify({
        generated_at: '2026-03-28T00:00:00.000Z',
        source_files: {
          ranch: 'ranch.kml',
          zones: 'zones.kml',
        },
        validation: {
          zones_within_ranch: true,
          containment_failures: [],
          zone_overlap_pairs: [],
        },
      });
    },
  });

  assert.equal(summary.promotable, true);
  assert.equal(summary.containmentFailureCount, 0);
  assert.equal(summary.overlapPairCount, 0);
});

test('buildReleaseReadinessReport passes when all component checks pass', () => {
  const report = buildReleaseReadinessReport({
    checkedAt: '2026-03-28T00:00:00.000Z',
    doctorResult: {
      deploymentBlockers: [],
      recommendedActions: [],
    },
    bakkiCoreVerifyResult: {
      ok: true,
      message: 'Bakki Core verification passed.',
      blockers: [],
    },
    webBundleResult: {
      ok: true,
      entryChunk: 'index-main.js',
      entryChunkBytes: 100 * 1024,
      entryChunkLimitBytes: 350 * 1024,
      entryChunkWithinLimit: true,
      missingPrefixes: [],
    },
    geometrySeedResult: {
      promotable: true,
      containmentFailureCount: 0,
      overlapPairCount: 0,
      seedGeneratedAt: '2026-03-28T00:00:00.000Z',
    },
  });

  assert.equal(report.ok, true);
  assert.equal(report.blockerCount, 0);
  assert.equal(report.actionCount, 0);
  assert.equal(report.checks.runtimeDoctor.ok, true);
  assert.equal(report.checks.webBundle.ok, true);
  assert.equal(report.checks.geometrySeed.ok, true);
});

test('buildReleaseReadinessReport aggregates doctor, bundle, and geometry blockers', () => {
  const report = buildReleaseReadinessReport({
    checkedAt: '2026-03-28T00:00:00.000Z',
    doctorResult: {
      deploymentBlockers: [
        {
          id: 'bakki-core-unhealthy',
          label: 'Bakki Core not healthy',
          detail: 'DB down',
        },
      ],
      recommendedActions: [
        {
          id: 'fix-bakki-core-connectivity',
          label: 'Restore Bakki Core connectivity',
          detail: 'Start Postgres',
          command: 'yarn bakki-core:db:doctor',
        },
      ],
    },
    bakkiCoreVerifyResult: {
      ok: false,
      message: 'connect ECONNREFUSED 127.0.0.1:5432',
      blockers: [
        {
          id: 'db-connection-failed',
          label: 'Bakki Core DB connection failed',
          detail: 'connect ECONNREFUSED 127.0.0.1:5432',
        },
      ],
    },
    webBundleResult: {
      ok: false,
      entryChunk: 'index-main.js',
      entryChunkBytes: 500 * 1024,
      entryChunkLimitBytes: 350 * 1024,
      entryChunkWithinLimit: false,
      missingPrefixes: [],
    },
    geometrySeedResult: {
      promotable: false,
      containmentFailureCount: 2,
      overlapPairCount: 1,
      seedGeneratedAt: '2026-03-28T00:00:00.000Z',
    },
  });

  assert.equal(report.ok, false);
  assert.equal(report.blockerCount, 4);
  assert.equal(report.actionCount, 3);
  assert.deepEqual(
    report.blockers.map((blocker) => blocker.source),
    ['runtime-doctor', 'bakki-core-verify', 'web-bundle', 'geometry-seed'],
  );
  assert.ok(report.recommendedActions.some((action) => action.id === 'rebuild-web-bundle'));
  assert.ok(report.recommendedActions.some((action) => action.id === 'fix-geometry-seed'));
});
