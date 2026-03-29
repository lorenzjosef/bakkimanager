import {
  useOdooDiagnosticsData,
  useRunBakkiCoreBootstrapMutation,
  useRunBakkiCoreMigrationsMutation,
  useRunMediaUploadProbeMutation,
  useRunMediaSigningProbeMutation,
  useProvisionOdooTaskSyncMutation,
  useRunOdooSyncNowMutation,
  useRunOdooTaskWriteProbeMutation,
} from '../queries/settings';
import {
  resolveLastSuccessfulSyncTimestamp,
} from './system-settings.page-utils';
import {
  BakkiCoreReadinessSection,
  DatabaseConnectionCard,
  FieldMappingSection,
  IntegrationsHealthCard,
  MediaProbeSection,
  SynchronizationCard,
  SyncHistorySection,
  TaskSyncReadinessSection,
  WeatherFeedSection,
} from './system-settings.odoo.sections';

export function OdooSettingsContent() {
  const diagnosticsQuery = useOdooDiagnosticsData();
  const diagnostics = diagnosticsQuery.data;
  const bakkiCoreBootstrapMutation = useRunBakkiCoreBootstrapMutation();
  const bakkiCoreMigrationMutation = useRunBakkiCoreMigrationsMutation();
  const mediaUploadProbeMutation = useRunMediaUploadProbeMutation();
  const mediaProbeMutation = useRunMediaSigningProbeMutation();
  const provisionTaskSyncMutation = useProvisionOdooTaskSyncMutation();
  const syncNowMutation = useRunOdooSyncNowMutation();
  const writeProbeMutation = useRunOdooTaskWriteProbeMutation();
  const lastSuccessfulSyncTimestamp = resolveLastSuccessfulSyncTimestamp(diagnostics);

  return (
    <div className="settings-figma-stack">
      <section className="settings-figma-block">
        <div className="settings-figma-block-head">
          <div>
            <h2>Odoo Settings</h2>
            <p>Connection, credentials, and field mapping for the live Odoo tenant.</p>
          </div>
        </div>
        <div className="settings-figma-odoo-top-grid">
          <DatabaseConnectionCard diagnostics={diagnostics} diagnosticsQuery={diagnosticsQuery} />
          <IntegrationsHealthCard diagnostics={diagnostics} diagnosticsQuery={diagnosticsQuery} />
        </div>
        <FieldMappingSection />
      </section>

      <section className="settings-figma-block">
        <div className="settings-figma-block-head">
          <div>
            <h2>Bakki Core Settings</h2>
            <p>Database readiness, geometry state, media storage, and backend runtime checks.</p>
          </div>
        </div>
        <div className="settings-figma-odoo-bottom-grid">
          <BakkiCoreReadinessSection
            bakkiCoreBootstrapMutation={bakkiCoreBootstrapMutation}
            bakkiCoreMigrationMutation={bakkiCoreMigrationMutation}
            diagnostics={diagnostics}
          />
          <MediaProbeSection
            diagnostics={diagnostics}
            mediaProbeMutation={mediaProbeMutation}
            mediaUploadProbeMutation={mediaUploadProbeMutation}
          />
          <WeatherFeedSection diagnostics={diagnostics} />
        </div>
      </section>

      <section className="settings-figma-block">
        <div className="settings-figma-block-head">
          <div>
            <h2>Sync Settings</h2>
            <p>Mirror sync controls, task-sync readiness, and recent synchronization history.</p>
          </div>
        </div>
        <div className="settings-figma-odoo-top-grid">
          <SynchronizationCard
            diagnostics={diagnostics}
            lastSuccessfulSyncTimestamp={lastSuccessfulSyncTimestamp}
            syncNowMutation={syncNowMutation}
          />
          <TaskSyncReadinessSection
            diagnostics={diagnostics}
            provisionTaskSyncMutation={provisionTaskSyncMutation}
            writeProbeMutation={writeProbeMutation}
          />
        </div>
        <div className="settings-figma-odoo-bottom-grid">
          <SyncHistorySection diagnostics={diagnostics} />
        </div>
      </section>
    </div>
  );
}
