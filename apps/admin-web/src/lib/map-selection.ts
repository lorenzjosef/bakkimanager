import type { BakkiMapSelection } from '@bakki/map';

export const MAP_MANAGEMENT_HANDOFF_STORAGE_KEY = 'bakki.mapManagementHandoff';

export function isSameMapSelection(left: BakkiMapSelection | null, right: BakkiMapSelection | null) {
  return left?.kind === right?.kind
    && left?.zoneId === right?.zoneId
    && left?.zoneName === right?.zoneName
    && left?.areaId === right?.areaId
    && left?.areaName === right?.areaName;
}

export function buildMapManagementHandoffSelection({
  areaId,
  areaName,
  selection,
  zoneName,
}: {
  areaId: string | null;
  areaName: string;
  selection: BakkiMapSelection | null;
  zoneName: string;
}): BakkiMapSelection | null {
  if (!selection || !areaId) {
    return null;
  }

  return {
    kind: 'area',
    zoneId: selection.zoneId,
    zoneName,
    areaId,
    areaName,
  };
}

export function serializeMapSelection(selection: BakkiMapSelection) {
  return JSON.stringify(selection);
}

export function parseMapSelection(raw: string | null | undefined): BakkiMapSelection | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.kind !== 'area' && parsed.kind !== 'zone') {
      return null;
    }

    if (
      typeof parsed.zoneId !== 'string'
      || typeof parsed.zoneName !== 'string'
      || (parsed.areaId !== null && typeof parsed.areaId !== 'string')
      || (parsed.areaName !== null && typeof parsed.areaName !== 'string')
    ) {
      return null;
    }

    return {
      kind: parsed.kind,
      zoneId: parsed.zoneId,
      zoneName: parsed.zoneName,
      areaId: parsed.areaId,
      areaName: parsed.areaName,
    };
  } catch {
    return null;
  }
}
