import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  analyzeBundleAssets,
  formatKilobytes,
} from './check-web-bundle-lib.mjs';

const DIST_ASSETS_DIR = path.resolve('apps/admin-web/dist/assets');

function listDirectoryEntries() {
  try {
    return readdirSync(DIST_ASSETS_DIR);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`Build assets not found at ${DIST_ASSETS_DIR}. Run the web build first. (${reason})`);
  }
}

function buildReport() {
  const files = listDirectoryEntries();
  return analyzeBundleAssets({
    distAssetsDir: DIST_ASSETS_DIR,
    files,
    getFileSize(entryChunk) {
      return statSync(path.join(DIST_ASSETS_DIR, entryChunk)).size;
    },
  });
}

function printTextReport(report) {
  console.log(`Dist assets: ${report.distAssetsDir}`);
  console.log(
    `Entry chunk: ${report.entryChunk} (${formatKilobytes(report.entryChunkBytes)} / limit ${formatKilobytes(report.entryChunkLimitBytes)})`,
  );

  if (report.missingPrefixes.length > 0) {
    console.log('Missing lazy chunks:');
    for (const prefix of report.missingPrefixes) {
      console.log(`- ${prefix}*.js`);
    }
  } else {
    console.log('All required lazy chunks are present.');
  }

  if (!report.entryChunkWithinLimit) {
    console.log('Entry chunk is above the configured limit.');
  }
}

try {
  const report = buildReport();
  const wantsJson = process.argv.includes('--json');

  if (wantsJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report);
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown bundle check failure.';

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  } else {
    console.error(message);
  }

  process.exitCode = 1;
}
