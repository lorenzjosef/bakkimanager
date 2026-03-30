/**
 * Mobile-specific domain types for Bakki mobile app.
 *
 * These types support the offline-first mobile field app for
 * area capture and task viewing.
 */

// ============================================================================
// Area Draft Capture
// ============================================================================

/**
 * How an area boundary was captured on mobile.
 */
export type CaptureMethod = 'boundary_walk' | 'point_by_point';

/**
 * Sync status for drafts (client-side).
 */
export type DraftSyncStatus =
  | 'local' // Created locally, not yet synced
  | 'queued' // Queued for sync
  | 'syncing' // Currently syncing
  | 'synced' // Successfully synced to server
  | 'failed' // Sync failed, needs retry
  | 'rejected'; // Server rejected (validation failed)

/**
 * Review status for drafts (server-side workflow).
 */
export type DraftReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * A GPS point captured during area boundary capture.
 */
export interface CapturedPoint {
  latitude: number;
  longitude: number;
  accuracy: number; // GPS accuracy in meters
  timestamp: string; // ISO 8601 timestamp
}

/**
 * Device metadata captured with a draft.
 */
export interface DraftDeviceInfo {
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
}

// ============================================================================
// Mobile API Payloads
// ============================================================================

/**
 * Request body for syncing area drafts from mobile.
 */
export interface MobileSyncDraftsRequest {
  drafts: MobileDraftPayload[];
}

/**
 * A single draft in a sync request.
 */
export interface MobileDraftPayload {
  localId: string;
  name: string;
  zoneId: string;
  geometry: GeoJsonGeometry;
  rawCapturePoints: CapturedPoint[];
  captureMethod: CaptureMethod;
  averageGpsAccuracy: number;
  deviceInfo: DraftDeviceInfo;
}

/**
 * Response from the sync endpoint.
 */
export interface MobileSyncDraftsResponse {
  results: MobileSyncDraftResult[];
  serverTime: string;
}

/**
 * Result for a single draft in the sync response.
 */
export interface MobileSyncDraftResult {
  localId: string;
  serverId: string | null;
  success: boolean;
  error?: string;
  validationErrors?: string[];
}

/**
 * Bootstrap payload for initial mobile sync.
 */
export interface MobileBootstrapResponse {
  user: MobileBootstrapUser;
  tasks: MobileBootstrapTask[];
  ranch: MobileBootstrapRanch | null;
  zones: MobileBootstrapZone[];
  areas: MobileBootstrapArea[];
  drafts: MobileBootstrapDraft[];
  serverTime: string;
}

export interface MobileBootstrapUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  mobileAccessEnabled: boolean;
  activePlantingPhaseId: string | null;
}

export interface MobileBootstrapTask {
  id: string;
  type: string;
  title: string;
  description: string | null;
  workflowState: string;
  priority: string;
  dueDate: string | null;
  areaId: string | null;
  areaName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  templateId: string | null;
  youtubeUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobileBootstrapRanch {
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

export interface MobileBootstrapZone {
  id: string;
  name: string;
  ranchId: string;
  hectaresEstimate: number;
  geometry: GeoJsonGeometry;
  status: 'active' | 'inactive';
}

export interface MobileBootstrapArea {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  hectaresTotal: number;
  density: number | null;
  speciesId: string | null;
  speciesName: string | null;
  geometry: GeoJsonGeometry;
  createdAt: string;
  updatedAt: string;
}

export interface MobileBootstrapDraft {
  serverId: string;
  name: string;
  zoneId: string;
  zoneName: string;
  geometry: GeoJsonGeometry;
  hectaresTotal: number;
  captureMethod: CaptureMethod;
  averageGpsAccuracy: number;
  syncStatus: 'synced' | 'rejected';
  syncError: string | null;
  reviewStatus: DraftReviewStatus;
  reviewerName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GeoJSON Types (re-export for convenience)
// ============================================================================

import type { GeoJsonGeometry, GeoJsonFeature, GeoJsonFeatureCollection } from './map';

export type { GeoJsonGeometry, GeoJsonFeature, GeoJsonFeatureCollection };
