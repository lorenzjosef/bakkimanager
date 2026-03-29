import { localAssetUrls, type CreatePlantingPhaseResponse, type PlantingPhaseDetail, type PlantingPhaseInsightRow, type PlantingPhaseMember, type PlantingPhaseOverviewData } from '@bakki/domain';

export function buildOverviewData(): PlantingPhaseOverviewData {
  return {
    bannerCopy: 'Create a planting phase once the crew, schedule, and contracted areas are ready.',
    bannerEyebrow: 'Phase Operations',
    bannerIconUrl: localAssetUrls.phaseOverviewBannerMark,
    bannerOutlineLabel: 'Review Areas',
    bannerPrimaryLabel: 'Begin Setup',
    bannerTitle: 'Initialize Next Planting Phase',
    exportIconUrl: localAssetUrls.phaseOverviewExport,
    insightsTitle: 'Phase Planning Insights',
    liveChipLabel: 'Awaiting Phase',
    mapEyebrow: 'Selected Phase Areas',
    mapTitle: 'No phase areas available',
    nitrogenInsight: {
      bordered: true,
      copy: 'No contracted areas are linked to a planting phase yet.',
      iconUrl: localAssetUrls.phaseOverviewNitrogen,
      id: 'phase-overview-empty-areas',
    },
    overviewTitle: 'Phase Overview',
    phases: [],
    sectionLabelIconUrl: localAssetUrls.phaseOverviewSectionLabel,
    selectedPhaseId: null,
    soilTrackingLabel: 'Contract Fulfillment',
    soilTrackingValue: '0%',
    startButtonIconUrl: localAssetUrls.phaseOverviewStartButton,
    teamButtonLabel: 'View All Members',
    teamCardTitle: 'Field Operations Team',
    teamMembers: [],
    teamTotal: '0',
    teamTotalLabel: 'Assigned',
    weatherInsight: {
      copy: 'No density measurements are available for the selected planting phase yet.',
      iconUrl: localAssetUrls.phaseOverviewWeather,
      id: 'phase-overview-empty-density',
      title: 'Average Density',
      value: 'Unavailable',
    },
  };
}

export function applySelectedPhaseDetailToOverview(overview: PlantingPhaseOverviewData) {
  const selectedPhase = overview.phases.find((phase) => phase.id === overview.selectedPhaseId)
    ?? overview.phases.find((phase) => phase.status === 'active')
    ?? overview.phases[0]
    ?? null;
  const detail = selectedPhase?.detail ?? null;

  if (!detail) {
    return overview;
  }

  overview.teamMembers = detail.teamMembers.length > 0
    ? detail.teamMembers.map((member) => ({ ...member }))
    : overview.teamMembers;
  overview.teamTotal = detail.teamTotal;
  overview.teamTotalLabel = detail.teamTotalLabel;
  overview.overviewTitle = `Phase Overview: ${selectedPhase?.title ?? overview.overviewTitle}`;
  overview.soilTrackingLabel = detail.primaryInsightLabel;
  overview.soilTrackingValue = detail.primaryInsightValue;
  overview.weatherInsight = { ...detail.secondaryInsight };
  overview.nitrogenInsight = { ...detail.tertiaryInsight };
  overview.mapEyebrow = detail.mapEyebrow;
  overview.mapTitle = detail.mapTitle;
  overview.liveChipLabel = detail.liveChipLabel;

  return overview;
}

export function buildPhaseDetail({
  areaMetricsByAreaRef,
  areaRefs,
  participantCount,
  participantNames,
  participantTeamMembers,
  phaseId,
  phaseName,
  phaseState,
  totalContractGoal,
}: {
  areaMetricsByAreaRef: Map<
    string,
    {
      contractTreeGoal?: number | null;
      currentDensityPer100Sqm: number;
      currentTreeCount: number | null;
    }
  >;
  areaRefs: string[];
  participantNames: string[];
  participantCount: number;
  participantTeamMembers: PlantingPhaseMember[];
  phaseId: number | null;
  phaseName: string;
  phaseState: 'draft' | 'active' | 'done' | 'cancelled';
  totalContractGoal: number;
}): PlantingPhaseDetail | null {
  const densityValues = areaRefs
    .map((areaRef) => areaMetricsByAreaRef.get(areaRef)?.currentDensityPer100Sqm ?? null)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  const measuredTreeCount = areaRefs.reduce(
    (sum, areaRef) => sum + Math.max(areaMetricsByAreaRef.get(areaRef)?.currentTreeCount ?? 0, 0),
    0,
  );
  const contractFulfillmentPercent =
    totalContractGoal > 0
      ? Math.min(100, Math.round((measuredTreeCount / totalContractGoal) * 100))
      : 0;
  const averageDensity = densityValues.length > 0
    ? Math.round(densityValues.reduce((sum, value) => sum + value, 0) / densityValues.length)
    : null;
  const teamMembers = participantTeamMembers.length > 0
    ? participantTeamMembers.slice(0, 4).map((member) => ({ ...member }))
    : [];

  return {
    areaRefs: [...areaRefs],
    liveChipLabel: phaseState === 'active' ? 'Live Feed' : 'Recorded Phase',
    mapEyebrow: 'Selected Phase Areas',
    mapTitle: `${phaseName} Areas`,
    primaryInsightLabel: 'Contract Fulfillment',
    primaryInsightProgressPercent: contractFulfillmentPercent,
    primaryInsightValue: `${contractFulfillmentPercent}%`,
    secondaryInsight: buildPhaseDensityInsight(phaseId, phaseName, averageDensity),
    teamMembers,
    teamTotal:
      participantCount > 0
        ? String(participantCount)
        : String(Math.max(participantNames.length, teamMembers.length)),
    teamTotalLabel: 'Assigned',
    tertiaryInsight: buildPhaseAreaInsight(phaseId, phaseName, areaRefs.length),
  };
}

export function mapParticipantToPhaseMember(userId: number, userName: string | null, role: string | null, index: number) {
  const normalizedRole = role === 'owner'
    ? 'Owner'
    : role === 'planter'
      ? 'Planter'
      : 'Participant';

  return {
    actionIconUrl: localAssetUrls.phaseOverviewMemberAction,
    avatarUrl: phaseAvatarForIndex(index, role),
    id: `user-profile-${userId}`,
    name: userName || `User ${userId}`,
    role: normalizedRole,
  };
}

export function mapPhaseBadge(state: CreatePlantingPhaseResponse['state']) {
  switch (state) {
    case 'active':
      return 'Active';
    case 'done':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Draft';
  }
}

export function formatPhaseDateRange(startDate?: string | false, endDate?: string | false) {
  const start = typeof startDate === 'string' ? startDate : 'Start TBD';
  const end = typeof endDate === 'string' ? endDate : 'End TBD';
  return `${start} - ${end}`;
}

function buildPhaseDensityInsight(
  phaseId: number | null,
  phaseName: string,
  averageDensity: number | null,
): PlantingPhaseInsightRow {
  return {
    copy:
      averageDensity !== null
        ? 'Average measured density across the contracted phase areas.'
        : 'No density readings are recorded for the contracted phase areas yet.',
    iconUrl: localAssetUrls.phaseOverviewWeather,
    id: `phase-density-${phaseId ?? slugifyPhaseName(phaseName)}`,
    title: 'Average Density',
    value: averageDensity !== null ? `${averageDensity} / 100m²` : 'Unavailable',
  };
}

function buildPhaseAreaInsight(
  phaseId: number | null,
  phaseName: string,
  areaCount: number,
): PlantingPhaseInsightRow {
  return {
    bordered: true,
    copy:
      areaCount > 0
        ? `${areaCount} contracted area${areaCount === 1 ? '' : 's'} are linked to this planting phase.`
        : 'No contracted areas linked yet.',
    iconUrl: localAssetUrls.phaseOverviewNitrogen,
    id: `phase-areas-${phaseId ?? slugifyPhaseName(phaseName)}`,
  };
}

function phaseAvatarForIndex(index: number, role: string | null) {
  if (role === 'owner') {
    return localAssetUrls.userBjorn;
  }

  const avatars = [
    localAssetUrls.phaseSigurdur,
    localAssetUrls.phaseElva,
    localAssetUrls.phaseKristjan,
    localAssetUrls.userHelga,
  ];

  return avatars[index % avatars.length] ?? localAssetUrls.userHelga;
}

function slugifyPhaseName(phaseName: string) {
  return phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
