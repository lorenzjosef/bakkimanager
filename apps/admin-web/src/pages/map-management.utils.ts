import type {
  GeoJsonGeometry,
  MapManagementAreaFixture,
  MapManagementFixture,
  MapManagementZoneFixture,
} from '@bakki/domain';
import type { BakkiMapSelection } from '@bakki/map';

export type MapManagementRenderState = 'loading' | 'unavailable' | 'ready';
export type MapManagementOverlayMode = 'zone-info' | 'edit-areas' | 'create-area' | 'area-edit';

export function resolveMapManagementRenderState(
  mapManagement: MapManagementFixture | null | undefined,
  isPending: boolean,
): MapManagementRenderState {
  if (isPending && !mapManagement) {
    return 'loading';
  }

  if (!mapManagement) {
    return 'unavailable';
  }

  return 'ready';
}

export function formatZoneName(zoneId: string | null) {
  if (!zoneId) {
    return 'Zone';
  }

  const match = zoneId.match(/zone-(\d+)/);
  return match ? `Zone ${match[1]}` : 'Zone';
}

export function resolveInitialManagementZoneId(
  mapManagement: MapManagementFixture | null | undefined,
) {
  if (!mapManagement) {
    return null;
  }

  return Object.keys(mapManagement.zonesById)[0] ?? null;
}

export function resolveInitialManagementSelection(
  mapManagement: MapManagementFixture | null | undefined,
): BakkiMapSelection | null {
  const zoneId = resolveInitialManagementZoneId(mapManagement);
  if (!zoneId || !mapManagement) {
    return null;
  }

  const zoneDetail = mapManagement.zonesById[zoneId];
  return {
    kind: 'zone',
    zoneId,
    zoneName: zoneDetail?.zoneName ?? formatZoneName(zoneId),
    areaId: zoneDetail?.editableAreaId ?? null,
    areaName: zoneDetail?.editableAreaName ?? null,
  };
}

export function buildZoneSummarySelection(
  selection: BakkiMapSelection | null | undefined,
): BakkiMapSelection | null {
  if (!selection) {
    return null;
  }

  return {
    kind: 'zone',
    zoneId: selection.zoneId,
    zoneName: selection.zoneName,
    areaId: selection.areaId,
    areaName: selection.areaName,
  };
}

export function resolveOverlayModeFromSelection(
  selection: BakkiMapSelection | null | undefined,
): MapManagementOverlayMode {
  return selection?.kind === 'area' ? 'area-edit' : 'zone-info';
}

export function resolveZoneAreas(
  mapManagement: MapManagementFixture | null | undefined,
  zoneId: string | null | undefined,
) {
  if (!mapManagement || !zoneId) {
    return [];
  }

  return Object.values(mapManagement.areasById)
    .filter((area) => area.zoneId === zoneId)
    .sort((left, right) => left.areaName.localeCompare(right.areaName));
}

export function resolveMapManagementSecondaryActionLabel({
  hasAnyDraftChanges,
  hasEditableArea,
  isAreaSelection,
  isGeometryEditing,
}: {
  hasAnyDraftChanges: boolean;
  hasEditableArea: boolean;
  isAreaSelection: boolean;
  isGeometryEditing: boolean;
}) {
  if (hasAnyDraftChanges) {
    return 'Discard Draft';
  }

  if (isGeometryEditing) {
    return 'Stop Editing';
  }

  if (isAreaSelection) {
    return 'Back to Zone Summary';
  }

  if (hasEditableArea) {
    return 'Open Area Editor';
  }

  return 'Close';
}

export function createAreaMetricsDraft(
  zoneDetail: Pick<MapManagementZoneFixture | MapManagementAreaFixture, 'currentDensityPer100Sqm' | 'currentTreeCount'>,
) {
  return {
    densityInput:
      typeof zoneDetail.currentDensityPer100Sqm === 'number'
        ? String(zoneDetail.currentDensityPer100Sqm)
        : '',
    treeCountInput:
      typeof zoneDetail.currentTreeCount === 'number'
        ? String(zoneDetail.currentTreeCount)
        : '',
  };
}

export function resolveAreaNameDraft(options: {
  areaCount: number;
  areaName?: string | null;
  zoneName: string;
}) {
  const normalizedAreaName = options.areaName?.trim();
  if (normalizedAreaName) {
    return normalizedAreaName;
  }

  return `${options.zoneName} Area ${Math.max(options.areaCount, 0) + 1}`;
}

export function validateAreaNameInput(areaNameInput: string) {
  if (!areaNameInput.trim()) {
    return {
      ok: false as const,
      error: 'Area name is required.',
    };
  }

  return {
    ok: true as const,
    value: areaNameInput.trim(),
  };
}

export function buildAreaMetricsUpdatePayload(
  densityInput: string,
  treeCountInput: string,
):
  | { ok: false; error: string }
  | {
      ok: true;
      payload: {
        densityPer100Sqm: number;
        treeCount?: number;
      };
    } {
  const normalizedDensity = Number(densityInput.trim());
  const normalizedTreeCount = treeCountInput.trim() ? Number(treeCountInput.trim()) : undefined;

  if (!Number.isFinite(normalizedDensity) || normalizedDensity <= 0) {
    return {
      ok: false,
      error: 'Density must be a positive number.',
    };
  }

  if (
    normalizedTreeCount !== undefined
    && (!Number.isFinite(normalizedTreeCount) || normalizedTreeCount < 0)
  ) {
    return {
      ok: false,
      error: 'Tree count must be zero or a positive number.',
    };
  }

  return {
    ok: true,
    payload: {
      densityPer100Sqm: normalizedDensity,
      ...(normalizedTreeCount !== undefined ? { treeCount: normalizedTreeCount } : {}),
    },
  };
}

export function buildAreaMetricsSuccessMessage(areaName: string, densityPer100Sqm: number) {
  return `Updated ${areaName} density to ${Math.round(densityPer100Sqm)} / 100m².`;
}

export function buildAreaGeometrySuccessMessage(areaName: string) {
  return `Updated ${areaName} boundary in Bakki Core.`;
}

export function buildAreaDetailsSuccessMessage(areaName: string) {
  return `Updated ${areaName} details in Bakki Core.`;
}

export function buildAreaCreatedSuccessMessage(areaName: string) {
  return `Created ${areaName} in Bakki Core.`;
}

export function buildAreaDeletedSuccessMessage(areaName: string) {
  return `Deleted ${areaName} from Bakki Core.`;
}

export function buildZoneGeometrySuccessMessage(zoneName: string) {
  return `Updated ${zoneName} boundary in Bakki Core.`;
}

export function formatBoundaryCoordinatesFromGeometry(geometry: GeoJsonGeometry | null | undefined) {
  if (!geometry) {
    return [];
  }

  return extractFirstLinearRing(geometry.coordinates)
    .map(([lon, lat], index) => `P${index + 1}: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
}

function extractFirstLinearRing(coordinates: unknown): number[][] {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  const first = coordinates[0];
  if (!Array.isArray(first) || first.length === 0) {
    return [];
  }

  if (typeof first[0] === 'number') {
    return coordinates as number[][];
  }

  const second = first[0];
  if (Array.isArray(second) && typeof second[0] === 'number') {
    return first as number[][];
  }

  if (Array.isArray(second) && Array.isArray(second[0])) {
    return second as number[][];
  }

  return [];
}
