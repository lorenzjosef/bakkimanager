import type { BakkiTaskType } from './tasks';

export interface PlantingPhaseTimelineMetric {
  iconUrl: string;
  label: string;
}

export interface PlantingPhaseMember {
  actionIconUrl: string;
  avatarUrl: string;
  id: string;
  name: string;
  role: string;
}

export interface PlantingPhaseInsightRow {
  bordered?: boolean;
  copy: string;
  iconUrl: string;
  id: string;
  title?: string;
  value?: string;
}

export interface PlantingPhaseDetail {
  areaRefs: string[];
  liveChipLabel: string;
  mapEyebrow: string;
  mapTitle: string;
  primaryInsightLabel: string;
  primaryInsightProgressPercent: number;
  primaryInsightValue: string;
  secondaryInsight: PlantingPhaseInsightRow;
  teamMembers: PlantingPhaseMember[];
  teamTotal: string;
  teamTotalLabel: string;
  tertiaryInsight: PlantingPhaseInsightRow;
}

export interface PlantingPhaseTimelineItem {
  badgeLabel: string;
  dateLabel: string;
  detail?: PlantingPhaseDetail | null;
  id: string;
  isClickable?: boolean;
  metrics?: PlantingPhaseTimelineMetric[];
  status: 'active' | 'complete';
  title: string;
}

export interface PlantingPhaseOverviewData {
  bannerCopy: string;
  bannerEyebrow: string;
  bannerIconUrl: string;
  bannerOutlineLabel: string;
  bannerPrimaryLabel: string;
  bannerTitle: string;
  exportIconUrl: string;
  insightsTitle: string;
  liveChipLabel: string;
  mapEyebrow: string;
  mapTitle: string;
  nitrogenInsight: PlantingPhaseInsightRow;
  overviewTitle: string;
  phases: PlantingPhaseTimelineItem[];
  sectionLabelIconUrl: string;
  selectedPhaseId?: string | null;
  soilTrackingLabel: string;
  soilTrackingValue: string;
  startButtonIconUrl: string;
  teamButtonLabel: string;
  teamCardTitle: string;
  teamMembers: PlantingPhaseMember[];
  teamTotal: string;
  teamTotalLabel: string;
  weatherInsight: PlantingPhaseInsightRow;
}

export interface PlantingWizardInfoData {
  descriptionPlaceholder: string;
  endDatePlaceholder: string;
  phaseNamePlaceholder: string;
  startDatePlaceholder: string;
}

export interface PlantingWizardTeamMemberData {
  avatarUrl: string;
  id: string;
  name: string;
  role: string;
}

export interface PlantingWizardTeamData {
  copy: string;
  coreCrew: string[];
  crewRotation: string;
  extraLabel: string;
  fieldLead: string;
  operationalNotes: string;
  planterAllocation: string;
  policyCopy: string;
  policyTitle: string;
  preparedCrew: PlantingWizardTeamMemberData[];
  preparedCrewTitle: string;
  summaryLeadCrew: string;
  summaryPlanters: string;
  title: string;
}

export interface PlantingWizardAreasData {
  assignPersonnelPlaceholder: string;
  speciesPlaceholder: string;
  trayCountHelp: string;
  trayCountPlaceholder: string;
  saplingCapacityValue: string;
  selectedAreaName: string;
  selectedAreaStatus: string;
  selectedPersonnel: string[];
  soilCopy: string;
  soilTitle: string;
  totalAreaUnit: string;
  totalAreaValue: string;
}

export interface PlantingWizardAreaData {
  area: string;
  assignedSpeciesRef?: string | null;
  goal: string;
  id: string;
  name: string;
  species: string[];
  subtitle: string;
}

export interface PlantingWizardConfirmData {
  confirmLabel: string;
  extraLabel: string;
  teamMembers: PlantingWizardTeamMemberData[];
  teamTitle: string;
  title: string;
  zoneCountLabel: string;
  zones: PlantingWizardAreaData[];
}

export interface PlantingWizardData {
  areas: PlantingWizardAreasData;
  confirm: PlantingWizardConfirmData;
  info: PlantingWizardInfoData;
  team: PlantingWizardTeamData;
}

export interface PhaseAreaContractInput {
  areaId: string;
  assignedUserProfileId: string;
  speciesRef: string;
  trayCount: number;
}

export interface CreatePlantingPhaseRequest {
  phaseName: string;
  startDate: string;
  endDate: string;
  description: string;
  fieldLeadId: string;
  participantIds: string[];
  areaContracts: PhaseAreaContractInput[];
  crewRotation?: string;
  operationalNotes?: string;
  taskType?: BakkiTaskType;
}

export interface CreatePlantingPhaseResponse {
  createdPhaseId: string;
  phaseName: string;
  state: 'draft' | 'active' | 'done' | 'cancelled';
  participantCount: number;
  areaCount: number;
  assignedContractCount: number;
}
