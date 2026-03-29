import {
  SettingsReadOnlyField,
  SurfaceCard,
} from '@bakki/ui';
import {
  formatOdooBaseUrl,
  formatSettingsTimestamp,
} from './system-settings.utils';
import {
  getBakkiCorePersistenceLabel,
  getDeploymentBlockerSummary,
  getMirrorPersistenceLabel,
  getOdooConnectionDescription,
  getOdooConnectionStatusLabel,
  getOdooCredentialSourceLabel,
  getRecommendedActionSummary,
} from './system-settings.page-utils';
import {
  type DiagnosticsData,
  type DiagnosticsQuery,
  ODOO_FIELD_MAPPINGS,
  type SyncNowMutation,
} from './system-settings.odoo.types';

export function DatabaseConnectionCard({
  diagnostics,
  diagnosticsQuery,
}: {
  diagnostics: DiagnosticsData;
  diagnosticsQuery: DiagnosticsQuery;
}) {
  return (
    <SurfaceCard as="article" className="settings-figma-surface settings-figma-odoo-connection">
      <div className="settings-figma-card-head-row">
        <div className="settings-figma-head-with-meta">
          <div className="settings-figma-head-row-inline">
            <h2>Odoo Connection</h2>
            <span className={`settings-figma-status-pill${diagnostics?.odoo.reachable ? ' is-active' : ' is-pending'}`}>
              {getOdooConnectionStatusLabel(diagnostics)}
            </span>
          </div>
          <p>{getOdooConnectionDescription(diagnostics, diagnosticsQuery.error?.message)}</p>
        </div>
        <button className="settings-figma-primary-button small" type="button">Update Credentials</button>
      </div>
      <div className="settings-figma-vertical-gap">
        <SettingsReadOnlyField label="Instance URL" monospace value={formatOdooBaseUrl(diagnostics?.odoo.baseUrl) || 'bakki.odoo.com'} />
        <SettingsReadOnlyField label="Database Name" monospace value={diagnostics?.odoo.database || 'bakki'} />
        <SettingsReadOnlyField
          label="Credential Source"
          value={getOdooCredentialSourceLabel(diagnostics?.odoo.credentialSource)}
        />
        <SettingsReadOnlyField eye label="API Key" monospace value="••••••••••••••••••••" />
      </div>
      {diagnostics?.odoo.credentialSource === 'api_keys_file' ? (
        <p className="settings-figma-muted-footnote">
          Odoo service credentials are currently sourced from `API_Keys.txt`. Move them into runtime secrets before promoting deployment.
        </p>
      ) : null}
      <div className="settings-figma-note-row">
        <span className="settings-figma-icon-chip">i</span>
        <span>
          {diagnostics
            ? `${diagnostics.odoo.message} Last checked ${formatSettingsTimestamp(diagnostics.odoo.checkedAt)}.`
            : diagnosticsQuery.error
              ? `Diagnostics request failed: ${diagnosticsQuery.error.message}`
              : 'Connected via Odoo Online external API. Checking live diagnostics now.'}
        </span>
      </div>
    </SurfaceCard>
  );
}

export function SynchronizationCard({
  diagnostics,
  lastSuccessfulSyncTimestamp,
  syncNowMutation,
}: {
  diagnostics: DiagnosticsData;
  lastSuccessfulSyncTimestamp: string | null;
  syncNowMutation: SyncNowMutation;
}) {
  return (
    <SurfaceCard as="article" className="settings-figma-surface settings-figma-odoo-sync-card">
      <div className="settings-figma-head-with-meta">
        <h2>Synchronization</h2>
      </div>
      <div className="settings-figma-field-grid settings-figma-field-grid-2">
        <SettingsReadOnlyField
          label="Bakki Core Persistence"
          value={getBakkiCorePersistenceLabel(diagnostics)}
        />
        <SettingsReadOnlyField
          label="Mirror Persistence"
          value={getMirrorPersistenceLabel(diagnostics)}
        />
      </div>
      <div className="settings-figma-field">
        <span className="settings-figma-label">Auto-Sync Frequency</span>
        <div className="settings-figma-option-grid settings-figma-option-grid-2x2">
          <button className="settings-figma-option-chip" type="button">15 Mins</button>
          <button className="settings-figma-option-chip is-active" type="button">Hourly</button>
          <button className="settings-figma-option-chip" type="button">Daily</button>
          <button className="settings-figma-option-chip" type="button">Manual Only</button>
        </div>
      </div>
      <button
        className="settings-figma-accent-button"
        disabled={syncNowMutation.isPending}
        onClick={() => syncNowMutation.mutate()}
        type="button"
      >
        {syncNowMutation.isPending ? 'Syncing…' : 'Sync Now'}
      </button>
      <p className="settings-figma-muted-footnote">
        {diagnostics
          ? `Last successful sync: ${
              lastSuccessfulSyncTimestamp
                ? formatSettingsTimestamp(lastSuccessfulSyncTimestamp)
                : 'Pending live diagnostics'
            }`
          : 'Last successful sync: Pending live diagnostics'}
      </p>
      <SettingsReadOnlyField
        label="Deployment Blockers"
        value={getDeploymentBlockerSummary(diagnostics)}
      />
      <SettingsReadOnlyField
        label="Recommended Actions"
        value={getRecommendedActionSummary(diagnostics)}
      />
      {diagnostics?.deploymentBlockers.length ? (
        <div className="settings-figma-vertical-gap">
          {diagnostics.deploymentBlockers.map((blocker) => (
            <div className="settings-figma-note-row" key={blocker.id}>
              <span className="settings-figma-icon-chip">!</span>
              <span>{blocker.detail}</span>
            </div>
          ))}
        </div>
      ) : null}
      {diagnostics?.recommendedActions.length ? (
        <div className="settings-figma-vertical-gap">
          {diagnostics.recommendedActions.map((action) => (
            <div className="settings-figma-note-row" key={action.id}>
              <span className="settings-figma-icon-chip">→</span>
              <span>
                {action.detail}
                {action.command ? (
                  <>
                    {' '}Run <code>{action.command}</code>.
                  </>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {diagnostics && (!diagnostics.bakkiCore.configured || !diagnostics.bakkiCore.ok) ? (
        <p className="settings-figma-muted-footnote">
          Bakki Core is not configured in this environment, so sync checks Odoo connectivity only and does not persist local mirrors.
        </p>
      ) : null}
      {diagnostics?.bakkiCore.missingFields?.length ? (
        <p className="settings-figma-muted-footnote">
          Missing Bakki Core vars: {diagnostics.bakkiCore.missingFields.join(', ')}
        </p>
      ) : null}
      {syncNowMutation.error ? (
        <p className="settings-figma-muted-footnote">
          Sync failed: {syncNowMutation.error.message}
        </p>
      ) : null}
      {syncNowMutation.data ? (
        <p className="settings-figma-muted-footnote">
          {syncNowMutation.data.message} Users synced: {syncNowMutation.data.users.synced}/{syncNowMutation.data.users.fetched}. Tasks synced: {syncNowMutation.data.tasks.synced}/{syncNowMutation.data.tasks.fetched}.
        </p>
      ) : null}
    </SurfaceCard>
  );
}

export function FieldMappingSection() {
  return (
    <section className="settings-figma-block">
      <div className="settings-figma-block-head">
        <div>
          <h2>Field Mapping</h2>
          <p>Defining data flow between Tectonic Ranch and Odoo models.</p>
        </div>
        <button className="settings-figma-inline-link" type="button">+ Add Custom Mapping</button>
      </div>
      <SurfaceCard as="article" className="settings-figma-surface settings-figma-table-card">
        <div className="settings-figma-table-head settings-figma-table-head-mapping">
          <div>Tectonic Ranch Attribute</div>
          <div />
          <div>Odoo Model / Field</div>
          <div>Status</div>
          <div />
        </div>
        {ODOO_FIELD_MAPPINGS.map((row) => (
          <div className="settings-figma-table-row settings-figma-table-row-mapping" key={row.attribute}>
            <div className="settings-figma-mapping-main">
              <span className="settings-figma-icon-badge">◎</span>
              <div>
                <strong>{row.attribute}</strong>
                <span>{row.detail}</span>
              </div>
            </div>
            <div className="settings-figma-mapping-arrow">⇄</div>
            <div className="settings-figma-mono-value">{row.odooField}</div>
            <div>
              <span className={`settings-figma-status-pill${row.status === 'Pending' ? ' is-pending' : ' is-active'}`}>{row.status}</span>
            </div>
            <button className="settings-figma-row-action" type="button">✎</button>
          </div>
        ))}
      </SurfaceCard>
    </section>
  );
}
