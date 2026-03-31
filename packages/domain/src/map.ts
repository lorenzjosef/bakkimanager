export interface UpdateAreaMetricsRequest {
  densityPer100Sqm: number;
  treeCount?: number | null;
}

export interface UpdateAreaMetricsResponse {
  areaId: string;
  areaName: string;
  densityPer100Sqm: number;
  source?: 'legacy_area_metrics' | 'plot_estimate_projection';
  treeCount: number | null;
  updatedAt: string;
  zoneId: string | null;
}

export interface UpdateAreaGeometryRequest {
  geometry: GeoJsonGeometry;
}

export interface CreateAreaRequest {
  geometry: GeoJsonGeometry;
  name: string;
  zoneId: string;
}

export interface CreateAreaResponse {
  areaId: string;
  areaName: string;
  boundaryCoordinates: string[];
  geometry: GeoJsonGeometry;
  persistence: 'bakki-core';
  updatedAt: string;
  zoneId: string;
}

export interface UpdateAreaGeometryResponse {
  areaId: string;
  areaName: string;
  boundaryCoordinates: string[];
  geometry: GeoJsonGeometry;
  persistence: 'bakki-core';
  updatedAt: string;
  zoneId: string | null;
}

export interface UpdateAreaDetailsRequest {
  name: string;
  speciesRef?: string | null;
}

export interface UpdateAreaDetailsResponse {
  areaId: string;
  areaName: string;
  speciesRef?: string | null;
  updatedAt: string;
  zoneId: string;
}

export interface DeleteAreaResponse {
  areaId: string;
  areaName: string;
  deletedAt: string;
  zoneId: string;
}

export interface UpdateZoneGeometryRequest {
  geometry: GeoJsonGeometry;
}

export interface UpdateZoneGeometryResponse {
  boundaryCoordinates: string[];
  geometry: GeoJsonGeometry;
  persistence: 'bakki-core';
  updatedAt: string;
  zoneId: string;
  zoneName: string;
}

export interface MapAuditEntry {
  changeSummary: string;
  changeType: string;
  createdAt: string;
  editorUserId: number | null;
  entityRef: string;
  entityType: string;
  id: string;
  ranchRef: string;
}

export interface GeoJsonGeometry {
  type: string;
  coordinates: unknown;
}

export interface GeoJsonFeature<TProperties = Record<string, unknown>> {
  type: 'Feature';
  id?: string | number;
  geometry: GeoJsonGeometry;
  properties: TProperties;
}

export interface GeoJsonFeatureCollection<TProperties = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: Array<GeoJsonFeature<TProperties>>;
}

export interface RanchGeometryProperties {
  id: string;
  name: string;
  sourceFeatureName: string;
  sourceFile: string;
}

export interface ZoneGeometryProperties {
  hectaresEstimate: number | null;
  id: string;
  name: string;
  prototypeInteractive: boolean;
  statusLabel: string;
}

export interface AreaGeometryProperties {
  areaRef: string;
  hectaresEstimate: number | null;
  name: string;
  zoneRef: string;
}

export interface MapViewerOverlayMetric {
  label: string;
  tone?: 'neutral' | 'positive' | 'emphasis';
  value: string;
}

export interface MapViewerPhoto {
  alt: string;
  src: string;
}

export interface MapViewerOverlayData {
  contractLabel: string;
  contractSupport: string;
  contractValue: string;
  densityLabel: string;
  densitySupport: string;
  densityValue: string;
  estimatedCountLabel: string;
  estimatedCountValue: string;
  focusAreaId: string | null;
  focusAreaName: string | null;
  metrics: MapViewerOverlayMetric[];
  metricsTitle: string;
  observationOwnerId: string | null;
  photos: MapViewerPhoto[];
  photosTitle: string;
  speciesLabel: string;
  speciesValue: string;
  title: string;
  zoneId: string;
  zoneLabel: string;
}

export interface MapViewerData {
  areaOverlaysByAreaId: Record<string, MapViewerOverlayData>;
  defaultCoordinates: string;
  defaultHint: string;
  ranchCountLabel: string;
  zoneCountLabel: string;
  zoneOverlaysByZoneId: Record<string, MapViewerOverlayData>;
}
