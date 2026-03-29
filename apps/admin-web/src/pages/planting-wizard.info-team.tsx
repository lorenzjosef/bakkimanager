import type { PlantingWizardData } from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import { EmptyStatePanel } from '@bakki/ui';
import {
  PersonChip,
} from './planting-wizard.shared';

export function PhaseInfoStep({
  phaseInfo,
  phaseName,
  startDate,
  endDate,
  description,
  onPhaseNameChange,
  onStartDateChange,
  onEndDateChange,
  onDescriptionChange,
}: {
  phaseInfo: PlantingWizardData['info'];
  phaseName: string;
  startDate: string;
  endDate: string;
  description: string;
  onPhaseNameChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <div className="phase-wizard-body phase-wizard-body-centered">
      <article className="phase-wizard-card phase-wizard-foundation-card">
        <div className="phase-wizard-card-copy">
          <h2>Phase Foundation</h2>
          <p>Define the temporal and descriptive parameters for this restoration cycle on the volcanic slopes.</p>
        </div>

        <div className="phase-wizard-form-grid">
          <label className="phase-wizard-field phase-wizard-field-full">
            <span>Phase Name</span>
            <input
              className="phase-wizard-input phase-wizard-input-control"
              onChange={(event) => onPhaseNameChange(event.target.value)}
              placeholder={phaseInfo.phaseNamePlaceholder}
              type="text"
              value={phaseName}
            />
          </label>

          <label className="phase-wizard-field">
            <span>Start Date</span>
            <input
              className="phase-wizard-input phase-wizard-input-control"
              onChange={(event) => onStartDateChange(event.target.value)}
              placeholder={phaseInfo.startDatePlaceholder}
              type="date"
              value={startDate}
            />
          </label>

          <label className="phase-wizard-field">
            <span>Expected End Date</span>
            <input
              className="phase-wizard-input phase-wizard-input-control"
              onChange={(event) => onEndDateChange(event.target.value)}
              placeholder={phaseInfo.endDatePlaceholder}
              type="date"
              value={endDate}
            />
          </label>

          <label className="phase-wizard-field phase-wizard-field-full">
            <span>Description</span>
            <textarea
              className="phase-wizard-textarea phase-wizard-textarea-control"
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder={phaseInfo.descriptionPlaceholder}
              value={description}
            />
          </label>
        </div>
      </article>
    </div>
  );
}

export function PhaseTeamStep({
  team,
  participantOptions,
  participantIds,
  crewRotation,
  operationalNotes,
  onToggleParticipant,
  onCrewRotationChange,
  onOperationalNotesChange,
}: {
  team: PlantingWizardData['team'];
  participantOptions: PlantingWizardData['confirm']['teamMembers'];
  participantIds: string[];
  crewRotation: string;
  operationalNotes: string;
  onToggleParticipant: (value: string) => void;
  onCrewRotationChange: (value: string) => void;
  onOperationalNotesChange: (value: string) => void;
}) {
  const selectedParticipants = participantOptions.filter((member) => participantIds.includes(member.id));

  return (
    <div className="phase-wizard-body phase-wizard-body-team">
      <article className="phase-wizard-team-card phase-wizard-team-card-setup phase-wizard-team-card-expanded">
        <div className="phase-wizard-team-card-head phase-wizard-team-card-head-expanded">
          <div className="phase-wizard-card-copy phase-wizard-team-card-copy">
            <span className="phase-wizard-team-card-kicker">Crew Setup</span>
            <h2>{team.preparedCrewTitle}</h2>
            <p>Select the crew for this planting phase. Area assignments happen in the next step.</p>
          </div>
          <img src={localAssetUrls.wizardTeamCardHead} alt="" />
        </div>

        <div className="phase-wizard-team-screen">
          <section className="phase-wizard-team-screen-roster">
            <div className="phase-wizard-team-list">
              {participantOptions.length > 0 ? (
                participantOptions.map((member) => (
                  <button
                    className={`phase-wizard-team-member phase-wizard-team-member-button${participantIds.includes(member.id) ? ' is-selected' : ''}`}
                    key={member.id}
                    onClick={() => onToggleParticipant(member.id)}
                    type="button"
                  >
                    <img src={member.avatarUrl} alt={member.name} />
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.role}</span>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyStatePanel
                  className="bakki-card-empty-state"
                  heading="No personnel available"
                  message="Sync owners and planters first so you can allocate a crew to this phase."
                />
              )}
            </div>
            <div className="phase-wizard-team-extra">{team.extraLabel}</div>
          </section>

          <div className="phase-wizard-team-screen-panel">
            <div className="phase-wizard-form-grid phase-wizard-form-grid-team">
              <label className="phase-wizard-field">
                <span>Planter Allocation</span>
                <div className="phase-wizard-input">
                  {selectedParticipants.length > 0
                    ? `${selectedParticipants.length} active personnel selected`
                    : team.planterAllocation}
                </div>
              </label>

              <label className="phase-wizard-field">
                <span>Crew Rotation</span>
                <input
                  className="phase-wizard-input phase-wizard-input-control"
                  onChange={(event) => onCrewRotationChange(event.target.value)}
                  type="text"
                  value={crewRotation}
                />
              </label>

              <label className="phase-wizard-field phase-wizard-field-full">
                <span>Operational Notes</span>
                <textarea
                  className="phase-wizard-textarea phase-wizard-textarea-control"
                  onChange={(event) => onOperationalNotesChange(event.target.value)}
                  value={operationalNotes}
                />
              </label>
            </div>

            <section className="phase-wizard-config-block phase-wizard-config-block-team">
              <h3>Assigned Crew</h3>
              <div className="phase-wizard-chip-row">
                {selectedParticipants.length > 0 ? (
                  selectedParticipants.map((member) => (
                    <PersonChip key={member.id} label={member.name} />
                  ))
                ) : (
                  <EmptyStatePanel
                    className="bakki-card-empty-state"
                    heading="No team assigned"
                    message="Select at least one owner or planter for this phase."
                  />
                )}
              </div>
            </section>

            <section className="phase-wizard-soil-note">
              <img src={localAssetUrls.wizardTeamNote} alt="" />
              <div>
                <span>{team.policyTitle}</span>
                <p>{team.policyCopy}</p>
              </div>
            </section>
          </div>
        </div>
      </article>
    </div>
  );
}
