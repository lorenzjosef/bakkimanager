/**
 * Mobile Offline Store Types
 *
 * Defines the shape of locally cached data for offline operation.
 */

import type {
  BakkiSessionUser,
  BakkiUserRole,
  BakkiTaskType,
  BakkiWorkflowState,
  BakkiTaskPriority,
  GeoJsonFeatureCollection,
  GeoJsonFeature,
  GeoJsonGeometry,
} from '@bakki/domain';

// ============================================================================
// Sync Metadata
// ============================================================================

export type SyncStatus = 'fresh' | 'stale' | 'syncing' | 'error';

export interface SyncMetadata {
  lastSyncAt: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
}

// ============================================================================
// User & Profile
// ============================================================================

export interface CachedUserProfile {
  id: string;
  username: string;
  displayName: string;
  role: BakkiUserRole;
  mobileAccessEnabled: boolean;
  activePlantingPhaseId: string | null;
}

// ============================================================================
// Tasks
// ============================================================================

export interface CachedTask {
  id: string;
  type: BakkiTaskType;
  title: string;
  description: string | null;
  workflowState: BakkiWorkflowState;
  priority: BakkiTaskPriority;
  dueDate: string | null;
  areaId: string | null;
  areaName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  templateId: string | null;
  templateName: string | null;
  youtubeUrl: string | null;
  checklistItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskSortField = 'dueDate' | 'priority' | 'createdAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface TaskFilters {
  workflowState?: BakkiWorkflowState[];
  type?: BakkiTaskType[];
  priority?: BakkiTaskPriority[];
  search?: string;
}

// ============================================================================
// Map & Geometry
// ============================================================================

export interface CachedRanch {
  id: string;
  name: string;
  geometry: GeoJsonGeometry;
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface CachedZone {
  id: string;
  name: string;
  ranchId: string;
  hectaresEstimate: number;
  geometry: GeoJsonGeometry;
  status: 'active' | 'inactive';
}

export interface CachedArea {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  hectaresTotal: number;
  density: number | null;
  treeCount: number | null;
  speciesId: string | null;
  speciesName: string | null;
  geometry: GeoJsonGeometry;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Area Drafts (Owner-only offline capture)
// ============================================================================

export type CaptureMethod = 'boundary_walk' | 'point_by_point';

export type DraftSyncStatus =
  | 'local' // Created locally, not yet queued
  | 'queued' // Ready to sync when online
  | 'syncing' // Currently syncing
  | 'synced' // Successfully synced to server
  | 'failed' // Sync failed, needs retry or user action
  | 'rejected'; // Server rejected the draft

export type DraftReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CapturedPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export interface AreaDraft {
  localId: string; // Client-generated UUID
  serverId: string | null; // Server ID after sync
  name: string;
  zoneId: string;
  zoneName: string;
  geometry: GeoJsonGeometry;
  hectaresTotal: number;
  captureMethod: CaptureMethod;
  rawCapturePoints: CapturedPoint[];
  averageGpsAccuracy: number;
  deviceInfo: {
    platform: 'ios' | 'android';
    osVersion: string;
    appVersion: string;
  };
  syncStatus: DraftSyncStatus;
  syncError: string | null;
  syncAttempts: number;
  lastSyncAttemptAt: string | null;
  reviewStatus: DraftReviewStatus;
  reviewerName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Bootstrap Payload (what comes from the server on initial sync)
// ============================================================================

export interface BootstrapPayload {
  user: CachedUserProfile;
  tasks: CachedTask[];
  ranch: CachedRanch | null;
  zones: CachedZone[];
  areas: CachedArea[];
  drafts: AreaDraft[];
  syncCursor: string;
  serverTime: string;
}

// ============================================================================
// Sync Queue
// ============================================================================

export interface SyncQueueItem {
  id: string;
  type: 'area_draft';
  payload: AreaDraft;
  createdAt: string;
  attempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
}

// ============================================================================
// Offline Store State
// ============================================================================

export interface OfflineStoreState {
  // Sync metadata
  isInitialized: boolean;
  isOnline: boolean;
  syncSessionToken: string | null;
  lastBootstrapAt: string | null;
  bootstrapSyncStatus: SyncStatus;
  bootstrapError: string | null;

  // Cached entities
  userProfile: CachedUserProfile | null;
  tasks: Record<string, CachedTask>;
  ranch: CachedRanch | null;
  zones: Record<string, CachedZone>;
  areas: Record<string, CachedArea>;
  drafts: Record<string, AreaDraft>;

  // Sync queue for outbound mutations
  syncQueue: SyncQueueItem[];
}

export interface OfflineStoreActions {
  // Initialization
  initialize: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  setSyncSessionToken: (token: string | null) => void;

  // Bootstrap sync
  bootstrap: (sessionToken: string) => Promise<void>;
  clearAllData: () => Promise<void>;

  // Task queries (read-only)
  getTask: (taskId: string) => CachedTask | undefined;
  getTasks: (
    filters?: TaskFilters,
    sort?: { field: TaskSortField; direction: SortDirection }
  ) => CachedTask[];
  getTasksByArea: (areaId: string) => CachedTask[];

  // Map data queries
  getRanch: () => CachedRanch | null;
  getZones: () => CachedZone[];
  getZone: (zoneId: string) => CachedZone | undefined;
  getAreas: () => CachedArea[];
  getArea: (areaId: string) => CachedArea | undefined;
  getAreasByZone: (zoneId: string) => CachedArea[];

  // Area drafts (owner-only)
  getDrafts: () => AreaDraft[];
  getDraft: (localId: string) => AreaDraft | undefined;
  getDraftsByZone: (zoneId: string) => AreaDraft[];
  createDraft: (
    draft: Omit<
      AreaDraft,
      | 'localId'
      | 'serverId'
      | 'syncStatus'
      | 'syncError'
      | 'syncAttempts'
      | 'lastSyncAttemptAt'
      | 'reviewStatus'
      | 'reviewerName'
      | 'reviewedAt'
      | 'rejectionReason'
      | 'createdAt'
      | 'updatedAt'
    >
  ) => Promise<AreaDraft>;
  updateDraft: (localId: string, updates: Partial<AreaDraft>) => void;
  deleteDraft: (localId: string) => Promise<void>;
  queueDraftForSync: (localId: string) => void;

  // Sync queue management
  processSyncQueue: () => Promise<void>;
  getSyncQueueStatus: () => {
    pending: number;
    failed: number;
    total: number;
  };
}

export type OfflineStore = OfflineStoreState & OfflineStoreActions;
