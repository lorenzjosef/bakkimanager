export const ENTRY_CHUNK_LIMIT_BYTES = 350 * 1024;
export const REQUIRED_JS_PREFIXES = [
  'DashboardPage-',
  'MapManagementPage-',
  'MapViewerPage-',
  'PlantingPhasesOverviewPage-',
  'PlantingWizardPage-',
  'SpeciesInventoryPage-',
  'SupportPage-',
  'SystemSettingsPage-',
  'TaskManagementPage-',
  'UserManagementPage-',
  'GlobalMapTaskModal-',
  'map-',
];

export function formatKilobytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

export function findEntryChunk(files) {
  return files.find((file) => file.startsWith('index-') && file.endsWith('.js')) ?? null;
}

export function collectMissingPrefixes(files, requiredJsPrefixes = REQUIRED_JS_PREFIXES) {
  return requiredJsPrefixes.filter((prefix) => !files.some((file) => file.startsWith(prefix) && file.endsWith('.js')));
}

export function analyzeBundleAssets({
  distAssetsDir,
  files,
  getFileSize,
  entryChunkLimitBytes = ENTRY_CHUNK_LIMIT_BYTES,
  requiredJsPrefixes = REQUIRED_JS_PREFIXES,
}) {
  const entryChunk = findEntryChunk(files);

  if (!entryChunk) {
    throw new Error('No entry chunk matching index-*.js was found in the built web assets.');
  }

  const entryChunkBytes = getFileSize(entryChunk);
  const missingPrefixes = collectMissingPrefixes(files, requiredJsPrefixes);
  const entryChunkWithinLimit = entryChunkBytes <= entryChunkLimitBytes;

  return {
    distAssetsDir,
    entryChunk,
    entryChunkBytes,
    entryChunkLimitBytes,
    entryChunkWithinLimit,
    missingPrefixes,
    ok: entryChunkWithinLimit && missingPrefixes.length === 0,
  };
}
