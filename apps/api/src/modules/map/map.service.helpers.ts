import {
  type GeoJsonGeometry,
  type MapViewerOverlayData,
  type ZoneSummary,
} from '@bakki/domain';
import type { BakkiAreaMetricsRecord } from '../../bakki-core/bakki-area-metrics.service';
import type { BakkiAreaCatalogRecord } from '../../bakki-core/bakki-geometry.service';
import type { BakkiAreaContractRecord } from '../../bakki-core/bakki-phase.service';

export type GeometryUpdatePersistence = 'bakki-core';

export function buildAreaViewerOverlay(
  zoneLabel: string,
  area: BakkiAreaCatalogRecord,
  assignedSpeciesName: string | null,
  areaMetrics: BakkiAreaMetricsRecord | null,
  contract: BakkiAreaContractRecord | null,
  observationOwnerId: string | null,
): MapViewerOverlayData {
  const treeCount = areaMetrics?.currentTreeCount ?? null;
  const density = areaMetrics?.currentDensityPer100Sqm ?? contract?.targetDensityPer100Sqm ?? null;

  return {
    zoneId: area.zoneRef,
    zoneLabel,
    title: area.areaName,
    focusAreaId: area.areaRef,
    focusAreaName: area.areaName,
    observationOwnerId,
    densityLabel: 'Current Density',
    densityValue: density !== null ? `${Math.round(density)} / 100m²` : 'Unavailable',
    densitySupport:
      treeCount !== null
        ? `Latest monitored estimate: ${treeCount.toLocaleString('en-US')} trees in this area`
        : 'No monitored tree count is recorded for this area yet.',
    contractLabel: 'Trees Planted',
    contractValue: treeCount !== null ? `${treeCount.toLocaleString('en-US')} trees` : 'Unavailable',
    contractSupport:
      treeCount !== null
        ? `${treeCount.toLocaleString('en-US')} trees are currently recorded for this area`
        : 'No planted tree count is recorded for this area yet.',
    speciesLabel: 'Assigned Sapling',
    speciesValue: assignedSpeciesName ?? area.assignedSpeciesRef ?? 'Unavailable',
    estimatedCountLabel: 'Trees Planted',
    estimatedCountValue: treeCount !== null ? `${treeCount.toLocaleString('en-US')} trees` : 'Unavailable',
    metricsTitle: 'Area Metrics',
    metrics: [
      {
        label: 'Latest Observation',
        value: areaMetrics ? new Date(areaMetrics.updatedAt).toLocaleDateString('en-US') : 'Unavailable',
      },
      {
        label: 'Planted By',
        value: contract?.assignedUserName || 'Unassigned',
      },
    ],
    photosTitle: 'Field Photos',
    photos: [],
  };
}

export function buildZoneViewerOverlay(
  zone: ZoneSummary,
  zoneAreas: BakkiAreaCatalogRecord[],
  areaMetricsByAreaRef: Map<string, BakkiAreaMetricsRecord>,
  contractsByAreaRef: Map<string, BakkiAreaContractRecord>,
  latestObservationRefsByAreaRef: Map<string, string>,
): MapViewerOverlayData {
  const primaryArea = zoneAreas.find(
    (area) => areaMetricsByAreaRef.has(area.areaRef) || contractsByAreaRef.has(area.areaRef),
  ) ?? zoneAreas[0] ?? null;
  const densities = zoneAreas
    .map((area) => areaMetricsByAreaRef.get(area.areaRef)?.currentDensityPer100Sqm ?? contractsByAreaRef.get(area.areaRef)?.targetDensityPer100Sqm ?? null)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const totalTreeCount = zoneAreas.reduce(
    (sum, area) => sum + Math.max(areaMetricsByAreaRef.get(area.areaRef)?.currentTreeCount ?? 0, 0),
    0,
  );
  const totalContractGoal = zoneAreas.reduce(
    (sum, area) => sum + Math.max(contractsByAreaRef.get(area.areaRef)?.contractTreeGoal ?? 0, 0),
    0,
  );
  const contractedAreaCount = zoneAreas.filter((area) => contractsByAreaRef.has(area.areaRef)).length;
  const observationCount = zoneAreas.filter((area) => latestObservationRefsByAreaRef.has(area.areaRef)).length;
  const averageDensity = densities.length > 0
    ? Math.round(densities.reduce((sum, value) => sum + value, 0) / densities.length)
    : null;
  const fulfillmentPercent = totalContractGoal > 0
    ? Math.min(100, Math.round((totalTreeCount / totalContractGoal) * 100))
    : null;

  return {
    zoneId: zone.id,
    zoneLabel: zone.name,
    title: zone.name,
    focusAreaId: primaryArea?.areaRef ?? null,
    focusAreaName: primaryArea?.areaName ?? null,
    observationOwnerId: primaryArea ? latestObservationRefsByAreaRef.get(primaryArea.areaRef) ?? null : null,
    densityLabel: 'Average Density',
    densityValue: averageDensity !== null ? `${averageDensity} / 100m²` : 'Unavailable',
    densitySupport:
      densities.length > 0
        ? `Average density derived from ${densities.length} mapped area${densities.length === 1 ? '' : 's'} in this zone`
        : 'No area density records are available for this zone yet.',
    contractLabel: 'Contract Fulfillment',
    contractValue:
      totalContractGoal > 0
        ? `${totalTreeCount.toLocaleString('en-US')} / ${totalContractGoal.toLocaleString('en-US')} trees`
        : 'Unavailable',
    contractSupport:
      totalContractGoal > 0
        ? `${totalTreeCount.toLocaleString('en-US')} of ${totalContractGoal.toLocaleString('en-US')} trees recorded across the zone contracts`
        : 'No active contracts are linked to the mapped areas in this zone.',
    speciesLabel: 'Contract Goal',
    speciesValue: totalContractGoal > 0 ? `${totalContractGoal.toLocaleString('en-US')} trees` : 'Unavailable',
    estimatedCountLabel: 'Contract Fulfillment',
    estimatedCountValue:
      totalContractGoal > 0
        ? `${totalTreeCount.toLocaleString('en-US')} / ${totalContractGoal.toLocaleString('en-US')} trees`
        : 'Unavailable',
    metricsTitle: 'Zone Metrics',
    metrics: [
      {
        label: 'Mapped Areas',
        value: String(zoneAreas.length),
      },
      {
        label: 'Contracted Areas',
        value: String(contractedAreaCount),
      },
      {
        label: 'Latest Observations',
        value: String(observationCount),
        tone: 'emphasis',
      },
    ],
    photosTitle: 'Field Photos',
    photos: [],
  };
}

export function isPolygonGeometry(geometry: GeoJsonGeometry | null | undefined) {
  return geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';
}

export function isBakkiCoreConnectivityError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('database is not configured')
    || normalized.includes('connect econnrefused')
    || normalized.includes('connect etimedout')
    || normalized.includes('connection terminated unexpectedly')
    || normalized.includes('the server closed the connection unexpectedly')
    || normalized.includes('timeout expired')
    || normalized.includes('getaddrinfo')
    || normalized.includes('no pg_hba')
    || normalized.includes('password authentication failed')
    || normalized.includes('relation "bakki_area" does not exist')
    || normalized.includes('relation "bakki_zone" does not exist')
    || normalized.includes('relation "bakki_ranch" does not exist');
}

export function capitalizeGeometryUpdateDescription(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function formatBoundaryCoordinates(coordinates: unknown): string[] {
  return extractFirstLinearRing(coordinates)
    .map(([lon, lat], index) => `P${index + 1}: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
}

export function extractFirstLinearRing(coordinates: unknown): number[][] {
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
