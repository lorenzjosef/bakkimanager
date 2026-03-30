import type {
  MapManagementAreaFixture,
  MapManagementFixture,
  MapManagementZoneFixture,
  MapViewerData,
  RanchBoundary,
  ZoneSummary,
} from '@bakki/domain';
import type {
  BakkiAreaMetricsService,
  BakkiAreaMetricsRecord,
} from '../../bakki-core/bakki-area-metrics.service';
import type {
  BakkiAreaCatalogRecord,
  BakkiGeometryService,
} from '../../bakki-core/bakki-geometry.service';
import type { BakkiSpeciesService } from '../../bakki-core/bakki-species.service';
import type {
  BakkiAreaContractRecord,
  BakkiPhaseService,
} from '../../bakki-core/bakki-phase.service';
import {
  buildAreaViewerOverlay,
  buildZoneViewerOverlay,
} from './map.service.helpers';

interface ViewerDataDeps {
  bakkiAreaMetrics: BakkiAreaMetricsService;
  bakkiGeometry: Pick<BakkiGeometryService, 'getRanchCoordinateLabel' | 'listAreas'>;
  bakkiPhases: BakkiPhaseService;
  bakkiSpecies: Pick<BakkiSpeciesService, 'isConfigured' | 'listSpecies'>;
  logger: Pick<Console, 'warn'>;
  getRanchBoundary: () => Promise<RanchBoundary>;
  listZones: () => Promise<ZoneSummary[]>;
}

interface ManagementDataDeps {
  bakkiAreaMetrics: BakkiAreaMetricsService;
  bakkiGeometry: Pick<BakkiGeometryService, 'getZoneBoundaryCoordinateLines' | 'listAreas'>;
  bakkiPhases: BakkiPhaseService;
  logger: Pick<Console, 'warn'>;
  listZones: () => Promise<ZoneSummary[]>;
}

export async function buildMapViewerData(deps: ViewerDataDeps) {
  const [ranch, zones, areaCatalog, ranchCoordinates] = await Promise.all([
    deps.getRanchBoundary(),
    deps.listZones(),
    deps.bakkiGeometry.listAreas(),
    deps.bakkiGeometry.getRanchCoordinateLabel(),
  ]);

  const areas = [...areaCatalog.values()];
  const areasByZoneId = groupAreasByZone(areas);
  const areaRefs = areas.map((area) => area.areaRef);

  // Parallelize the secondary data fetches for better performance
  const [areaMetricsByAreaRef, latestObservationRefsByAreaRef, contractsByAreaRef, speciesList] = await Promise.all([
    deps.bakkiAreaMetrics.isConfigured()
      ? loadAreaMetricsByAreaRef(deps, areaRefs)
      : Promise.resolve(new Map<string, BakkiAreaMetricsRecord>()),
    deps.bakkiAreaMetrics.isConfigured()
      ? loadLatestObservationRefsByAreaRef(deps, areaRefs)
      : Promise.resolve(new Map<string, string>()),
    deps.bakkiPhases.isConfigured()
      ? loadLatestContractsByAreaRef(deps, areaRefs)
      : Promise.resolve(new Map<string, BakkiAreaContractRecord>()),
    deps.bakkiSpecies.isConfigured()
      ? deps.bakkiSpecies.listSpecies()
      : Promise.resolve([]),
  ]);

  const speciesByRef = new Map(speciesList.map((species) => [species.speciesRef, species] as const));

  // Pre-index zones for O(1) lookup instead of O(n) find() in loop
  const zonesById = new Map(zones.map((zone) => [zone.id, zone]));

  return {
    zoneCountLabel: `${zones.length} Zones`,
    ranchCountLabel: ranch.name,
    defaultHint:
      zones.length > 0
        ? 'Click a zone or area to inspect live contract and density details.'
        : 'No mapped zones are available yet.',
    defaultCoordinates: ranchCoordinates ?? 'Unavailable',
    areaOverlaysByAreaId: Object.fromEntries(
      areas.map((area) => {
        const zone = zonesById.get(area.zoneRef);
        return [
          area.areaRef,
          buildAreaViewerOverlay(
            zone?.name ?? area.zoneRef,
            area,
            area.assignedSpeciesRef ? (speciesByRef.get(area.assignedSpeciesRef)?.commonName ?? area.assignedSpeciesRef) : null,
            areaMetricsByAreaRef.get(area.areaRef) ?? null,
            contractsByAreaRef.get(area.areaRef) ?? null,
            latestObservationRefsByAreaRef.get(area.areaRef) ?? null,
          ),
        ];
      }),
    ),
    zoneOverlaysByZoneId: Object.fromEntries(
      zones.map((zone) => [
        zone.id,
        buildZoneViewerOverlay(
          zone,
          areasByZoneId.get(zone.id) ?? [],
          areaMetricsByAreaRef,
          contractsByAreaRef,
          latestObservationRefsByAreaRef,
        ),
      ]),
    ),
  } satisfies MapViewerData;
}

export async function buildMapManagementData(deps: ManagementDataDeps) {
  const zones = await deps.listZones();
  if (zones.length === 0) {
    return {
      areasById: {},
      zonesById: {},
    } satisfies MapManagementFixture;
  }

  const [areaCatalog, boundaryCoordinatesByZone] = await Promise.all([
    deps.bakkiGeometry.listAreas(),
    deps.bakkiGeometry.getZoneBoundaryCoordinateLines(zones.map((zone) => zone.id)),
  ]);
  const areas = [...areaCatalog.values()];
  const areasByZoneId = groupAreasByZone(areas);
  const areaRefs = areas.map((area) => area.areaRef);
  const areaMetricsByAreaRef = deps.bakkiAreaMetrics.isConfigured()
    ? await loadAreaMetricsByAreaRef(deps, areaRefs)
    : new Map<string, BakkiAreaMetricsRecord>();
  const contractsByAreaRef = deps.bakkiPhases.isConfigured()
    ? await loadLatestContractsByAreaRef(deps, areaRefs)
    : new Map<string, BakkiAreaContractRecord>();

  return {
    areasById: Object.fromEntries(
      areas.map((area) => {
        const zone = zones.find((candidate) => candidate.id === area.zoneRef);
        return [
          area.areaRef,
          buildManagementArea(
            area,
            zone?.name ?? area.zoneRef,
            areaMetricsByAreaRef.get(area.areaRef) ?? null,
            contractsByAreaRef.get(area.areaRef) ?? null,
          ),
        ];
      }),
    ),
    zonesById: Object.fromEntries(
      zones.map((zone) => [
        zone.id,
        buildManagementZone(
          zone,
          areasByZoneId.get(zone.id) ?? [],
          areaMetricsByAreaRef,
          contractsByAreaRef,
          boundaryCoordinatesByZone.get(zone.id) ?? [],
        ),
      ]),
    ),
  } satisfies MapManagementFixture;
}

function buildManagementZone(
  zone: ZoneSummary,
  zoneAreas: BakkiAreaCatalogRecord[],
  areaMetricsByAreaRef: Map<string, BakkiAreaMetricsRecord>,
  contractsByAreaRef: Map<string, BakkiAreaContractRecord>,
  boundaryCoordinates: string[],
): MapManagementZoneFixture {
  const editableArea = selectEditableArea(zoneAreas, areaMetricsByAreaRef, contractsByAreaRef);
  const areaMetrics = editableArea ? areaMetricsByAreaRef.get(editableArea.areaRef) ?? null : null;
  const contract = editableArea ? contractsByAreaRef.get(editableArea.areaRef) ?? null : null;
  const treeCount = areaMetrics?.currentTreeCount ?? null;
  const density = areaMetrics?.currentDensityPer100Sqm ?? contract?.targetDensityPer100Sqm ?? null;
  const contractGoal = contract?.contractTreeGoal ?? null;
  const fulfillmentValue =
    contractGoal && contractGoal > 0
      ? `${Math.min(100, Math.round(((treeCount ?? 0) / contractGoal) * 100))}%`
      : 'Unavailable';

  return {
    areaCount: zoneAreas.length,
    areaCountLabel: 'Mapped Areas',
    currentDensityPer100Sqm: density,
    currentTreeCount: treeCount,
    editableAreaId: editableArea?.areaRef ?? null,
    editableAreaName: editableArea?.areaName ?? 'No editable area linked',
    zoneName: zone.name,
    prominentDensityLabel: 'Current Density',
    prominentDensityValue:
      typeof density === 'number' && Number.isFinite(density)
        ? `${Math.round(density)} / 100m²`
        : 'Unavailable',
    contractFulfillmentLabel: 'Contract Fulfillment',
    contractFulfillmentValue: fulfillmentValue,
    currentTreeCountLabel: 'Current Tree Count',
    currentTreeCountValue:
      typeof treeCount === 'number'
        ? treeCount.toLocaleString('en-US')
        : 'Unavailable',
    assignedPlanterLabel: 'Assigned Planter',
    assignedPlanterValue: contract?.assignedUserName || 'Unassigned',
    areaDefinitionStatus: editableArea
      ? `${zoneAreas.length} mapped area${zoneAreas.length === 1 ? '' : 's'} linked to Bakki Core geometry`
      : 'No editable area linked to this zone',
    boundaryCoordinates,
    notes: editableArea
      ? 'Zone boundaries and linked area metadata are loaded from Bakki Core.'
      : 'No editable area is currently linked to this zone in Bakki Core.',
  };
}

function buildManagementArea(
  area: BakkiAreaCatalogRecord,
  zoneName: string,
  areaMetrics: BakkiAreaMetricsRecord | null,
  contract: BakkiAreaContractRecord | null,
): MapManagementAreaFixture {
  const treeCount = areaMetrics?.currentTreeCount ?? null;
  const density = areaMetrics?.currentDensityPer100Sqm ?? contract?.targetDensityPer100Sqm ?? null;

  return {
    areaDefinitionStatus: 'Area linked to Bakki Core geometry',
    areaId: area.areaRef,
    areaName: area.areaName,
    assignedPlanterLabel: 'Planted By',
    assignedPlanterValue: contract?.assignedUserName || 'Unassigned',
    currentDensityPer100Sqm: density,
    currentTreeCount: treeCount,
    currentTreeCountLabel: 'Current Tree Count',
    currentTreeCountValue:
      typeof treeCount === 'number'
        ? treeCount.toLocaleString('en-US')
        : 'Unavailable',
    notes: 'Area geometry and management metadata are loaded from Bakki Core.',
    zoneId: area.zoneRef,
    zoneName,
  };
}

function selectEditableArea(
  zoneAreas: BakkiAreaCatalogRecord[],
  areaMetricsByAreaRef: Map<string, BakkiAreaMetricsRecord>,
  contractsByAreaRef: Map<string, BakkiAreaContractRecord>,
) {
  return zoneAreas.find(
    (area) => areaMetricsByAreaRef.has(area.areaRef) || contractsByAreaRef.has(area.areaRef),
  ) ?? zoneAreas[0] ?? null;
}

function groupAreasByZone(areas: BakkiAreaCatalogRecord[]) {
  const areasByZoneId = new Map<string, BakkiAreaCatalogRecord[]>();

  for (const area of areas) {
    const entries = areasByZoneId.get(area.zoneRef) ?? [];
    entries.push(area);
    areasByZoneId.set(area.zoneRef, entries);
  }

  return areasByZoneId;
}

async function loadAreaMetricsByAreaRef(
  deps: Pick<ViewerDataDeps, 'bakkiAreaMetrics' | 'logger'>,
  areaRefs: string[],
) {
  if (areaRefs.length === 0) {
    return new Map<string, BakkiAreaMetricsRecord>();
  }

  try {
    const records = await deps.bakkiAreaMetrics.listByAreaRefs(areaRefs);
    return new Map(records.map((record) => [record.areaRef, record] as const));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown map viewer area-metrics error';
    deps.logger.warn(`Bakki Core area metrics unavailable; returning empty area metrics. ${message}`);
    return new Map<string, BakkiAreaMetricsRecord>();
  }
}

async function loadLatestObservationRefsByAreaRef(
  deps: Pick<ViewerDataDeps, 'bakkiAreaMetrics' | 'logger'>,
  areaRefs: string[],
) {
  if (areaRefs.length === 0) {
    return new Map<string, string>();
  }

  try {
    return await deps.bakkiAreaMetrics.listLatestObservationRefsByAreaRefs(areaRefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown map viewer observation lookup error';
    deps.logger.warn(`Bakki Core observation lookup unavailable; returning empty observation state. ${message}`);
    return new Map<string, string>();
  }
}

async function loadLatestContractsByAreaRef(
  deps: Pick<ViewerDataDeps, 'bakkiPhases' | 'logger'>,
  areaRefs: string[],
) {
  if (areaRefs.length === 0) {
    return new Map<string, BakkiAreaContractRecord>();
  }

  try {
    return await deps.bakkiPhases.getLatestContractsByAreaRefs(areaRefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown map viewer contract lookup error';
    deps.logger.warn(`Bakki Core contract lookup unavailable; returning empty contract state. ${message}`);
    return new Map<string, BakkiAreaContractRecord>();
  }
}
