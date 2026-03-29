import { localAssetUrls, type PlantingWizardAreaData, type PlantingWizardData } from '@bakki/domain';

export function buildWizardData(
  areas: PlantingWizardAreaData[],
  members: PlantingWizardData['confirm']['teamMembers'],
): PlantingWizardData {
  return {
    areas: {
      assignPersonnelPlaceholder: 'Assign planter',
      speciesPlaceholder: 'Select species',
      trayCountHelp: 'Enter how many trays should be assigned to this planter. Tree count is calculated automatically.',
      trayCountPlaceholder: 'Enter tray count',
      saplingCapacityValue: areas.length > 0 ? `${areas.length} mapped` : 'Unavailable',
      selectedAreaName: 'Select an area',
      selectedAreaStatus: 'Choose a mapped contract area to define the planting assignment.',
      selectedPersonnel: members.slice(0, 2).map((member) => member.name),
      soilCopy: 'Assign one planter, choose the planting species, and define tray count before confirming the phase.',
      soilTitle: 'Area contract planning',
      totalAreaUnit: 'ha',
      totalAreaValue: '0',
    },
    confirm: {
      confirmLabel: 'Create Planting Phase',
      extraLabel: members.length > 0 ? `${members.length} personnel ready` : 'No personnel available',
      teamMembers: members,
      teamTitle: 'Assigned Team',
      title: 'Confirm Phase Setup',
      zoneCountLabel: `${areas.length} area${areas.length === 1 ? '' : 's'}`,
      zones: areas,
    },
    info: {
      descriptionPlaceholder: 'Describe the restoration objective, terrain context, and execution plan.',
      endDatePlaceholder: 'YYYY-MM-DD',
      phaseNamePlaceholder: 'Enter phase name',
      startDatePlaceholder: 'YYYY-MM-DD',
    },
    team: {
      copy: 'Select the crew for the next planting phase. Area assignments happen in the following step.',
      coreCrew: members.slice(0, 4).map((member) => member.name),
      crewRotation: '',
      extraLabel: members.length > 0 ? `${members.length} personnel available` : 'Awaiting synced personnel',
      fieldLead: members[0]?.name ?? '',
      operationalNotes: '',
      planterAllocation: 'Select at least one owner or planter',
      policyCopy: 'Each contracted area must be assigned to one participant before the phase can be created.',
      policyTitle: 'Assignment policy',
      preparedCrew: members,
      preparedCrewTitle: 'Available Team',
      summaryLeadCrew: members[0] ? '1 assigned' : '0 assigned',
      summaryPlanters: `${members.filter((member) => member.role === 'Planter').length} assigned`,
      title: 'Crew Setup',
    },
  };
}

export function mapWizardMember(
  user: { active: boolean; displayName: string; id: number; role: string | null },
  index: number,
): PlantingWizardData['confirm']['teamMembers'][number] {
  return {
    avatarUrl: phaseAvatarForIndex(index, user.role),
    id: `user-profile-${user.id}`,
    name: user.displayName,
    role: user.role === 'owner' ? 'Owner' : 'Planter',
  };
}

export function formatHectares(value: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
    minimumFractionDigits: value >= 100 ? 0 : 1,
  });
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
