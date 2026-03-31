import type { BakkiWorkflowState } from './tasks';
import type { MediaUploadStatus } from './media';

export interface MirrorSyncHealthSummary {
  errorCount: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  okCount: number;
  retryingCount: number;
  total: number;
}

export interface OdooConnectionHealth {
  baseUrl: string | null;
  checkedAt: string;
  configured: boolean;
  credentialSource: 'environment' | 'api_keys_file' | 'missing';
  database: string | null;
  message: string;
  reachable: boolean;
}

export interface BakkiCoreConnectionHealth {
  appliedMigrationCount: number | null;
  checkedAt: string;
  configured: boolean;
  connectionMode: 'connection_string' | 'field_set' | 'missing';
  database: string | null;
  host: string | null;
  migrationTablePresent: boolean | null;
  message: string;
  missingFields: string[];
  ok: boolean;
  port: number | null;
  postgisAvailable: boolean | null;
  postgisVersion: string | null;
  serverVersion: string | null;
}

export interface GeometrySeedValidationStatus {
  checkedAt: string;
  containmentFailureCount: number;
  containmentFailures: string[];
  message: string;
  overlapPairCount: number;
  overlapPairs: Array<[string, string]>;
  overrideEnabled: boolean;
  promotable: boolean;
  seedGeneratedAt: string;
  zonesWithinRanch: boolean;
}

export interface GeometryPersistenceSummary {
  areaCount: number;
  ranchCount: number;
  zoneCount: number;
}

export interface WeatherProviderHealth {
  available: boolean;
  checkedAt: string;
  conditionsCopy: string | null;
  conditionsValue: string | null;
  message: string;
  provider: 'open-meteo';
}

export interface MobileDraftDiagnosticsSummary {
  configured: boolean;
  failedValidationCount: number;
  lastReviewedAt: string | null;
  lastSyncedAt: string | null;
  pendingReviewCount: number;
  promotedCount: number;
  rejectedCount: number;
  syncedCount: number;
  totalDrafts: number;
}

export interface DeploymentBlocker {
  detail: string;
  id: string;
  label: string;
}

export interface RecommendedAction {
  command: string | null;
  detail: string;
  id: string;
  label: string;
}

export interface IntegrationHealthLogItem {
  detail: string;
  id: string;
  label: string;
  timeLabel: string;
  tone: 'neutral' | 'success' | 'warning';
}

export interface OdooTaskStageMappingDiagnostic {
  fold: boolean;
  id: number;
  name: string;
  projectCount: number;
  sequence: number | null;
  workflowState: BakkiWorkflowState;
}

export interface OdooTaskSyncReadiness {
  checkedAt: string;
  configured: boolean;
  defaultProject: {
    id: number;
    name: string | null;
  } | null;
  message: string;
  missingWorkflowStates: BakkiWorkflowState[];
  stageCounts: Record<BakkiWorkflowState, number>;
  stageMappings: OdooTaskStageMappingDiagnostic[];
  writeReady: boolean;
}

export interface OdooMirrorSyncRunSection {
  failed: number;
  fetched: number;
  synced: number;
}

export interface OdooMirrorSyncRunResult {
  completedAt: string;
  message: string;
  startedAt: string;
  tasks: OdooMirrorSyncRunSection;
  users: OdooMirrorSyncRunSection;
}

export interface BakkiCoreMigrationRunResult {
  appliedMigrations: string[];
  completedAt: string;
  configured: boolean;
  message: string;
  skippedMigrations: string[];
  startedAt: string;
}

export interface BakkiCoreBootstrapRunResult {
  appliedMigrations: string[];
  completedAt: string;
  configured: boolean;
  geometryPersistence: GeometryPersistenceSummary;
  geometrySeed: GeometrySeedValidationStatus;
  message: string;
  seededAreaMetricsCount: number;
  seededSpeciesCount: number;
  seededTaskTemplateCount: number;
  seededZoneCount: number;
  skippedMigrations: string[];
  startedAt: string;
}

export interface OdooTaskWriteProbeResult {
  completedAt: string;
  finalStageName: string | null;
  message: string;
  mirroredTaskId: number | null;
  probeTaskId: number | null;
  startedAt: string;
  taskTitle: string | null;
}

export interface OdooTaskSyncProvisionResult {
  completedAt: string;
  createdProject: {
    id: number;
    name: string | null;
  } | null;
  createdStages: Array<{
    id: number;
    name: string;
    workflowState: BakkiWorkflowState;
  }>;
  message: string;
  startedAt: string;
}

export interface MediaSigningProbeResult {
  assetUrl: string | null;
  bucketBaseUrl: string | null;
  bucketReachable: boolean | null;
  bucketStatusCode: number | null;
  completedAt: string;
  configured: boolean;
  expiresAt: string | null;
  message: string;
  objectKey: string | null;
  startedAt: string;
  uploadUrlGenerated: boolean;
}

export interface MediaUploadProbeResult {
  cleanupSucceeded: boolean | null;
  completedAt: string;
  configured: boolean;
  headStatusCode: number | null;
  message: string;
  objectKey: string | null;
  startedAt: string;
  uploadStatusCode: number | null;
  uploaded: boolean;
  verifiedReadable: boolean | null;
}

export interface SettingsOdooDiagnostics {
  bakkiCore: BakkiCoreConnectionHealth;
  checkedAt: string;
  deploymentBlockers: DeploymentBlocker[];
  geometryPersistence: GeometryPersistenceSummary;
  geometrySeed: GeometrySeedValidationStatus;
  media: MediaUploadStatus;
  mobile: MobileDraftDiagnosticsSummary;
  mirrors: {
    tasks: MirrorSyncHealthSummary;
    users: MirrorSyncHealthSummary;
  };
  odoo: OdooConnectionHealth;
  recommendedActions: RecommendedAction[];
  successRatePercent: number | null;
  syncHistory: IntegrationHealthLogItem[];
  taskSync: OdooTaskSyncReadiness;
  weather: WeatherProviderHealth;
}
