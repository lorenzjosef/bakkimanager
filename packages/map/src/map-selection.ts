import { Geometry } from 'ol/geom';
import type Feature from 'ol/Feature';
import type { BakkiMapSelection } from './types';

export function resolveZoneSelection(feature: Feature<Geometry> | undefined): BakkiMapSelection | null {
  const zoneId = feature?.get('zoneId') as string | undefined;
  const zoneName = feature?.get('zoneName') as string | undefined;
  if (!zoneId || !zoneName) {
    return null;
  }

  return {
    kind: 'zone',
    zoneId,
    zoneName,
    areaId: null,
    areaName: null,
  };
}

export function resolveAreaSelection(feature: Feature<Geometry> | undefined): BakkiMapSelection | null {
  const zoneId = feature?.get('zoneId') as string | undefined;
  const zoneName = feature?.get('zoneName') as string | undefined;
  const areaId = feature?.get('areaId') as string | undefined;
  const areaName = feature?.get('areaName') as string | undefined;
  if (!zoneId || !zoneName || !areaId) {
    return null;
  }

  return {
    kind: 'area',
    zoneId,
    zoneName,
    areaId,
    areaName: areaName ?? null,
  };
}
