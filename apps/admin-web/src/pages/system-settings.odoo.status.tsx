import {
  SettingsReadOnlyField,
  SurfaceCard,
} from '@bakki/ui';
import {
  buildOdooTip,
  formatSettingsTimestamp,
  getFallbackSyncHistory,
  mirrorErrorWidth,
} from './system-settings.utils';
import {
  getWeatherFeedStatusLabel,
} from './system-settings.page-utils';
import {
  type DiagnosticsData,
  type DiagnosticsQuery,
} from './system-settings.odoo.types';

export function SyncHistorySection({ diagnostics }: { diagnostics: DiagnosticsData }) {
  return (
    <section className="settings-figma-block">
      <div className="settings-figma-block-head compact">
        <div><h2>Sync History Log</h2></div>
      </div>
      <div className="settings-figma-log-stack">
        {(diagnostics?.syncHistory || getFallbackSyncHistory()).map((entry) => (
          <SurfaceCard as="article" className={`settings-figma-surface settings-figma-log-item ${entry.tone}`} key={entry.id}>
            <div className="settings-figma-log-copy">
              <strong>{entry.label}</strong>
              <span>{entry.detail}</span>
            </div>
            <em>{entry.timeLabel}</em>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}

export function WeatherFeedSection({ diagnostics }: { diagnostics: DiagnosticsData }) {
  return (
    <section className="settings-figma-block">
      <div className="settings-figma-block-head compact">
        <div><h2>Weather Feed</h2></div>
      </div>
      <SurfaceCard as="article" className="settings-figma-surface settings-figma-soft-surface settings-figma-vertical-gap">
        <div className="settings-figma-card-head-row">
          <div className="settings-figma-head-with-meta">
            <div className="settings-figma-head-row-inline">
              <h3>Open-Meteo Current Conditions</h3>
              <span className={`settings-figma-status-pill${diagnostics?.weather.available ? ' is-active' : ' is-pending'}`}>
                {getWeatherFeedStatusLabel(diagnostics)}
              </span>
            </div>
            <p>Operator check for the live weather feed used by the dashboard conditions card.</p>
          </div>
        </div>
        <SettingsReadOnlyField label="Provider" value={diagnostics?.weather.provider || 'open-meteo'} />
        <SettingsReadOnlyField label="Current Snapshot" value={diagnostics?.weather.conditionsValue || 'Unavailable'} />
        <SettingsReadOnlyField label="Wind Detail" value={diagnostics?.weather.conditionsCopy || 'Unavailable'} />
        <p className="settings-figma-muted-footnote">
          {diagnostics?.weather
            ? `${diagnostics.weather.message} Last checked ${formatSettingsTimestamp(diagnostics.weather.checkedAt)}.`
            : 'Checking live weather diagnostics now.'}
        </p>
      </SurfaceCard>
    </section>
  );
}

export function IntegrationsHealthCard({
  diagnostics,
  diagnosticsQuery,
}: {
  diagnostics: DiagnosticsData;
  diagnosticsQuery: DiagnosticsQuery;
}) {
  return (
    <SurfaceCard as="article" className="settings-figma-health-card">
      <span className="settings-figma-kicker">Integrations Health</span>
      <div className="settings-figma-health-metric">
        <div><span>Sync Success Rate</span><strong>{diagnostics?.successRatePercent !== null && diagnostics?.successRatePercent !== undefined ? `${diagnostics.successRatePercent}%` : 'n/a'}</strong></div>
        <div className="settings-figma-progress-track blue"><span style={{ width: `${diagnostics?.successRatePercent ?? 0}%` }} /></div>
      </div>
      <div className="settings-figma-health-metric">
        <div><span>Mirror Errors</span><strong>{(diagnostics?.mirrors.users.errorCount ?? 0) + (diagnostics?.mirrors.tasks.errorCount ?? 0)}</strong></div>
        <div className="settings-figma-progress-track blue partial"><span style={{ width: `${mirrorErrorWidth(diagnostics)}%` }} /></div>
      </div>
      <div className="settings-figma-tip-panel">
        <span>PRO TIP</span>
        <p>{buildOdooTip(diagnostics, diagnosticsQuery.error?.message)}</p>
      </div>
    </SurfaceCard>
  );
}
