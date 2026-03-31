import type { GeoJsonGeometry } from './map';

export type TreeSurveyConfidenceLevel = 'low' | 'medium' | 'high';

export interface TreeSizeDistributionBin {
  label: string;
  maxValue?: number | null;
  minValue?: number | null;
  treeCount: number;
}

export interface TreePlotEstimateSummary {
  confidenceLevel: TreeSurveyConfidenceLevel;
  coveredAreaSqm: number;
  coverageRatio: number;
  estimatedDensityPer100Sqm: number;
  estimatedTreeCount: number;
  meanDiameterCm: number | null;
  meanHeightM: number | null;
  sampleCount: number;
}

export interface TreePlotSummary {
  areaHectares: number | null;
  createdAt: string;
  description: string | null;
  estimate: TreePlotEstimateSummary | null;
  name: string;
  plotId: string;
  ranchId: string;
  updatedAt: string;
}

export interface TreePlotDetail extends TreePlotSummary {
  createdByUserId: number | null;
  geometry: GeoJsonGeometry;
}

export interface TreePlotSampleSummary {
  actorUserId: number | null;
  id: string;
  measuredDensityPer100Sqm: number;
  meanDiameterCm: number | null;
  meanHeightM: number | null;
  notes: string | null;
  plotId: string;
  sampledAreaSqm: number;
  sampledAt: string;
  sampleGeometry: GeoJsonGeometry | null;
  sizeDistribution: TreeSizeDistributionBin[] | null;
  taskRef: string | null;
  treeCount: number;
}

export interface CreateTreePlotRequest {
  description?: string;
  geometry: GeoJsonGeometry;
  name: string;
  ranchId?: string;
}

export interface UpdateTreePlotRequest {
  description?: string;
  geometry?: GeoJsonGeometry;
  name?: string;
}

export interface RecordTreePlotSampleRequest {
  densityPer100Sqm: number;
  meanDiameterCm?: number | null;
  meanHeightM?: number | null;
  notes?: string;
  sampleGeometry?: GeoJsonGeometry | null;
  sampledAreaSqm?: number;
  sampledAt?: string;
  sizeDistribution?: TreeSizeDistributionBin[] | null;
  taskRef?: string | null;
  treeCount?: number;
}

export interface TreePlotAreaRollup {
  areaId: string;
  estimatedDensityPer100Sqm: number;
  estimatedTreeCount: number;
  meanDiameterCm: number | null;
  meanHeightM: number | null;
  overlapAreaSqm: number;
  plotCount: number;
  source: 'plot_estimate_projection';
  updatedAt: string;
  zoneId: string | null;
}

export interface TreePlotZoneRollup {
  estimatedDensityPer100Sqm: number;
  estimatedTreeCount: number;
  meanDiameterCm: number | null;
  meanHeightM: number | null;
  overlapAreaSqm: number;
  plotCount: number;
  source: 'plot_estimate_projection';
  updatedAt: string;
  zoneId: string;
}
