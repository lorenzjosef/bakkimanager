export interface DashboardActivePhase {
  eyebrow: string;
  heroMetricLabel: string;
  heroMetricValue: string;
  name: string;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  secondaryMetricLabel: string;
  secondaryMetricValue: string;
}

export type DashboardProgramIcon = 'leaf' | 'cabin' | 'crate';

export interface DashboardProgramItem {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  assigneeLabel: string;
  icon: DashboardProgramIcon;
  accent: 'green' | 'neutral';
}

export interface DashboardSummary {
  greetingName: string;
  localTimeLabel: string;
  localTimeValue: string;
  activePhase: DashboardActivePhase;
  contractCompletionCopy: string;
  contractCompletionLabel: string;
  contractCompletionValue: string;
  conditionsLabel: string;
  conditionsValue: string;
  conditionsCopy: string;
  biodiversityLabel: string;
  biodiversityActiveSpecies: string;
  biodiversityCaption: string;
  biodiversityStackCount: string;
  activeZonesTitle: string;
  activeZonesStatus: string;
  activeZonesCoordinatesLabel: string;
  activeZonesCoordinatesValue: string;
  programPanelTitle: string;
  programItems: DashboardProgramItem[];
}

export interface RanchBoundary {
  id: string;
  name: string;
  sourceFile: string;
  sourceFeatureName: string;
}

export interface ZoneSummary {
  id: string;
  name: string;
  areaCount: number;
  statusLabel: string;
  prototypeInteractive: boolean;
}

export interface MapManagementZoneFixture {
  areaCount: number;
  areaCountLabel: string;
  currentDensityPer100Sqm: number | null;
  currentTreeCount: number | null;
  editableAreaId: string | null;
  editableAreaName: string;
  zoneName: string;
  prominentDensityLabel: string;
  prominentDensityValue: string;
  contractFulfillmentLabel: string;
  contractFulfillmentValue: string;
  currentTreeCountLabel: string;
  currentTreeCountValue: string;
  assignedPlanterLabel: string;
  assignedPlanterValue: string;
  areaDefinitionStatus: string;
  boundaryCoordinates: string[];
  notes: string;
}

export interface MapManagementAreaFixture {
  areaDefinitionStatus: string;
  areaId: string;
  areaName: string;
  assignedPlanterLabel: string;
  assignedPlanterValue: string;
  currentDensityPer100Sqm: number | null;
  currentTreeCount: number | null;
  currentTreeCountLabel: string;
  currentTreeCountValue: string;
  notes: string;
  zoneId: string;
  zoneName: string;
}

export interface MapManagementFixture {
  areasById: Record<string, MapManagementAreaFixture>;
  zonesById: Record<string, MapManagementZoneFixture>;
}

export interface PreviewAreaSeed {
  areaName: string;
  areaRef: string;
  assignedPlanterName: string | null;
  contractTreeGoal: number | null;
  currentDensityPer100Sqm: number;
  currentTreeCount: number | null;
  notes: string;
  targetDensityPer100Sqm: number | null;
  zoneRef: string;
}

export const dashboardFixture: DashboardSummary = {
  greetingName: 'Alain',
  localTimeLabel: 'Local Time',
  localTimeValue: '14:32 PST',
  activePhase: {
    eyebrow: 'Active Planting Phase',
    heroMetricLabel: 'Contract Fulfillment',
    heroMetricValue: '84%',
    name: 'Sierra Ridge Restoration',
    primaryMetricLabel: 'Contract Goal',
    primaryMetricValue: '15,000 trees',
    secondaryMetricLabel: 'Avg. Density',
    secondaryMetricValue: '28 / 100m²',
  },
  contractCompletionLabel: 'Global Contract',
  contractCompletionValue: '84%',
  contractCompletionCopy: '100,800 of 120,000 trees planted across all zones.',
  conditionsLabel: 'Conditions',
  conditionsValue: '24C / Sunny',
  conditionsCopy: 'Wind: 12km/h NW',
  biodiversityLabel: 'Biodiversity Index',
  biodiversityActiveSpecies: '12',
  biodiversityCaption: 'Active Species',
  biodiversityStackCount: '+9',
  activeZonesTitle: 'Active Zones',
  activeZonesStatus: 'Avg. Density 28 / 100m²',
  activeZonesCoordinatesLabel: 'Coordinates',
  activeZonesCoordinatesValue: '47.8021 N, 123.6044 W',
  programPanelTitle: 'Program of the Day',
  programItems: [
    {
      id: 'soil-moisture-analysis',
      title: 'Morning Planting Contract Check',
      subtitle: 'Zone 3 - Lorenz Matteo area',
      timeLabel: '08:00',
      assigneeLabel: 'Assigned to: Mrs. Baue',
      icon: 'leaf',
      accent: 'green',
    },
    {
      id: 'wildlife-camera-check',
      title: 'Monitoring Density Pass',
      subtitle: 'Zone 1 - Update density after yesterday’s planting',
      timeLabel: '11:30',
      assigneeLabel: 'Assigned to: Mr. Baue',
      icon: 'cabin',
      accent: 'neutral',
    },
    {
      id: 'seedling-delivery',
      title: 'Sapling Delivery and Restock',
      subtitle: 'Main staging area - prepare afternoon contract blocks',
      timeLabel: '14:00',
      assigneeLabel: 'Assigned to: Alain de Cat',
      icon: 'crate',
      accent: 'neutral',
    },
  ],
};

export const ranchBoundaryFixture: RanchBoundary = {
  id: 'ranch-main',
  name: 'Bakki Ranch',
  sourceFile: 'ranch coordinates.kml',
  sourceFeatureName: 'Unbenanntes Polygon',
};

export const zoneSummariesFixture: ZoneSummary[] = [
  { id: 'zone-1', name: 'Zone 1', areaCount: 1, statusLabel: 'Mapped', prototypeInteractive: false },
  { id: 'zone-2', name: 'Zone 2', areaCount: 1, statusLabel: 'Mapped', prototypeInteractive: false },
  { id: 'zone-3', name: 'Zone 3', areaCount: 1, statusLabel: 'Mapped', prototypeInteractive: true },
  { id: 'zone-4', name: 'Zone 4', areaCount: 1, statusLabel: 'Mapped', prototypeInteractive: false },
  { id: 'zone-5', name: 'Zone 5', areaCount: 1, statusLabel: 'Mapped', prototypeInteractive: false },
];

export const previewAreaSeeds: PreviewAreaSeed[] = [
  {
    areaName: 'Basalt Bench 1A',
    areaRef: 'area-preview-zone-1',
    assignedPlanterName: 'Mr. Baue',
    contractTreeGoal: 1380,
    currentDensityPer100Sqm: 27,
    currentTreeCount: 982,
    notes: 'Steady sapling uptake on the lower basalt shelf. North edge stays wind-exposed after midday.',
    targetDensityPer100Sqm: 31,
    zoneRef: 'zone-1',
  },
  {
    areaName: 'Moss Corridor 2C',
    areaRef: 'area-preview-zone-2',
    assignedPlanterName: 'Mrs. Baue',
    contractTreeGoal: 1580,
    currentDensityPer100Sqm: 33,
    currentTreeCount: 1404,
    notes: 'Best moisture retention in the western corridor. Contract is close to the target line already.',
    targetDensityPer100Sqm: 35,
    zoneRef: 'zone-2',
  },
  {
    areaName: 'Ridge Pocket 3B',
    areaRef: 'area-preview-zone-3',
    assignedPlanterName: 'Mrs. Baue',
    contractTreeGoal: 1490,
    currentDensityPer100Sqm: 29,
    currentTreeCount: 1218,
    notes: 'Irregular rock shelf with strong slope break. Recent monitoring pass showed consistent density across the center pocket.',
    targetDensityPer100Sqm: 32,
    zoneRef: 'zone-3',
  },
  {
    areaName: 'Ash Slope 4D',
    areaRef: 'area-preview-zone-4',
    assignedPlanterName: null,
    contractTreeGoal: 1120,
    currentDensityPer100Sqm: 18,
    currentTreeCount: 744,
    notes: 'Still waiting on a dedicated planter assignment. Soil prep is finished but the upper edge remains patchy.',
    targetDensityPer100Sqm: 24,
    zoneRef: 'zone-4',
  },
  {
    areaName: 'Creekside Shelf 5A',
    areaRef: 'area-preview-zone-5',
    assignedPlanterName: 'Alain de Cat',
    contractTreeGoal: 1430,
    currentDensityPer100Sqm: 25,
    currentTreeCount: 1096,
    notes: 'Mixed exposure along the drainage lip. Survival rate is stable but the east segment still needs reinforcement.',
    targetDensityPer100Sqm: 29,
    zoneRef: 'zone-5',
  },
];

export const mapManagementFixture: MapManagementFixture = {
  areasById: Object.fromEntries(
    previewAreaSeeds.map((areaSeed) => [
      areaSeed.areaRef,
      {
        areaDefinitionStatus: 'Seeded preview area',
        areaId: areaSeed.areaRef,
        areaName: areaSeed.areaName,
        assignedPlanterLabel: 'Planted By',
        assignedPlanterValue: areaSeed.assignedPlanterName ?? 'Unassigned',
        currentDensityPer100Sqm: areaSeed.currentDensityPer100Sqm,
        currentTreeCount: areaSeed.currentTreeCount,
        currentTreeCountLabel: 'Current Tree Count',
        currentTreeCountValue:
          areaSeed.currentTreeCount !== null
            ? areaSeed.currentTreeCount.toLocaleString('en-US')
            : 'Unavailable',
        notes: areaSeed.notes,
        zoneId: areaSeed.zoneRef,
        zoneName: `Zone ${areaSeed.zoneRef.replace('zone-', '')}`,
      } satisfies MapManagementAreaFixture,
    ]),
  ),
  zonesById: Object.fromEntries(
    previewAreaSeeds.map((areaSeed) => {
      const contractFulfillment = areaSeed.currentTreeCount !== null && areaSeed.contractTreeGoal && areaSeed.contractTreeGoal > 0
        ? `${Math.min(100, Math.round((areaSeed.currentTreeCount / areaSeed.contractTreeGoal) * 100))}%`
        : 'Unavailable';
      const zoneNumber = areaSeed.zoneRef.replace('zone-', '');

      return [
        areaSeed.zoneRef,
        {
          areaCount: 1,
          areaCountLabel: 'Mapped Areas',
          currentDensityPer100Sqm: areaSeed.currentDensityPer100Sqm,
          currentTreeCount: areaSeed.currentTreeCount,
          editableAreaId: areaSeed.areaRef,
          editableAreaName: areaSeed.areaName,
          zoneName: `Zone ${zoneNumber}`,
          prominentDensityLabel: 'Current Density',
          prominentDensityValue: `${areaSeed.currentDensityPer100Sqm} / 100m²`,
          contractFulfillmentLabel: 'Contract Fulfillment',
          contractFulfillmentValue: contractFulfillment,
          currentTreeCountLabel: 'Current Tree Count',
          currentTreeCountValue:
            areaSeed.currentTreeCount !== null
              ? areaSeed.currentTreeCount.toLocaleString('en-US')
              : 'Unavailable',
          assignedPlanterLabel: 'Assigned Planter',
          assignedPlanterValue: areaSeed.assignedPlanterName ?? 'Unassigned',
          areaDefinitionStatus: 'Seeded preview area',
          boundaryCoordinates: [
            'P1: Boundary point loaded from KML',
            'P2: Boundary point loaded from KML',
            'P3: Boundary point loaded from KML',
          ],
          notes: areaSeed.notes,
        } satisfies MapManagementZoneFixture,
      ] as const;
    }),
  ),
};
