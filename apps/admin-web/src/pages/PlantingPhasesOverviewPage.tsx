import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { localAssetUrls } from '@bakki/domain';
import { ActionButton, EmptyStatePanel, PageStatePanel, SurfaceCard } from '@bakki/ui';
import { usePlantingPhaseOverview } from '@/queries/phases';
import {
  resolvePlantingPhasesOverviewRenderState,
} from './planting-phases-overview.utils';

export function PlantingPhasesOverviewPage() {
  const navigate = useNavigate();
  const {
    data: phaseOverview,
    error: phaseOverviewError,
    isPending,
    refetch,
  } = usePlantingPhaseOverview();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const renderState = resolvePlantingPhasesOverviewRenderState(phaseOverview, isPending);

  useEffect(() => {
    if (!phaseOverview?.phases.length) {
      return;
    }

    const nextSelectedPhaseId = phaseOverview.selectedPhaseId
      ?? phaseOverview.phases.find((phase) => phase.status === 'active')?.id
      ?? phaseOverview.phases[0]?.id
      ?? null;
    if (!selectedPhaseId || !phaseOverview.phases.some((phase) => phase.id === selectedPhaseId)) {
      setSelectedPhaseId(nextSelectedPhaseId);
    }
  }, [phaseOverview, selectedPhaseId]);

  if (renderState === 'loading') {
    return (
      <section className="view is-active" id="view-phase-summary">
        <div className="page-content phase-main-figma-page" id="phase-summary-landing">
          <PageStatePanel
            eyebrow="Planting Phases"
            heading="Loading phase data"
            message="Loading phase history, operational timeline, and current deployment summary."
          />
        </div>
      </section>
    );
  }

  if (renderState === 'unavailable') {
    return (
      <section className="view is-active" id="view-phase-summary">
        <div className="page-content phase-main-figma-page" id="phase-summary-landing">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="Planting Phases"
            heading="Phase data unavailable"
            message={phaseOverviewError instanceof Error ? phaseOverviewError.message : 'Phase overview data could not be loaded.'}
            tone="error"
          />
        </div>
      </section>
    );
  }

  if (!phaseOverview) {
    return null;
  }

  const selectedPhase = phaseOverview.phases.find((phase) => phase.id === selectedPhaseId)
    ?? phaseOverview.phases.find((phase) => phase.status === 'active')
    ?? phaseOverview.phases[0]
    ?? null;
  const selectedPhaseDetail = selectedPhase?.detail ?? null;
  const visibleTeamMembers = selectedPhaseDetail?.teamMembers.length
    ? selectedPhaseDetail.teamMembers
    : phaseOverview.teamMembers;
  const teamTotal = selectedPhaseDetail?.teamTotal ?? phaseOverview.teamTotal;
  const teamTotalLabel = selectedPhaseDetail?.teamTotalLabel ?? phaseOverview.teamTotalLabel;
  const soilTrackingLabel = selectedPhaseDetail?.primaryInsightLabel ?? phaseOverview.soilTrackingLabel;
  const soilTrackingValue = selectedPhaseDetail?.primaryInsightValue ?? phaseOverview.soilTrackingValue;
  const soilTrackingProgress = selectedPhaseDetail?.primaryInsightProgressPercent ?? 0;
  const weatherInsight = selectedPhaseDetail?.secondaryInsight ?? phaseOverview.weatherInsight;
  const nitrogenInsight = selectedPhaseDetail?.tertiaryInsight ?? phaseOverview.nitrogenInsight;
  const selectedAreaRefs = selectedPhaseDetail?.areaRefs ?? [];
  const overviewTitle = selectedPhase ? `Phase Overview: ${selectedPhase.title}` : phaseOverview.overviewTitle;
  const mapEyebrow = selectedPhaseDetail?.mapEyebrow ?? phaseOverview.mapEyebrow;
  const mapTitle = selectedPhaseDetail?.mapTitle ?? phaseOverview.mapTitle;
  const liveChipLabel = selectedPhaseDetail?.liveChipLabel ?? phaseOverview.liveChipLabel;

  return (
    <section className="view is-active" id="view-phase-summary">
      <div className="page-content phase-main-figma-page" id="phase-summary-landing">
        <header className="phase-main-figma-header">
          <h1>Planting Phases</h1>
          <ActionButton
            className="phase-main-figma-start-button"
            label="Start New Planting Phase"
            leadingVisual={<img src={phaseOverview.startButtonIconUrl} alt="" />}
            onClick={() => navigate({ to: '/planting-phases/new/info' })}
          />
        </header>

        <section className="phase-main-figma-grid">
          <div className="phase-main-figma-timeline">
            <div className="phase-main-figma-section-label">
              <img src={phaseOverview.sectionLabelIconUrl} alt="" />
              <span>Operational Timeline</span>
            </div>

              <div className="phase-main-figma-timeline-list">
                <div className="phase-main-figma-timeline-line" />

              {phaseOverview.phases.length > 0 ? (
                phaseOverview.phases.map((phase) => (
                  <button
                    aria-pressed={selectedPhase?.id === phase.id}
                    className={`phase-main-figma-timeline-card phase-main-figma-timeline-card-button ${phase.status === 'active' ? 'is-active' : 'is-complete'}${selectedPhase?.id === phase.id ? ' is-selected' : ''}`}
                    key={phase.id}
                    onClick={() => phase.isClickable ? setSelectedPhaseId(phase.id) : undefined}
                    type="button"
                  >
                    <div className="phase-main-figma-timeline-dot" />
                    <div className="phase-main-figma-phase-card">
                      <div className="phase-main-figma-phase-card-top">
                        <span className={`phase-main-figma-badge ${phase.status === 'active' ? 'is-active' : 'is-complete'}`}>
                          {phase.badgeLabel}
                        </span>
                        <span className="phase-main-figma-date">{phase.dateLabel}</span>
                      </div>
                      <h2>{phase.title}</h2>
                      {phase.metrics ? (
                        <div className="phase-main-figma-metrics">
                          {phase.metrics.map((metric) => (
                            <span key={metric.label}><img src={metric.iconUrl} alt="" />{metric.label}</span>
                          ))}
                        </div>
                      ) : null}
                      {phase.detail ? (
                        <div className="phase-main-figma-phase-card-summary">
                          <span className="phase-main-figma-phase-card-summary-label">
                            {phase.detail.primaryInsightLabel}
                          </span>
                          <strong className="phase-main-figma-phase-card-summary-value">
                            {phase.detail.primaryInsightValue}
                          </strong>
                          <span className="phase-main-figma-phase-card-summary-copy">
                            {phase.detail.secondaryInsight.title ?? 'Average Density'} {phase.detail.secondaryInsight.value}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))
              ) : (
                <EmptyStatePanel
                  className="bakki-card-empty-state"
                  heading="No phase history yet"
                  message="Start the first planting phase to establish the operational timeline."
                />
              )}
            </div>
          </div>

          <div className="phase-main-figma-overview">
            <div className="phase-main-figma-overview-head">
              <h2>{overviewTitle}</h2>
              <ActionButton
                className="phase-main-figma-export-button"
                label="Export Phase Data"
                trailingVisual={<img src={phaseOverview.exportIconUrl} alt="" />}
              />
            </div>

            <div className="phase-main-figma-card-row">
              <SurfaceCard as="article" className="phase-main-figma-team-card">
                <div className="phase-main-figma-card-head">
                  <h3>{phaseOverview.teamCardTitle}</h3>
                  <span className="phase-main-figma-total-chip">
                    <strong>{teamTotal}</strong>
                    <span>{teamTotalLabel}</span>
                  </span>
                </div>

                <div className="phase-main-figma-member-list">
                  {visibleTeamMembers.length > 0 ? (
                    visibleTeamMembers.map((member) => (
                      <div className="phase-main-figma-member-row" key={member.id}>
                        <div className="phase-main-figma-member-main">
                          <img src={member.avatarUrl} alt={member.name} />
                          <div>
                            <strong>{member.name}</strong>
                            <span>{member.role}</span>
                          </div>
                        </div>
                        <img className="phase-main-figma-member-action" src={member.actionIconUrl} alt="" />
                      </div>
                    ))
                  ) : (
                    <EmptyStatePanel
                      className="bakki-card-empty-state"
                      heading="No assigned team yet"
                      message="Start a planting phase to assign field personnel and populate this summary."
                    />
                  )}
                </div>

                <ActionButton className="phase-main-figma-secondary-button" label={phaseOverview.teamButtonLabel} />
              </SurfaceCard>

              <SurfaceCard as="article" className="phase-main-figma-insights-card">
                <h3>{phaseOverview.insightsTitle}</h3>

                <div className="phase-main-figma-insight-block">
                  <div className="phase-main-figma-insight-head">
                    <span>{soilTrackingLabel}</span>
                    <strong>{soilTrackingValue}</strong>
                  </div>
                  <div className="phase-main-figma-progress">
                    <span style={{ width: `${Math.max(0, Math.min(100, soilTrackingProgress))}%` }} />
                  </div>
                </div>

                <div className="phase-main-figma-insight-row">
                  <img src={weatherInsight.iconUrl} alt="" />
                  <div className="phase-main-figma-insight-copy">
                    <div className="phase-main-figma-insight-head">
                      <span>{weatherInsight.title}</span>
                      <strong>{weatherInsight.value}</strong>
                    </div>
                    <p>{weatherInsight.copy}</p>
                  </div>
                </div>

                <div className={`phase-main-figma-insight-row${nitrogenInsight.bordered ? ' phase-main-figma-insight-row-border' : ''}`}>
                  <img src={nitrogenInsight.iconUrl} alt="" />
                  <p>{nitrogenInsight.copy}</p>
                </div>
              </SurfaceCard>
            </div>

            <SurfaceCard as="article" className="phase-main-figma-map-card">
              <img className="phase-main-figma-map-preview" src={localAssetUrls.phaseMap} alt="" />
              <div className="phase-main-figma-map-overlay" />
              <div className="phase-main-figma-map-copy">
                <span>{mapEyebrow}</span>
                <strong>{mapTitle}</strong>
              </div>
              <span className="phase-main-figma-live-chip">{liveChipLabel}</span>
            </SurfaceCard>
          </div>
        </section>

        <section className="phase-main-figma-banner">
          <img className="phase-main-figma-banner-mark" src={phaseOverview.bannerIconUrl} alt="" />
          <div className="phase-main-figma-banner-copy">
            <span>{phaseOverview.bannerEyebrow}</span>
            <strong>{phaseOverview.bannerTitle}</strong>
            <p>{phaseOverview.bannerCopy}</p>
          </div>
          <div className="phase-main-figma-banner-actions">
            <ActionButton className="phase-main-figma-banner-outline" label={phaseOverview.bannerOutlineLabel} />
            <ActionButton
              className="phase-main-figma-banner-primary"
              label={phaseOverview.bannerPrimaryLabel}
              onClick={() => navigate({ to: '/planting-phases/new/info' })}
            />
          </div>
        </section>
      </div>
    </section>
  );
}
