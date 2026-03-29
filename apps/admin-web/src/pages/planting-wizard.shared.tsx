import { localAssetUrls } from '@bakki/domain';
import { useNavigate } from '@tanstack/react-router';

export type WizardStepId = 'info' | 'team' | 'areas' | 'confirm';

export interface WizardStepMeta {
  id: WizardStepId;
  index: number;
  label: string;
  route:
    | '/planting-phases/new/info'
    | '/planting-phases/new/team'
    | '/planting-phases/new/areas'
    | '/planting-phases/new/confirm';
}

export const WIZARD_STEPS: WizardStepMeta[] = [
  { id: 'info', index: 1, label: 'Phase Info', route: '/planting-phases/new/info' },
  { id: 'team', index: 2, label: 'Team', route: '/planting-phases/new/team' },
  { id: 'areas', index: 3, label: 'Areas', route: '/planting-phases/new/areas' },
  { id: 'confirm', index: 4, label: 'Confirm', route: '/planting-phases/new/confirm' },
];

export const STEP_ICONS = {
  info: {
    back: localAssetUrls.wizardInfoBack,
    help: localAssetUrls.wizardInfoHelp,
    profile: localAssetUrls.wizardInfoProfile,
    next: localAssetUrls.wizardInfoNext,
  },
  team: {
    back: localAssetUrls.wizardTeamBack,
    help: localAssetUrls.wizardTeamHelp,
    profile: localAssetUrls.wizardTeamProfile,
    next: localAssetUrls.wizardTeamNext,
    footerBack: localAssetUrls.wizardTeamFooterBack,
  },
  areas: {
    back: localAssetUrls.wizardAreasBack,
    help: localAssetUrls.wizardAreasHelp,
    profile: localAssetUrls.wizardAreasProfile,
    next: localAssetUrls.wizardAreasNext,
    footerBack: localAssetUrls.wizardAreasFooterBack,
  },
  confirm: {
    back: localAssetUrls.wizardConfirmBack,
    help: localAssetUrls.wizardConfirmHelp,
    profile: localAssetUrls.wizardConfirmProfile,
    footerBack: localAssetUrls.wizardConfirmFooterBack,
    confirm: localAssetUrls.wizardConfirmButton,
  },
} as const;

export function WizardFooter({
  step,
  onCancel,
  onNavigate,
  infoStepReady,
  teamStepReady,
  areasStepReady,
}: {
  step: WizardStepId;
  onCancel: () => void;
  onNavigate: ReturnType<typeof useNavigate>;
  infoStepReady: boolean;
  teamStepReady: boolean;
  areasStepReady: boolean;
}) {
  if (step === 'info') {
    return (
      <footer className="phase-wizard-footer">
        <button className="phase-wizard-footer-link" onClick={onCancel} type="button">Cancel</button>
        <button
          className="phase-wizard-primary"
          disabled={!infoStepReady}
          onClick={() => onNavigate({ to: '/planting-phases/new/team' })}
          type="button"
        >
          <span>Next Step: Team</span>
          <img src={STEP_ICONS.info.next} alt="" />
        </button>
      </footer>
    );
  }

  if (step === 'team') {
    return (
      <footer className="phase-wizard-footer">
        <button className="phase-wizard-footer-link phase-wizard-footer-back" onClick={() => onNavigate({ to: '/planting-phases/new/info' })} type="button">
          <img src={STEP_ICONS.team.footerBack} alt="" />
          <span>Back to Phase Info</span>
        </button>
        <div className="phase-wizard-footer-actions">
          <button className="phase-wizard-footer-link" disabled type="button">Save Draft</button>
          <button
            className="phase-wizard-primary"
            disabled={!teamStepReady}
            onClick={() => onNavigate({ to: '/planting-phases/new/areas' })}
            type="button"
          >
            <span>Next Step: Mapping</span>
            <img src={STEP_ICONS.team.next} alt="" />
          </button>
        </div>
      </footer>
    );
  }

  if (step === 'areas') {
    return (
      <footer className="phase-wizard-footer">
        <button className="phase-wizard-footer-link phase-wizard-footer-back" onClick={() => onNavigate({ to: '/planting-phases/new/team' })} type="button">
          <img src={STEP_ICONS.areas.footerBack} alt="" />
          <span>Back to Team</span>
        </button>
        <div className="phase-wizard-footer-actions">
          <button className="phase-wizard-footer-link" disabled type="button">Save Draft</button>
          <button
            className="phase-wizard-primary"
            disabled={!areasStepReady}
            onClick={() => onNavigate({ to: '/planting-phases/new/confirm' })}
            type="button"
          >
            <span>Next Step: Summary</span>
            <img src={STEP_ICONS.areas.next} alt="" />
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="phase-wizard-footer phase-wizard-footer-minimal">
      <button className="phase-wizard-footer-link phase-wizard-footer-back" onClick={() => onNavigate({ to: '/planting-phases/new/areas' })} type="button">
        <img src={STEP_ICONS.confirm.footerBack} alt="" />
        <span>Back to Mapping</span>
      </button>
    </footer>
  );
}

export function PersonChip({ label }: { label: string }) {
  return (
    <span className="phase-wizard-person-chip">
      <span>{label}</span>
      <img src={localAssetUrls.wizardTeamChipRemove} alt="" />
    </span>
  );
}

export function TeamMember({ avatarUrl, name, role }: { avatarUrl: string; name: string; role: string }) {
  return (
    <article className="phase-wizard-team-member">
      <img src={avatarUrl} alt={name} />
      <div>
        <strong>{name}</strong>
        <span>{role}</span>
      </div>
    </article>
  );
}

export function WizardMapTool({ icon, className = 'phase-wizard-map-tool' }: { icon: string; className?: string }) {
  return (
    <button className={className} type="button">
      <img src={icon} alt="" />
    </button>
  );
}

export function TaskTypeButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`phase-wizard-task-type${active ? ' is-active' : ''}`} onClick={onClick} type="button">
      <img src={icon} alt="" />
      <strong>{label}</strong>
    </button>
  );
}

export function WizardZoneCard({
  icon,
  name,
  subtitle,
  area,
  goal,
  goalLabel = 'Contract Goal',
  species,
  speciesLabel = 'Target Species',
}: {
  icon: string;
  name: string;
  subtitle: string;
  area: string;
  goal: string;
  goalLabel?: string;
  species: string[];
  speciesLabel?: string;
}) {
  return (
    <article className="phase-wizard-zone-card">
      <div className="phase-wizard-zone-card-head">
        <div>
          <strong>{name}</strong>
          <p>{subtitle}</p>
        </div>
        <img src={icon} alt="" />
      </div>
      <div className="phase-wizard-zone-metrics">
        <div>
          <span>Area</span>
          <strong>{area}</strong>
        </div>
        <div>
          <span>{goalLabel}</span>
          <strong>{goal}</strong>
        </div>
      </div>
      <div className="phase-wizard-zone-species">
        <span>{speciesLabel}</span>
        <div className="phase-wizard-species-tags">
          {species.map((item) => (
            <em key={item}>{item}</em>
          ))}
        </div>
      </div>
    </article>
  );
}
