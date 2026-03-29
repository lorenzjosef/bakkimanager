import {
  SettingsReadOnlyField,
  SurfaceCard,
} from '@bakki/ui';
import {
  buildGeometryPersistenceDetail,
  buildGeometrySeedDetail,
  getGeometryPersistenceStatusLabel,
  getGeometrySeedStatusLabel,
} from './system-settings.utils';
import {
  type BakkiCoreBootstrapMutation,
  type BakkiCoreMigrationMutation,
  type DiagnosticsData,
  type MediaProbeMutation,
  type MediaUploadProbeMutation,
  type ProvisionTaskSyncMutation,
  type WriteProbeMutation,
} from './system-settings.odoo.types';

export function BakkiCoreReadinessSection({
  bakkiCoreBootstrapMutation,
  bakkiCoreMigrationMutation,
  diagnostics,
}: {
  bakkiCoreBootstrapMutation: BakkiCoreBootstrapMutation;
  bakkiCoreMigrationMutation: BakkiCoreMigrationMutation;
  diagnostics: DiagnosticsData;
}) {
  return (
    <section className="settings-figma-block">
      <div className="settings-figma-block-head compact">
        <div><h2>Bakki Core Readiness</h2></div>
      </div>
      <SurfaceCard as="article" className="settings-figma-surface settings-figma-soft-surface settings-figma-vertical-gap">
        <div className="settings-figma-card-head-row">
          <div className="settings-figma-head-with-meta">
            <div className="settings-figma-head-row-inline">
              <h3>PostgreSQL / PostGIS</h3>
              <span className={`settings-figma-status-pill${diagnostics?.bakkiCore.configured && diagnostics?.bakkiCore.ok ? ' is-active' : ' is-pending'}`}>
                {diagnostics?.bakkiCore.configured && diagnostics?.bakkiCore.ok ? 'Connected' : 'Needs Config'}
              </span>
            </div>
            <p>{diagnostics?.bakkiCore.message || 'Checking Bakki Core database readiness.'}</p>
          </div>
        </div>
        <SettingsReadOnlyField label="Connection Mode" value={diagnostics?.bakkiCore.connectionMode || 'missing'} />
        <SettingsReadOnlyField label="Database" monospace value={diagnostics?.bakkiCore.database || 'Not configured'} />
        <SettingsReadOnlyField label="Host" monospace value={diagnostics?.bakkiCore.host || 'Not configured'} />
        <SettingsReadOnlyField label="Port" monospace value={diagnostics?.bakkiCore.port != null ? String(diagnostics.bakkiCore.port) : 'Not configured'} />
        <div className="settings-figma-field-grid settings-figma-field-grid-2">
          <SettingsReadOnlyField
            label="PostgreSQL Version"
            value={diagnostics?.bakkiCore.serverVersion || 'Unavailable'}
          />
          <SettingsReadOnlyField
            label="PostGIS"
            value={
              diagnostics?.bakkiCore.postgisAvailable
                ? diagnostics.bakkiCore.postgisVersion || 'Installed'
                : diagnostics?.bakkiCore.postgisAvailable === false
                  ? 'Missing'
                  : 'Unavailable'
            }
          />
        </div>
        <SettingsReadOnlyField
          label="Bakki Core Migrations"
          value={
            diagnostics?.bakkiCore.migrationTablePresent
              ? `${diagnostics.bakkiCore.appliedMigrationCount ?? 0} applied`
              : diagnostics?.bakkiCore.migrationTablePresent === false
                ? 'Table missing'
                : 'Unavailable'
          }
        />
        <SettingsReadOnlyField
          label="Persisted Geometry"
          value={getGeometryPersistenceStatusLabel(diagnostics?.geometryPersistence)}
        />
        <div className="settings-figma-field-grid settings-figma-field-grid-2">
          <SettingsReadOnlyField label="Persisted Ranches" value={String(diagnostics?.geometryPersistence.ranchCount ?? 0)} />
          <SettingsReadOnlyField label="Persisted Zones" value={String(diagnostics?.geometryPersistence.zoneCount ?? 0)} />
          <SettingsReadOnlyField label="Persisted Areas" value={String(diagnostics?.geometryPersistence.areaCount ?? 0)} />
        </div>
        <SettingsReadOnlyField
          label="Geometry Seed"
          value={getGeometrySeedStatusLabel(diagnostics?.geometrySeed)}
        />
        {diagnostics?.geometryPersistence ? (
          <p className="settings-figma-muted-footnote">
            {buildGeometryPersistenceDetail(diagnostics.geometryPersistence)}
          </p>
        ) : null}
        {diagnostics?.bakkiCore.missingFields?.length ? (
          <p className="settings-figma-muted-footnote">
            Missing Bakki Core vars: {diagnostics.bakkiCore.missingFields.join(', ')}
          </p>
        ) : null}
        {diagnostics?.geometrySeed ? (
          <p className="settings-figma-muted-footnote">
            {buildGeometrySeedDetail(diagnostics.geometrySeed)}
          </p>
        ) : null}
        <div className="settings-figma-actions-row">
          <button
            className="settings-figma-ghost-action"
            disabled={bakkiCoreBootstrapMutation.isPending || !diagnostics?.bakkiCore.configured}
            onClick={() => bakkiCoreBootstrapMutation.mutate()}
            type="button"
          >
            {bakkiCoreBootstrapMutation.isPending ? 'Bootstrapping…' : 'Run Bakki Core Bootstrap'}
          </button>
          <button
            className="settings-figma-primary-action"
            disabled={bakkiCoreMigrationMutation.isPending || !diagnostics?.bakkiCore.configured}
            onClick={() => bakkiCoreMigrationMutation.mutate()}
            type="button"
          >
            {bakkiCoreMigrationMutation.isPending ? 'Running Migrations…' : 'Run Bakki Core Migrations'}
          </button>
        </div>
        {bakkiCoreMigrationMutation.error ? (
          <p className="settings-figma-muted-footnote">
            Migration failed: {bakkiCoreMigrationMutation.error.message}
          </p>
        ) : null}
        {bakkiCoreBootstrapMutation.error ? (
          <p className="settings-figma-muted-footnote">
            Bootstrap failed: {bakkiCoreBootstrapMutation.error.message}
          </p>
        ) : null}
        {bakkiCoreMigrationMutation.data ? (
          <p className="settings-figma-muted-footnote">
            {bakkiCoreMigrationMutation.data.message}
            {bakkiCoreMigrationMutation.data.appliedMigrations.length > 0
              ? ` Applied: ${bakkiCoreMigrationMutation.data.appliedMigrations.join(', ')}.`
              : ''}
          </p>
        ) : null}
        {bakkiCoreBootstrapMutation.data ? (
          <p className="settings-figma-muted-footnote">
            {bakkiCoreBootstrapMutation.data.message}
            {` Zones: ${bakkiCoreBootstrapMutation.data.seededZoneCount}.`}
            {` Persisted ranches: ${bakkiCoreBootstrapMutation.data.geometryPersistence.ranchCount}.`}
            {` Persisted zones: ${bakkiCoreBootstrapMutation.data.geometryPersistence.zoneCount}.`}
            {` Persisted areas: ${bakkiCoreBootstrapMutation.data.geometryPersistence.areaCount}.`}
            {` Area metrics: ${bakkiCoreBootstrapMutation.data.seededAreaMetricsCount}.`}
            {` Templates: ${bakkiCoreBootstrapMutation.data.seededTaskTemplateCount}.`}
            {` Species: ${bakkiCoreBootstrapMutation.data.seededSpeciesCount}.`}
            {` Geometry seed: ${getGeometrySeedStatusLabel(bakkiCoreBootstrapMutation.data.geometrySeed).toLowerCase()}.`}
          </p>
        ) : null}
      </SurfaceCard>
    </section>
  );
}

export function TaskSyncReadinessSection({
  diagnostics,
  provisionTaskSyncMutation,
  writeProbeMutation,
}: {
  diagnostics: DiagnosticsData;
  provisionTaskSyncMutation: ProvisionTaskSyncMutation;
  writeProbeMutation: WriteProbeMutation;
}) {
  return (
    <section className="settings-figma-block">
      <div className="settings-figma-block-head compact">
        <div><h2>Task Sync Readiness</h2></div>
      </div>
      <SurfaceCard as="article" className="settings-figma-surface settings-figma-soft-surface settings-figma-vertical-gap">
        <div className="settings-figma-card-head-row">
          <div className="settings-figma-head-with-meta">
            <div className="settings-figma-head-row-inline">
              <h3>Odoo Project + Stage Mapping</h3>
              <span className={`settings-figma-status-pill${diagnostics?.taskSync.writeReady ? ' is-active' : ' is-pending'}`}>
                {diagnostics?.taskSync.writeReady ? 'Write Ready' : 'Review'}
              </span>
            </div>
            <p>
              {diagnostics?.taskSync.message
                || 'Checking whether the current Odoo project and stage configuration can support Bakki task writes.'}
            </p>
          </div>
        </div>
        <SettingsReadOnlyField
          label="Default Project"
          value={
            diagnostics?.taskSync.defaultProject
              ? `${diagnostics.taskSync.defaultProject.name || 'Unnamed Project'} (#${diagnostics.taskSync.defaultProject.id})`
              : 'Not resolved'
          }
        />
        <SettingsReadOnlyField
          label="Required Workflow States"
          value={
            diagnostics?.taskSync.missingWorkflowStates?.length
              ? `Missing: ${diagnostics.taskSync.missingWorkflowStates.join(', ')}`
              : 'pending, in_progress, and done are available'
          }
        />
        <div className="settings-figma-field-grid settings-figma-field-grid-2">
          <SettingsReadOnlyField label="Pending Stages" value={String(diagnostics?.taskSync.stageCounts.pending ?? 0)} />
          <SettingsReadOnlyField label="Active Stages" value={String(diagnostics?.taskSync.stageCounts.in_progress ?? 0)} />
          <SettingsReadOnlyField label="Done Stages" value={String(diagnostics?.taskSync.stageCounts.done ?? 0)} />
          <SettingsReadOnlyField label="Cancelled Stages" value={String(diagnostics?.taskSync.stageCounts.cancelled ?? 0)} />
        </div>
        <div className="settings-figma-note-row">
          <span className="settings-figma-icon-chip">!</span>
          <span>
            This probe creates a tagged task in the live Odoo tenant, syncs it into Bakki, then moves it through completion and cancellation stages when available.
          </span>
        </div>
        <div className="settings-figma-actions-row">
          <button
            className="settings-figma-ghost-action"
            disabled={provisionTaskSyncMutation.isPending}
            onClick={() => provisionTaskSyncMutation.mutate()}
            type="button"
          >
            {provisionTaskSyncMutation.isPending ? 'Provisioning…' : 'Provision Task Sync'}
          </button>
          <button
            className="settings-figma-primary-action"
            disabled={writeProbeMutation.isPending || !diagnostics?.taskSync.writeReady}
            onClick={() => writeProbeMutation.mutate()}
            type="button"
          >
            {writeProbeMutation.isPending ? 'Running Probe…' : 'Run Write Probe'}
          </button>
        </div>
        {writeProbeMutation.error ? (
          <p className="settings-figma-muted-footnote">
            Write probe failed: {writeProbeMutation.error.message}
          </p>
        ) : null}
        {provisionTaskSyncMutation.error ? (
          <p className="settings-figma-muted-footnote">
            Provisioning failed: {provisionTaskSyncMutation.error.message}
          </p>
        ) : null}
        {provisionTaskSyncMutation.data ? (
          <p className="settings-figma-muted-footnote">
            {provisionTaskSyncMutation.data.message}
            {provisionTaskSyncMutation.data.createdProject
              ? ` Project: ${provisionTaskSyncMutation.data.createdProject.name || 'Unnamed'} (#${provisionTaskSyncMutation.data.createdProject.id}).`
              : ''}
            {provisionTaskSyncMutation.data.createdStages.length > 0
              ? ` Stages: ${provisionTaskSyncMutation.data.createdStages.map((stage) => stage.name).join(', ')}.`
              : ''}
          </p>
        ) : null}
        {writeProbeMutation.data ? (
          <p className="settings-figma-muted-footnote">
            {writeProbeMutation.data.message} Task #{writeProbeMutation.data.probeTaskId ?? 'n/a'} final stage: {writeProbeMutation.data.finalStageName ?? 'unknown'}.
          </p>
        ) : null}
      </SurfaceCard>
    </section>
  );
}

export function MediaProbeSection({
  diagnostics,
  mediaProbeMutation,
  mediaUploadProbeMutation,
}: {
  diagnostics: DiagnosticsData;
  mediaProbeMutation: MediaProbeMutation;
  mediaUploadProbeMutation: MediaUploadProbeMutation;
}) {
  return (
    <section className="settings-figma-block">
      <div className="settings-figma-block-head compact">
        <div><h2>Media Signing Probe</h2></div>
      </div>
      <SurfaceCard as="article" className="settings-figma-surface settings-figma-soft-surface settings-figma-vertical-gap">
        <div className="settings-figma-card-head-row">
          <div className="settings-figma-head-with-meta">
            <div className="settings-figma-head-row-inline">
              <h3>Spaces Upload Signing</h3>
              <span className={`settings-figma-status-pill${diagnostics?.media.configured ? ' is-active' : ' is-pending'}`}>
                {diagnostics?.media.configured ? 'Configured' : 'Missing Config'}
              </span>
            </div>
            <p>
              Generates a real presigned upload URL and performs a non-destructive reachability check against the bucket endpoint.
            </p>
          </div>
        </div>
        <SettingsReadOnlyField label="Provider" value={diagnostics?.media.provider || 'digitalocean-spaces'} />
        <SettingsReadOnlyField label="Bucket" monospace value={diagnostics?.media.bucket || 'Not configured'} />
        <SettingsReadOnlyField label="Endpoint" monospace value={diagnostics?.media.endpoint || 'Not configured'} />
        {diagnostics?.media.missingFields?.length ? (
          <p className="settings-figma-muted-footnote">
            Missing Spaces vars: {diagnostics.media.missingFields.join(', ')}
          </p>
        ) : null}
        <div className="settings-figma-actions-row">
          <button
            className="settings-figma-primary-action"
            disabled={mediaProbeMutation.isPending || !diagnostics?.media.configured}
            onClick={() => mediaProbeMutation.mutate()}
            type="button"
          >
            {mediaProbeMutation.isPending ? 'Running Probe…' : 'Run Signing Probe'}
          </button>
        </div>
        {mediaProbeMutation.error ? (
          <p className="settings-figma-muted-footnote">
            Media probe failed: {mediaProbeMutation.error.message}
          </p>
        ) : null}
        {mediaProbeMutation.data ? (
          <>
            <SettingsReadOnlyField
              label="Bucket Reachability"
              value={
                mediaProbeMutation.data.bucketReachable === null
                  ? 'Not tested'
                  : mediaProbeMutation.data.bucketReachable
                    ? `Reachable (${mediaProbeMutation.data.bucketStatusCode ?? 'n/a'})`
                    : `Unreachable (${mediaProbeMutation.data.bucketStatusCode ?? 'n/a'})`
              }
            />
            <SettingsReadOnlyField
              label="Probe Object Key"
              monospace
              value={mediaProbeMutation.data.objectKey || 'n/a'}
            />
            <p className="settings-figma-muted-footnote">
              {mediaProbeMutation.data.message}
            </p>
          </>
        ) : null}
        <div className="settings-figma-note-row">
          <span className="settings-figma-icon-chip">!</span>
          <span>
            The upload probe performs a real signed upload of a tiny text file and then deletes it again. It does not create Bakki media metadata.
          </span>
        </div>
        <div className="settings-figma-actions-row">
          <button
            className="settings-figma-primary-action"
            disabled={mediaUploadProbeMutation.isPending || !diagnostics?.media.configured}
            onClick={() => mediaUploadProbeMutation.mutate()}
            type="button"
          >
            {mediaUploadProbeMutation.isPending ? 'Running Upload Probe…' : 'Run Upload Probe'}
          </button>
        </div>
        {mediaUploadProbeMutation.error ? (
          <p className="settings-figma-muted-footnote">
            Upload probe failed: {mediaUploadProbeMutation.error.message}
          </p>
        ) : null}
        {mediaUploadProbeMutation.data ? (
          <>
            <SettingsReadOnlyField
              label="Upload Result"
              value={
                mediaUploadProbeMutation.data.uploaded
                  ? `Uploaded (${mediaUploadProbeMutation.data.uploadStatusCode ?? 'n/a'})`
                  : `Failed (${mediaUploadProbeMutation.data.uploadStatusCode ?? 'n/a'})`
              }
            />
            <SettingsReadOnlyField
              label="Object Verification"
              value={
                mediaUploadProbeMutation.data.verifiedReadable === null
                  ? 'Not checked'
                  : mediaUploadProbeMutation.data.verifiedReadable
                    ? `Readable (${mediaUploadProbeMutation.data.headStatusCode ?? 'n/a'})`
                    : `Unreadable (${mediaUploadProbeMutation.data.headStatusCode ?? 'n/a'})`
              }
            />
            <SettingsReadOnlyField
              label="Cleanup"
              value={
                mediaUploadProbeMutation.data.cleanupSucceeded === null
                  ? 'Not attempted'
                  : mediaUploadProbeMutation.data.cleanupSucceeded
                    ? 'Cleaned up'
                    : 'Cleanup failed'
              }
            />
            <p className="settings-figma-muted-footnote">
              {mediaUploadProbeMutation.data.message}
            </p>
          </>
        ) : null}
      </SurfaceCard>
    </section>
  );
}
