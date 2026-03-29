import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ENTRY_CHUNK_LIMIT_BYTES,
  REQUIRED_JS_PREFIXES,
  analyzeBundleAssets,
  collectMissingPrefixes,
  findEntryChunk,
  formatKilobytes,
} from './check-web-bundle-lib.mjs';

test('formatKilobytes renders fixed two-decimal output', () => {
  assert.equal(formatKilobytes(1024), '1.00 kB');
  assert.equal(formatKilobytes(1536), '1.50 kB');
});

test('findEntryChunk returns the index chunk when present', () => {
  assert.equal(findEntryChunk(['vendor-abc.js', 'index-123.js']), 'index-123.js');
  assert.equal(findEntryChunk(['vendor-abc.js']), null);
});

test('collectMissingPrefixes reports only missing lazy chunk prefixes', () => {
  const files = ['DashboardPage-a.js', 'TaskManagementPage-b.js', 'index-main.js'];

  assert.deepEqual(collectMissingPrefixes(files, ['DashboardPage-', 'TaskManagementPage-', 'MapViewerPage-']), [
    'MapViewerPage-',
  ]);
});

test('analyzeBundleAssets returns a passing report when entry size and lazy chunks are present', () => {
  const files = ['index-main.js', ...REQUIRED_JS_PREFIXES.map((prefix) => `${prefix}chunk.js`)];
  const report = analyzeBundleAssets({
    distAssetsDir: '/tmp/dist/assets',
    files,
    getFileSize(file) {
      assert.equal(file, 'index-main.js');
      return 120 * 1024;
    },
  });

  assert.deepEqual(report, {
    distAssetsDir: '/tmp/dist/assets',
    entryChunk: 'index-main.js',
    entryChunkBytes: 120 * 1024,
    entryChunkLimitBytes: ENTRY_CHUNK_LIMIT_BYTES,
    entryChunkWithinLimit: true,
    missingPrefixes: [],
    ok: true,
  });
});

test('analyzeBundleAssets fails when the entry chunk is above the configured limit', () => {
  const files = ['index-main.js', ...REQUIRED_JS_PREFIXES.map((prefix) => `${prefix}chunk.js`)];
  const report = analyzeBundleAssets({
    distAssetsDir: '/tmp/dist/assets',
    files,
    getFileSize() {
      return ENTRY_CHUNK_LIMIT_BYTES + 1;
    },
  });

  assert.equal(report.entryChunkWithinLimit, false);
  assert.equal(report.ok, false);
  assert.deepEqual(report.missingPrefixes, []);
});

test('analyzeBundleAssets fails when required lazy chunks are missing', () => {
  const files = ['index-main.js', 'DashboardPage-a.js', 'map-b.js'];
  const report = analyzeBundleAssets({
    distAssetsDir: '/tmp/dist/assets',
    files,
    getFileSize() {
      return 10 * 1024;
    },
  });

  assert.equal(report.entryChunkWithinLimit, true);
  assert.equal(report.ok, false);
  assert.ok(report.missingPrefixes.includes('TaskManagementPage-'));
  assert.ok(report.missingPrefixes.includes('GlobalMapTaskModal-'));
});

test('analyzeBundleAssets throws when no entry chunk is present', () => {
  assert.throws(
    () =>
      analyzeBundleAssets({
        distAssetsDir: '/tmp/dist/assets',
        files: ['DashboardPage-a.js'],
        getFileSize() {
          return 10 * 1024;
        },
      }),
    /No entry chunk matching index-\*\.js was found/,
  );
});
