import { useEffect, useState } from 'react';
import type {
  PlantingWizardAreaData,
  PlantingWizardData,
  SpeciesRecord,
} from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import { EmptyStatePanel, InlineStatusBanner } from '@bakki/ui';
import { PlantingWizardAreaMap } from './planting-wizard.area-map';
import {
  calculateAssignmentTreeCount,
  type PlantingParticipantAssignmentDraft,
} from './planting-wizard.utils';
import {
  STEP_ICONS,
  TeamMember,
  WizardZoneCard,
} from './planting-wizard.shared';

function formatCount(value: number | null) {
  return value !== null ? `${value.toLocaleString('en-US')} trees` : 'Calculated after species selection';
}

function formatTrayLabel(value: string) {
  const trayCount = Number(value);
  if (!Number.isFinite(trayCount) || trayCount <= 0) {
    return null;
  }

  return `${trayCount} tray${trayCount === 1 ? '' : 's'}`;
}

function resolveZoneLabel(subtitle: string) {
  return subtitle.replace(/^Zone:\s*/i, '').trim() || subtitle;
}

export function PhaseAreasStep({
  areas,
  areaOptions,
  areaSpeciesById,
  activeArea,
  participantAssignmentsById,
  selectedAreaIds,
  selectedParticipants,
  speciesOptions,
  taskType,
  onActiveAreaChange,
  onAreaSpeciesChange,
  onParticipantAreaChange,
  onParticipantTrayCountChange,
  onToggleArea,
  onSetTaskType,
}: {
  areas: PlantingWizardData['areas'];
  areaOptions: PlantingWizardData['confirm']['zones'];
  areaSpeciesById: Record<string, string>;
  activeArea: PlantingWizardAreaData | null;
  participantAssignmentsById: Record<string, PlantingParticipantAssignmentDraft>;
  selectedAreaIds: string[];
  selectedParticipants: Array<PlantingWizardData['confirm']['teamMembers'][number]>;
  speciesOptions: SpeciesRecord[];
  taskType: 'planting' | 'monitoring' | 'fertilizing';
  onActiveAreaChange: (value: string) => void;
  onAreaSpeciesChange: (areaId: string, speciesRef: string) => void | Promise<void>;
  onParticipantAreaChange: (participantId: string, areaId: string) => void;
  onParticipantTrayCountChange: (participantId: string, value: string) => void;
  onToggleArea: (value: string) => void;
  onSetTaskType: (value: 'planting' | 'monitoring' | 'fertilizing') => void;
}) {
  const statValue = activeArea?.area ?? `${areas.totalAreaValue} ${areas.totalAreaUnit}`;
  const activeAreaSpecies = activeArea ? areaSpeciesById[activeArea.id] ?? '' : '';
  const activeSpeciesRecord = speciesOptions.find((species) => species.id === activeAreaSpecies) ?? null;
  const [selectedPlanterId, setSelectedPlanterId] = useState<string>(selectedParticipants[0]?.id ?? '');
  const [isSaplingPickerOpen, setIsSaplingPickerOpen] = useState(false);
  const selectedPlanter = selectedParticipants.find((member) => member.id === selectedPlanterId) ?? selectedParticipants[0] ?? null;
  const selectedAssignment = selectedPlanter ? participantAssignmentsById[selectedPlanter.id] : undefined;
  const selectedAssignedArea = areaOptions.find(
    (area) => area.id === selectedAssignment?.areaId,
  ) ?? null;
  const selectedAssignedSpecies = speciesOptions.find(
    (species) => species.id === ((selectedAssignedArea ?? activeArea) ? areaSpeciesById[(selectedAssignedArea ?? activeArea)!.id] ?? '' : ''),
  ) ?? null;
  const selectedCalculatedTreeCount = calculateAssignmentTreeCount(
    selectedAssignment?.trayCount ?? '',
    selectedAssignedSpecies?.treesPerTray,
  );

  useEffect(() => {
    if (selectedParticipants.length === 0) {
      if (selectedPlanterId) {
        setSelectedPlanterId('');
      }
      return;
    }

    if (!selectedParticipants.some((member) => member.id === selectedPlanterId)) {
      setSelectedPlanterId(selectedParticipants[0]?.id ?? '');
    }
  }, [selectedParticipants, selectedPlanterId]);

  useEffect(() => {
    if (!selectedPlanter || !selectedAssignedArea) {
      return;
    }

    if (activeArea?.id !== selectedAssignedArea.id) {
      onActiveAreaChange(selectedAssignedArea.id);
    }

    if (!selectedAreaIds.includes(selectedAssignedArea.id)) {
      onToggleArea(selectedAssignedArea.id);
    }
  }, [
    activeArea?.id,
    onActiveAreaChange,
    onToggleArea,
    selectedAreaIds,
    selectedAssignedArea,
    selectedPlanter,
  ]);

  useEffect(() => {
    setIsSaplingPickerOpen(false);
  }, [activeArea?.id]);

  return (
    <div className="phase-wizard-body phase-wizard-body-map">
      <div className="phase-wizard-map-layout">
        <div className="phase-wizard-map-column">
          <section className="phase-wizard-map-stage">
            <PlantingWizardAreaMap
              activeAreaId={activeArea?.id ?? null}
              onSelectArea={(areaId) => {
                if (selectedPlanter) {
                  onParticipantAreaChange(selectedPlanter.id, areaId);
                }
                onActiveAreaChange(areaId);
                if (!selectedAreaIds.includes(areaId)) {
                  onToggleArea(areaId);
                }
              }}
            />
          </section>

          <section className="phase-wizard-selection-card phase-wizard-area-selection-card">
            <div className="phase-wizard-selection-head">
              <h2>Selected Area</h2>
              <span className="phase-wizard-selection-chip">
                {selectedAreaIds.length} area{selectedAreaIds.length === 1 ? '' : 's'} selected
              </span>
            </div>

            <div className="phase-wizard-area-summary-row">
              <div className="phase-wizard-selection-copy">
                <span>Area Name</span>
                <strong>{activeArea?.name ?? areas.selectedAreaName}</strong>
                <p>{activeArea ? `Context: ${activeArea.subtitle}` : areas.selectedAreaStatus}</p>
              </div>

              <div className="phase-wizard-selection-stats phase-wizard-selection-stats-inline">
                <article>
                  <span>Total Area</span>
                  <div>
                    <strong>{statValue.split(' ')[0]}</strong>
                    <em>{statValue.split(' ').slice(1).join(' ') || areas.totalAreaUnit}</em>
                  </div>
                </article>
                <article>
                  <span>Assigned Sapling</span>
                  <div>
                    <strong>{activeSpeciesRecord?.commonName ?? 'Not set'}</strong>
                  </div>
                </article>
                <article>
                  <span>Trees / Tray</span>
                  <div>
                    <strong>
                      {activeSpeciesRecord?.treesPerTray
                        ? activeSpeciesRecord.treesPerTray.toLocaleString('en-US')
                        : 'Not set'}
                    </strong>
                  </div>
                </article>
                <article className="phase-wizard-selection-action-card">
                  <span>Sapling</span>
                  <button
                    className="phase-wizard-selection-action-button"
                    disabled={!activeArea}
                    onClick={() => setIsSaplingPickerOpen((current) => !current)}
                    type="button"
                  >
                    <strong>{activeAreaSpecies ? 'Edit sapling' : 'Choose sapling'}</strong>
                  </button>
                </article>
              </div>
            </div>

          </section>
        </div>

        <aside className="phase-wizard-selection-card phase-wizard-planter-panel">
          <div className="phase-wizard-selection-head">
            <h2>Planter Assignments</h2>
            <span className="phase-wizard-selection-chip">
              {selectedParticipants.length} planter{selectedParticipants.length === 1 ? '' : 's'}
            </span>
          </div>

          <section className="phase-wizard-config-block">
            <label className="phase-wizard-mini-field">
              <span>Selected Planter</span>
              {selectedParticipants.length > 0 ? (
                <select
                  className="phase-wizard-search-select phase-wizard-select-control"
                  onChange={(event) => setSelectedPlanterId(event.target.value)}
                  value={selectedPlanterId}
                >
                  {selectedParticipants.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              ) : (
                <EmptyStatePanel
                  className="bakki-card-empty-state"
                  heading="No planters assigned"
                  message="Assign planters in the team step before generating phase work."
                />
              )}
            </label>

            {selectedPlanter ? (
              <article className="phase-wizard-planter-assignment-card">
                <div className="phase-wizard-planter-assignment-head">
                  <strong>{selectedPlanter.name}</strong>
                  <span>{selectedPlanter.role}</span>
                </div>

                <label className="phase-wizard-mini-field">
                  <span>Assigned Area</span>
                  <select
                    className="phase-wizard-search-select phase-wizard-select-control"
                    disabled={areaOptions.length === 0}
                    onChange={(event) => {
                      onParticipantAreaChange(selectedPlanter.id, event.target.value);
                      onActiveAreaChange(event.target.value);
                      if (!selectedAreaIds.includes(event.target.value)) {
                        onToggleArea(event.target.value);
                      }
                    }}
                    value={selectedAssignment?.areaId ?? ''}
                  >
                    <option value="">
                      {areaOptions.length > 0 ? 'Select area' : 'No mapped areas available'}
                    </option>
                    {areaOptions.map((area) => (
                      <option key={area.id} value={area.id}>
                        {resolveZoneLabel(area.subtitle)} / {area.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="phase-wizard-mini-field">
                  <span>Assigned Trays</span>
                  <input
                    className="phase-wizard-goal-input phase-wizard-input-control"
                    onChange={(event) => onParticipantTrayCountChange(selectedPlanter.id, event.target.value)}
                    placeholder={areas.trayCountPlaceholder}
                    type="number"
                    value={selectedAssignment?.trayCount ?? ''}
                  />
                  <small>{areas.trayCountHelp}</small>
                </label>

                <div className="phase-wizard-assignment-output">
                  <span>Calculated Tree Count</span>
                  <strong>{formatCount(selectedCalculatedTreeCount)}</strong>
                  <small>
                    {selectedAssignedArea
                      ? `${selectedAssignedArea.name} · ${selectedAssignedArea.subtitle}`
                      : 'Select a mapped area for this planter first.'}
                    {' '}
                    {selectedAssignedSpecies?.treesPerTray
                      ? `${selectedAssignedSpecies.treesPerTray.toLocaleString('en-US')} trees per tray.`
                      : 'Select a species with tray metadata to calculate tree count automatically.'}
                  </small>
                </div>
              </article>
            ) : (
              <EmptyStatePanel
                className="bakki-card-empty-state"
                heading="No planters assigned"
                message="Assign planters in the team step before generating phase work."
              />
            )}
          </section>

          <section className="phase-wizard-soil-note">
            <img src={localAssetUrls.wizardAreasSoilNote} alt="" />
            <div>
              <span>{areas.soilTitle}</span>
              <p>{areas.soilCopy}</p>
            </div>
          </section>
        </aside>
      </div>

      {isSaplingPickerOpen && activeArea ? (
        <div className="bakki-modal-shell" role="presentation">
          <div className="bakki-modal-backdrop" onClick={() => setIsSaplingPickerOpen(false)} />
          <div
            aria-labelledby="phase-wizard-sapling-title"
            aria-modal="true"
            className="bakki-modal-card phase-wizard-sapling-modal"
            role="dialog"
          >
            <div className="phase-wizard-sapling-picker-head">
              <div>
                <h3 id="phase-wizard-sapling-title">Select sapling</h3>
                <p>{activeArea.name}</p>
              </div>
              <button
                aria-label="Close sapling picker"
                className="phase-wizard-sapling-picker-close"
                onClick={() => setIsSaplingPickerOpen(false)}
                type="button"
              >
                <img src={localAssetUrls.close} alt="" />
              </button>
            </div>

            <div className="phase-wizard-sapling-option-list">
              {speciesOptions.map((species) => {
                const isSelected = activeAreaSpecies === species.id;
                return (
                  <button
                    className={`phase-wizard-sapling-option${isSelected ? ' is-selected' : ''}`}
                    key={species.id}
                    onClick={() => {
                      void Promise.resolve(onAreaSpeciesChange(activeArea.id, species.id))
                        .finally(() => setIsSaplingPickerOpen(false));
                    }}
                    type="button"
                  >
                    <div className="phase-wizard-sapling-option-copy">
                      <strong>{species.commonName}</strong>
                      <span>{species.botanicalName}</span>
                    </div>
                    <em>{species.treesPerTray?.toLocaleString('en-US') ?? 'n/a'} trees/tray</em>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PhaseConfirmStep({
  areaSpeciesById,
  confirm,
  participantAssignmentsById,
  selectedAreas,
  selectedParticipants,
  speciesOptions,
  taskType,
  createStepReady,
  isSubmitting,
  errorMessage,
  onSubmit,
}: {
  areaSpeciesById: Record<string, string>;
  confirm: PlantingWizardData['confirm'];
  participantAssignmentsById: Record<string, PlantingParticipantAssignmentDraft>;
  selectedAreas: PlantingWizardData['confirm']['zones'];
  selectedParticipants: PlantingWizardData['confirm']['teamMembers'];
  speciesOptions: SpeciesRecord[];
  taskType: 'planting' | 'monitoring' | 'fertilizing';
  createStepReady: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="phase-wizard-body phase-wizard-body-summary">
      <div className="phase-wizard-summary-headline">
        <h2>{confirm.title}</h2>
      </div>

      {errorMessage ? (
        <InlineStatusBanner
          className="bakki-page-inline-state"
          heading="Phase creation blocked"
          message={errorMessage}
          tone="error"
        />
      ) : null}

      <div className="phase-wizard-summary-grid">
        <section className="phase-wizard-summary-card">
          <div className="phase-wizard-summary-card-head">
            <h3>Planting Zones</h3>
            <span>{selectedAreas.length} Selected</span>
          </div>

          <div className="phase-wizard-zone-card-grid">
            {selectedParticipants.length > 0 ? (
              selectedParticipants.map((member, index) => {
                const contract = participantAssignmentsById[member.id];
                const zone = selectedAreas.find((area) => area.id === contract?.areaId) ?? null;
                const assignedSpecies =
                  speciesOptions.find((species) => species.id === (zone ? areaSpeciesById[zone.id] ?? '' : ''))
                  ?? null;
                const calculatedTreeCount = calculateAssignmentTreeCount(
                  contract?.trayCount ?? '',
                  assignedSpecies?.treesPerTray,
                );
                const assignmentTags = [
                  assignedSpecies?.commonName,
                  formatTrayLabel(contract?.trayCount ?? ''),
                  assignedSpecies?.treesPerTray
                    ? `${assignedSpecies.treesPerTray.toLocaleString('en-US')} trees/tray`
                    : null,
                ].filter((value): value is string => Boolean(value));

                return (
                  <WizardZoneCard
                    key={member.id}
                    area={zone?.area ?? 'Assignment incomplete'}
                    goal={formatCount(calculatedTreeCount)}
                    goalLabel="Calculated Trees"
                    icon={index % 2 === 0 ? localAssetUrls.wizardConfirmZoneHead : localAssetUrls.wizardConfirmZoneHeadAlt}
                    name={zone?.name ?? member.name}
                    species={assignmentTags.length > 0 ? assignmentTags : ['Assignment incomplete']}
                    speciesLabel="Assignment"
                    subtitle={zone ? `${zone.subtitle} · ${member.name}` : `${member.role} · ${member.name}`}
                  />
                );
              })
            ) : (
              <EmptyStatePanel
                className="bakki-card-empty-state"
                heading="No areas selected"
                message="Return to the areas step and choose at least one mapped area."
              />
            )}
          </div>

        </section>

        <aside className="phase-wizard-team-card">
          <div className="phase-wizard-team-card-head">
            <h3>{confirm.teamTitle}</h3>
            <img src={localAssetUrls.wizardTeamCardHead} alt="" />
          </div>

          <div className="phase-wizard-team-list">
            {selectedParticipants.length > 0 ? (
              <>
                {selectedParticipants.map((member) => (
                  <TeamMember key={member.id} avatarUrl={member.avatarUrl} name={member.name} role={member.role} />
                ))}
                <div className="phase-wizard-team-extra">
                  {selectedParticipants.length} personnel prepared for deployment
                </div>
              </>
            ) : (
              <EmptyStatePanel
                className="bakki-card-empty-state"
                heading="No team selected"
                message="Add at least one owner or planter before confirming the next phase."
              />
            )}
          </div>

          <button
            className="phase-wizard-confirm-button"
            disabled={!createStepReady || isSubmitting}
            onClick={onSubmit}
            type="button"
          >
            <img src={STEP_ICONS.confirm.confirm} alt="" />
            <span>{isSubmitting ? 'Creating Phase...' : confirm.confirmLabel}</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
