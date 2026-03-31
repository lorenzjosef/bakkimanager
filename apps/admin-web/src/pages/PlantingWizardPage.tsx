import { useEffect, useMemo, useState } from 'react';
import type { PlantingWizardAreaData, PlantingWizardData } from '@bakki/domain';
import { useNavigate } from '@tanstack/react-router';
import { PageStatePanel, WizardFrameHeader, WizardProgressStepper } from '@bakki/ui';
import { useUpdateAreaDetailsMutation } from '@/queries/map';
import { useCreatePlantingPhaseMutation, usePlantingWizardData } from '@/queries/phases';
import { usePendingDraftsQuery } from '@/queries/drafts';
import { useSpeciesInventoryData } from '@/queries/species';
import { usePlantingWizardStore } from '@/store/plantingWizard';
import {
  PhaseAreasStep,
  PhaseConfirmStep,
  PhaseInfoStep,
  PhaseTeamStep,
  STEP_ICONS,
  type WizardStepId,
  WizardFooter,
  WIZARD_STEPS,
} from './planting-wizard.sections';
import {
  buildCreatePlantingPhasePayload,
  isPhaseAreasStepReady,
  isPhaseInfoStepReady,
  isPhaseTeamStepReady,
  resolvePlantingWizardRenderState,
} from './planting-wizard.utils';

interface PlantingWizardPageProps {
  step: WizardStepId;
}

export function PlantingWizardPage({ step }: PlantingWizardPageProps) {
  const navigate = useNavigate();
  const {
    data: wizard,
    error: wizardError,
    isPending,
    refetch,
  } = usePlantingWizardData();
  const createPhaseMutation = useCreatePlantingPhaseMutation();
  const updateAreaDetailsMutation = useUpdateAreaDetailsMutation();
  const speciesQuery = useSpeciesInventoryData();
  const pendingDraftsQuery = usePendingDraftsQuery();

  const initialized = usePlantingWizardStore((state) => state.initialized);
  const hydrateFromData = usePlantingWizardStore((state) => state.hydrateFromData);
  const resetDraft = usePlantingWizardStore((state) => state.reset);
  const phaseName = usePlantingWizardStore((state) => state.phaseName);
  const startDate = usePlantingWizardStore((state) => state.startDate);
  const endDate = usePlantingWizardStore((state) => state.endDate);
  const description = usePlantingWizardStore((state) => state.description);
  const fieldLeadId = usePlantingWizardStore((state) => state.fieldLeadId);
  const participantIds = usePlantingWizardStore((state) => state.participantIds);
  const crewRotation = usePlantingWizardStore((state) => state.crewRotation);
  const operationalNotes = usePlantingWizardStore((state) => state.operationalNotes);
  const selectedAreaIds = usePlantingWizardStore((state) => state.selectedAreaIds);
  const participantAssignmentsById = usePlantingWizardStore((state) => state.participantAssignmentsById);
  const areaSpeciesById = usePlantingWizardStore((state) => state.areaSpeciesById);
  const activeAreaId = usePlantingWizardStore((state) => state.activeAreaId);
  const taskType = usePlantingWizardStore((state) => state.taskType);
  const setPhaseName = usePlantingWizardStore((state) => state.setPhaseName);
  const setStartDate = usePlantingWizardStore((state) => state.setStartDate);
  const setEndDate = usePlantingWizardStore((state) => state.setEndDate);
  const setDescription = usePlantingWizardStore((state) => state.setDescription);
  const toggleParticipant = usePlantingWizardStore((state) => state.toggleParticipant);
  const setCrewRotation = usePlantingWizardStore((state) => state.setCrewRotation);
  const setOperationalNotes = usePlantingWizardStore((state) => state.setOperationalNotes);
  const toggleArea = usePlantingWizardStore((state) => state.toggleArea);
  const setActiveAreaId = usePlantingWizardStore((state) => state.setActiveAreaId);
  const setTaskType = usePlantingWizardStore((state) => state.setTaskType);
  const setAreaSpecies = usePlantingWizardStore((state) => state.setAreaSpecies);
  const setParticipantArea = usePlantingWizardStore((state) => state.setParticipantArea);
  const setParticipantTrayCount = usePlantingWizardStore((state) => state.setParticipantTrayCount);
  const [submitIssue, setSubmitIssue] = useState<string | null>(null);

  useEffect(() => {
    if (wizard && !initialized) {
      hydrateFromData(wizard);
    }
  }, [hydrateFromData, initialized, wizard]);

  const participantOptions = useMemo(() => {
    if (!wizard) {
      return [];
    }

    return wizard.confirm.teamMembers.length > 0
      ? wizard.confirm.teamMembers
      : wizard.team.preparedCrew;
  }, [wizard]);

  const participantById = useMemo(
    () => new Map(participantOptions.map((member) => [member.id, member])),
    [participantOptions],
  );

  const areaOptions = wizard?.confirm.zones ?? [];
  const areaById = useMemo(
    () => new Map(areaOptions.map((area) => [area.id, area])),
    [areaOptions],
  );

  const selectedParticipants = useMemo(
    () =>
      participantIds
        .map((id) => participantById.get(id))
        .filter((member): member is PlantingWizardData['confirm']['teamMembers'][number] => Boolean(member)),
    [participantById, participantIds],
  );

  const selectedAreas = useMemo(
    () =>
      selectedAreaIds
        .map((id) => areaById.get(id))
        .filter((area): area is PlantingWizardAreaData => Boolean(area)),
    [areaById, selectedAreaIds],
  );
  const speciesOptions = useMemo(
    () => (speciesQuery.data?.rows ?? []).filter((species) => (species.treesPerTray ?? 0) > 0),
    [speciesQuery.data?.rows],
  );

  const activeArea =
    (activeAreaId ? areaById.get(activeAreaId) : null)
    ?? selectedAreas[0]
    ?? null;
  const infoStepReady = isPhaseInfoStepReady(phaseName, startDate, endDate, description);
  const teamStepReady = isPhaseTeamStepReady(participantIds);
  const areasStepReady = isPhaseAreasStepReady(
    selectedAreaIds,
    participantIds,
    participantAssignmentsById,
    areaSpeciesById,
  );
  const createStepReady = infoStepReady && teamStepReady && areasStepReady;
  const renderState = resolvePlantingWizardRenderState(wizard, isPending);

  if (renderState === 'loading') {
    return (
      <section className="view is-active" id={`view-phase-setup-${step}`}>
        <div className="page-content phase-wizard-page">
          <PageStatePanel
            eyebrow="Planting Wizard"
            heading="Loading wizard"
            message="Loading the next phase setup flow and associated planning data."
          />
        </div>
      </section>
    );
  }

  if (renderState === 'unavailable') {
    return (
      <section className="view is-active" id={`view-phase-setup-${step}`}>
        <div className="page-content phase-wizard-page">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="Planting Wizard"
            heading="Wizard unavailable"
            message={wizardError instanceof Error ? wizardError.message : 'The planting phase wizard data could not be loaded.'}
            tone="error"
          />
        </div>
      </section>
    );
  }

  if (!wizard) {
    return null;
  }

  const handleCancel = () => {
    resetDraft();
    void navigate({ to: '/planting-phases' });
  };

  const handleAreaSpeciesChange = async (areaId: string, speciesRef: string) => {
    const area = areaById.get(areaId);
    if (!area) {
      return;
    }

    await updateAreaDetailsMutation.mutateAsync({
      areaId,
      payload: {
        name: area.name,
        speciesRef,
      },
    });
    setAreaSpecies(areaId, speciesRef);
  };

  const handleConfirm = async () => {
    const effectiveFieldLeadId = fieldLeadId ?? participantIds[0] ?? null;

    if (!createStepReady || !effectiveFieldLeadId) {
      setSubmitIssue('Complete the phase info, team allocation, and area selection before confirming the phase.');
      return;
    }

    setSubmitIssue(null);

    try {
      await createPhaseMutation.mutateAsync(
        buildCreatePlantingPhasePayload({
          phaseName,
          startDate,
          endDate,
          description,
          fieldLeadId: effectiveFieldLeadId,
          participantIds,
          selectedAreaIds,
          participantAssignmentsById,
          areaSpeciesById,
          crewRotation,
          operationalNotes,
          taskType,
        }),
      );

      resetDraft();
      void navigate({ to: '/planting-phases' });
    } catch {
      // Mutation state already exposes the error banner.
    }
  };

  return (
    <section className="view is-active" id={`view-phase-setup-${step}`}>
      <div className="page-content phase-wizard-page">
        <section className="phase-wizard-screen is-active">
          <WizardFrameHeader
            backLabel={
              step === 'info'
                ? 'Back to planting phases'
                : step === 'team'
                  ? 'Back to phase info'
                  : step === 'areas'
                    ? 'Back to team'
                    : 'Back to mapping'
            }
            backVisual={<img src={STEP_ICONS[step].back} alt="" />}
            onBack={() => {
              if (step === 'info') {
                handleCancel();
                return;
              }

              void navigate({
                to:
                  step === 'team'
                    ? '/planting-phases/new/info'
                    : step === 'areas'
                      ? '/planting-phases/new/team'
                      : '/planting-phases/new/areas',
              });
            }}
            heading="Start New Planting Phase"
          />
          <WizardProgressStepper currentStepId={step} steps={WIZARD_STEPS} />
          {step === 'info' ? (
            <PhaseInfoStep
              description={description}
              endDate={endDate}
              onDescriptionChange={setDescription}
              onEndDateChange={setEndDate}
              onPhaseNameChange={setPhaseName}
              onStartDateChange={setStartDate}
              phaseInfo={wizard.info}
              phaseName={phaseName}
              startDate={startDate}
            />
          ) : null}
          {step === 'team' ? (
            <PhaseTeamStep
              crewRotation={crewRotation}
              onCrewRotationChange={setCrewRotation}
              onOperationalNotesChange={setOperationalNotes}
              onToggleParticipant={toggleParticipant}
              operationalNotes={operationalNotes}
              participantIds={participantIds}
              participantOptions={participantOptions}
              team={wizard.team}
            />
          ) : null}
          {step === 'areas' ? (
            <PhaseAreasStep
              activeArea={activeArea}
              areaSpeciesById={areaSpeciesById}
              areaOptions={areaOptions}
              areas={wizard.areas}
              pendingDrafts={pendingDraftsQuery.data ?? []}
              onActiveAreaChange={setActiveAreaId}
              onAreaSpeciesChange={(areaId, speciesRef) => void handleAreaSpeciesChange(areaId, speciesRef)}
              onParticipantAreaChange={setParticipantArea}
              onParticipantTrayCountChange={setParticipantTrayCount}
              onSetTaskType={setTaskType}
              onToggleArea={toggleArea}
              participantAssignmentsById={participantAssignmentsById}
              selectedAreaIds={selectedAreaIds}
              selectedParticipants={selectedParticipants}
              speciesOptions={speciesOptions}
              taskType={taskType}
            />
          ) : null}
          {step === 'confirm' ? (
            <PhaseConfirmStep
              confirm={wizard.confirm}
              createStepReady={createStepReady}
              errorMessage={
                submitIssue
                || (createPhaseMutation.error instanceof Error ? createPhaseMutation.error.message : null)
              }
              isSubmitting={createPhaseMutation.isPending}
              onSubmit={handleConfirm}
              areaSpeciesById={areaSpeciesById}
              participantAssignmentsById={participantAssignmentsById}
              selectedAreas={selectedAreas}
              selectedParticipants={selectedParticipants}
              speciesOptions={speciesOptions}
              taskType={taskType}
            />
          ) : null}
          <WizardFooter
            infoStepReady={infoStepReady}
            onCancel={handleCancel}
            onNavigate={navigate}
            step={step}
            teamStepReady={teamStepReady}
            areasStepReady={areasStepReady}
          />
        </section>
      </div>
    </section>
  );
}
