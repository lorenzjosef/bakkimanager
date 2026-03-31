import * as FileSystem from 'expo-file-system';

export interface TileCacheBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface TileCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface TileCacheResult {
  attempted: number;
  downloaded: number;
  skipped: number;
  failed: number;
  pathTemplate: string | null;
}

const TILE_SERVER_URL_TEMPLATE = 'https://tile.opentopomap.org/{z}/{x}/{y}.png';
const TILE_CACHE_ROOT = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}bakki-map-tiles`
  : null;
const DEFAULT_ZOOMS = [12, 13, 14];
const MAX_TILES_PER_PREFETCH = 320;
const DOWNLOAD_CONCURRENCY = 6;

function clampLatitude(value: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, value));
}

function clampLongitude(value: number) {
  return Math.max(-180, Math.min(180, value));
}

function toTileX(longitude: number, zoom: number) {
  return Math.floor(((longitude + 180) / 360) * 2 ** zoom);
}

function toTileY(latitude: number, zoom: number) {
  const radians = (latitude * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** zoom,
  );
}

function buildTileList(bounds: TileCacheBounds, zoomLevels = DEFAULT_ZOOMS): TileCoordinate[] {
  const north = clampLatitude(Math.max(bounds.minLat, bounds.maxLat));
  const south = clampLatitude(Math.min(bounds.minLat, bounds.maxLat));
  const west = clampLongitude(Math.min(bounds.minLng, bounds.maxLng));
  const east = clampLongitude(Math.max(bounds.minLng, bounds.maxLng));

  const tiles: TileCoordinate[] = [];
  for (const zoom of zoomLevels) {
    const minX = toTileX(west, zoom);
    const maxX = toTileX(east, zoom);
    const minY = toTileY(north, zoom);
    const maxY = toTileY(south, zoom);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        tiles.push({ x, y, z: zoom });
      }
    }
  }

  return tiles.slice(0, MAX_TILES_PER_PREFETCH);
}

function tilePath(tile: TileCoordinate): string | null {
  if (!TILE_CACHE_ROOT) {
    return null;
  }
  return `${TILE_CACHE_ROOT}/${tile.z}/${tile.x}/${tile.y}.png`;
}

function tileUrl(tile: TileCoordinate): string {
  return TILE_SERVER_URL_TEMPLATE
    .replace('{z}', String(tile.z))
    .replace('{x}', String(tile.x))
    .replace('{y}', String(tile.y));
}

export function getTileUrlTemplate() {
  return TILE_SERVER_URL_TEMPLATE;
}

export function getLocalTilePathTemplate() {
  if (!TILE_CACHE_ROOT) {
    return null;
  }
  return `${TILE_CACHE_ROOT}/{z}/{x}/{y}.png`;
}

export async function ensureOfflineTileCache(bounds: TileCacheBounds): Promise<TileCacheResult> {
  const pathTemplate = getLocalTilePathTemplate();
  if (!TILE_CACHE_ROOT || !pathTemplate) {
    return {
      attempted: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
      pathTemplate: null,
    };
  }

  await FileSystem.makeDirectoryAsync(TILE_CACHE_ROOT, { intermediates: true });

  const tiles = buildTileList(bounds);
  let index = 0;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  async function worker() {
    while (index < tiles.length) {
      const tile = tiles[index];
      index += 1;
      const localPath = tilePath(tile);
      if (!localPath) {
        failed += 1;
        continue;
      }

      try {
        const existing = await FileSystem.getInfoAsync(localPath);
        if (existing.exists) {
          skipped += 1;
          continue;
        }

        await FileSystem.makeDirectoryAsync(`${TILE_CACHE_ROOT}/${tile.z}/${tile.x}`, {
          intermediates: true,
        });
        await FileSystem.downloadAsync(tileUrl(tile), localPath);
        downloaded += 1;
      } catch {
        failed += 1;
      }
    }
  }

  const workerCount = Math.min(DOWNLOAD_CONCURRENCY, Math.max(1, tiles.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    attempted: tiles.length,
    downloaded,
    skipped,
    failed,
    pathTemplate,
  };
}
