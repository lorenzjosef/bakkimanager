import { useNavigate } from '@tanstack/react-router';
import type { DashboardProgramItem } from '@bakki/domain';
import { EmptyStatePanel, PageStatePanel } from '@bakki/ui';
import { useSessionStatus } from '@/queries/auth';
import { useDashboardSummary } from '@/queries/dashboard';
import {
  hasDashboardProgramItems,
  resolveDashboardGreetingName,
  resolveDashboardRenderState,
} from './dashboard.utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const sessionQuery = useSessionStatus();
  const {
    data: dashboard,
    isPending,
    refetch,
  } = useDashboardSummary();

  const renderState = resolveDashboardRenderState(dashboard, isPending);

  if (renderState === 'loading') {
    return (
      <section className="view is-active" id="view-dashboard">
        <div className="page-content contemporary-dashboard">
          <PageStatePanel
            eyebrow="Dashboard"
            heading="Loading dashboard"
            message="Loading the latest ranch summary and operational signals."
          />
        </div>
      </section>
    );
  }

  if (renderState === 'unavailable') {
    return (
      <section className="view is-active" id="view-dashboard">
        <div className="page-content contemporary-dashboard">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="Dashboard"
            heading="Dashboard unavailable"
            message="The dashboard could not be loaded."
            tone="error"
          />
        </div>
      </section>
    );
  }

  if (!dashboard) {
    return null;
  }

  const greetingName = resolveDashboardGreetingName(dashboard, sessionQuery.data?.session);

  return (
    <section className="view is-active" id="view-dashboard">
      <div className="page-content contemporary-dashboard">
        <section className="contemporary-header">
          <div>
            <h1 className="contemporary-hello">Hello, {greetingName}</h1>
            <div className="contemporary-divider" />
          </div>
          <div className="local-time-block">
            <span>{dashboard.localTimeLabel}</span>
            <strong>{dashboard.localTimeValue}</strong>
          </div>
        </section>

        <section className="contemporary-grid">
          <article className="active-phase-card">
            <div className="phase-card-copy">
              <div className="phase-card-eyebrow">{dashboard.activePhase.eyebrow}</div>
              <div className="phase-card-stat-label">{dashboard.activePhase.heroMetricLabel}</div>
              <div className="phase-card-percent">{dashboard.activePhase.heroMetricValue}</div>
              <div className="phase-card-name">{dashboard.activePhase.name}</div>
              <div className="phase-card-stats">
                <div>
                  <span>{dashboard.activePhase.primaryMetricLabel}</span>
                  <strong>{dashboard.activePhase.primaryMetricValue}</strong>
                </div>
                <div>
                  <span>{dashboard.activePhase.secondaryMetricLabel}</span>
                  <strong>{dashboard.activePhase.secondaryMetricValue}</strong>
                </div>
              </div>
            </div>
            <div className="phase-card-forest">
              <button
                className="contemporary-map-button"
                onClick={() => navigate({ to: '/map-viewer' })}
                type="button"
              >
                <span>View Map</span>
                <span className="map-button-arrow">NE</span>
              </button>
              <div className="forest-watermark">SAFE EARTH WORK</div>
            </div>
          </article>

          <div className="contemporary-side-cards">
            <article className="contemporary-mini-card">
              <div>
                <div className="mini-card-label">{dashboard.conditionsLabel}</div>
                <div className="mini-card-value">{dashboard.conditionsValue}</div>
                <div className="mini-card-copy">{dashboard.conditionsCopy}</div>
              </div>
              <svg className="mini-card-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.8">
                <circle cx="24" cy="24" r="8" />
                <path d="M24 4v8M24 36v8M4 24h8M36 24h8M9.9 9.9l5.7 5.7M32.4 32.4l5.7 5.7M38.1 9.9l-5.7 5.7M15.6 32.4l-5.7 5.7" />
              </svg>
            </article>

            <article className="contemporary-mini-card biodiversity-card">
              <div className="mini-card-label">{dashboard.biodiversityLabel}</div>
              <div className="biodiversity-row">
                <strong>{dashboard.biodiversityActiveSpecies}</strong>
                <span>{dashboard.biodiversityCaption}</span>
              </div>
              <div className="species-stack">
                <span className="species-avatar species-avatar-a" />
                <span className="species-avatar species-avatar-b" />
                <span className="species-avatar species-avatar-count">{dashboard.biodiversityStackCount}</span>
              </div>
            </article>

            <article className="contemporary-mini-card contract-mini-card">
              <div>
                <div className="mini-card-label">{dashboard.contractCompletionLabel}</div>
                <div className="mini-card-value">{dashboard.contractCompletionValue}</div>
                <div className="mini-card-copy">{dashboard.contractCompletionCopy}</div>
              </div>
              <svg className="mini-card-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.8">
                <path d="M12 30l8 8 16-20" />
                <circle cx="24" cy="24" r="18" />
              </svg>
            </article>
          </div>

          <article className="zones-snippet-card">
            <div className="zones-card-head">
              <div className="zones-title">{dashboard.activeZonesTitle}</div>
              <div className="zones-live">{dashboard.activeZonesStatus}</div>
            </div>
            <div className="zones-map">
              <span className="zones-marker" />
              <div className="coordinates-panel">
                <span>{dashboard.activeZonesCoordinatesLabel}</span>
                <strong>{dashboard.activeZonesCoordinatesValue}</strong>
              </div>
            </div>
          </article>

          <section className="contemporary-tasks-panel">
            <div className="tasks-panel-head">
              <div className="tasks-panel-title">{dashboard.programPanelTitle}</div>
              <button className="all-tasks-link" onClick={() => navigate({ to: '/task-management' })} type="button">
                Task Board
              </button>
            </div>

            <div className="contemporary-task-list">
              {hasDashboardProgramItems(dashboard) ? (
                dashboard.programItems.map((item) => (
                  <DashboardProgramListItem key={item.id} item={item} />
                ))
              ) : (
                <EmptyStatePanel
                  className="bakki-card-empty-state"
                  heading="No scheduled work today"
                  message="The ranch program for today will appear here once tasks are scheduled."
                />
              )}
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}

function DashboardProgramListItem({ item }: { item: DashboardProgramItem }) {
  return (
    <article className="contemporary-task-item">
      <div className="task-item-start">
        <div className={`task-item-icon${item.accent === 'green' ? ' task-item-icon-green' : ''}`}>
          {item.icon === 'leaf' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3c-2.2 3.1-4 5.3-4 8a4 4 0 0 0 8 0c0-2.7-1.8-4.9-4-8z" />
            </svg>
          ) : null}
          {item.icon === 'cabin' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 10.5L12 4l7 6.5V20H5v-9.5z" />
              <path d="M9 20v-5h6v5" />
            </svg>
          ) : null}
          {item.icon === 'crate' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 7h14M7 7v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" />
              <path d="M9 11h6M10 3h4" />
            </svg>
          ) : null}
        </div>
        <div>
          <h3>{item.title}</h3>
          <p>{item.subtitle}</p>
        </div>
      </div>
      <div className="task-item-end">
        <strong>{item.timeLabel}</strong>
        <span>{item.assigneeLabel}</span>
      </div>
    </article>
  );
}
