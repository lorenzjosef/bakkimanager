import { Injectable, Logger } from '@nestjs/common';
import type {
  MobileBootstrapArea,
  MobileBootstrapDraft,
  MobileBootstrapRanch,
  MobileBootstrapResponse,
  MobileBootstrapTask,
  MobileBootstrapUser,
  MobileBootstrapZone,
  MobileSyncDraftsResponse,
  MobileSyncDraftResult,
} from '@bakki/domain';
import { BakkiAreaDraftService } from '../../bakki-core/bakki-area-draft.service';
import { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import { BakkiTaskMirrorService } from '../../bakki-core/bakki-task-mirror.service';
import { AuthService } from '../auth/auth.service';
import type { SyncDraftsDto } from './dto';

@Injectable()
export class MobileService {
  private readonly logger = new Logger(MobileService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly bakkiAreaDraft: BakkiAreaDraftService,
    private readonly bakkiAreaMetrics: BakkiAreaMetricsService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiTaskMirror: BakkiTaskMirrorService,
  ) {}

  /**
   * Get bootstrap data for initial mobile sync.
   * Returns user, tasks, geometry, and draft data.
   */
  async getBootstrap(sessionToken: string): Promise<MobileBootstrapResponse> {
    // Get session and user
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.user) {
      throw new Error('Invalid session');
    }

    const user = session.user;
    const userId = parseInt(user.id, 10);

    // Fetch all data in parallel
    const [
      tasks,
      ranchFeatureCollection,
      zoneSummaries,
      areaFeatureCollection,
      drafts,
    ] = await Promise.all([
      this.bakkiTaskMirror.listTasksForMobile(userId),
      this.bakkiGeometry.getRanchGeometryFeatureCollection(),
      this.bakkiGeometry.listZoneSummaries(),
      this.bakkiGeometry.getAreaGeometryFeatureCollection(),
      this.bakkiAreaDraft.getDraftsByUser(userId),
    ]);

    // Get zone geometry separately
    const zoneFeatureCollection = await this.bakkiGeometry.getZoneGeometryFeatureCollection();

    // Build zone lookup
    const zoneMap = new Map(
      zoneSummaries.map((z) => [z.id, z]),
    );
    const zoneGeometryMap = new Map(
      zoneFeatureCollection.features.map((f) => [f.id, f]),
    );

    // Get area metrics
    const zoneRefs = zoneSummaries.map((z) => z.id);
    const areaMetrics = await this.bakkiAreaMetrics.listByZoneRefs(zoneRefs);
    const metricsMap = new Map(
      areaMetrics.map((m) => [m.areaRef, m]),
    );

    // Transform user
    const bootstrapUser: MobileBootstrapUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      mobileAccessEnabled: user.mobileAccessEnabled,
      activePlantingPhaseId: user.activePlantingPhaseId,
    };

    // Transform tasks
    const bootstrapTasks: MobileBootstrapTask[] = tasks.map((t) => ({
      id: t.taskRef,
      type: t.type ?? 'general',
      title: t.title,
      description: t.description ?? null,
      workflowState: t.workflowState,
      priority: t.priority,
      dueDate: t.dueDate ?? null,
      areaId: t.areaRef ?? null,
      areaName: t.areaName ?? null,
      zoneId: t.zoneRef ?? null,
      zoneName: t.zoneName ?? null,
      assigneeId: t.assigneeUserId ? String(t.assigneeUserId) : null,
      assigneeName: t.assigneeUsername ?? null,
      templateId: t.templateRef ?? null,
      youtubeUrl: null, // TODO: Add when template data is available
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    // Transform ranch
    let bootstrapRanch: MobileBootstrapRanch | null = null;
    const ranchFeature = ranchFeatureCollection.features[0];
    if (ranchFeature) {
      // Calculate bounding box from geometry
      const geometry = ranchFeature.geometry as import('@bakki/domain').GeoJsonGeometry;
      const bbox = calculateBoundingBox(geometry);
      
      bootstrapRanch = {
        id: String(ranchFeature.id),
        name: ranchFeature.properties.name,
        geometry,
        boundingBox: bbox,
      };
    }

    // Transform zones
    const bootstrapZones: MobileBootstrapZone[] = zoneSummaries.map((z) => {
      const feature = zoneGeometryMap.get(z.id);
      return {
        id: z.id,
        name: z.name,
        ranchId: 'ranch',
        hectaresEstimate: feature?.properties.hectaresEstimate ?? 0,
        geometry: (feature?.geometry ?? null) as import('@bakki/domain').GeoJsonGeometry,
        status: 'active' as const,
      };
    });

    // Transform areas
    const bootstrapAreas: MobileBootstrapArea[] = areaFeatureCollection.features.map((f) => {
      const metrics = metricsMap.get(String(f.id));
      const zone = zoneMap.get(f.properties.zoneRef);
      return {
        id: String(f.id),
        name: f.properties.name,
        zoneId: f.properties.zoneRef,
        zoneName: zone?.name ?? '',
        hectaresTotal: f.properties.hectaresEstimate ?? 0,
        density: metrics?.currentDensityPer100Sqm ?? null,
        speciesId: null, // TODO: Add species
        speciesName: null,
        geometry: f.geometry as import('@bakki/domain').GeoJsonGeometry,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Transform drafts
    const bootstrapDrafts: MobileBootstrapDraft[] = drafts.map((d) => ({
      serverId: d.draftRef,
      name: d.draftName,
      zoneId: d.zoneRef,
      zoneName: d.zoneName ?? '',
      geometry: d.boundaryGeometry as import('@bakki/domain').GeoJsonGeometry,
      hectaresTotal: d.areaHectaresEstimate ?? 0,
      captureMethod: d.captureMethod,
      averageGpsAccuracy: d.averageGpsAccuracy,
      syncStatus: d.syncStatus,
      syncError: d.syncErrorMessage,
      reviewStatus: d.reviewStatus,
      reviewerName: null, // TODO: Add reviewer lookup
      reviewedAt: d.reviewedAt,
      rejectionReason: d.reviewerNotes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return {
      user: bootstrapUser,
      tasks: bootstrapTasks,
      ranch: bootstrapRanch,
      zones: bootstrapZones,
      areas: bootstrapAreas,
      drafts: bootstrapDrafts,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Sync drafts from mobile.
   */
  async syncDrafts(
    sessionToken: string,
    body: SyncDraftsDto,
  ): Promise<MobileSyncDraftsResponse> {
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.user) {
      throw new Error('Invalid session');
    }

    const userId = parseInt(session.user.id, 10);
    const results: MobileSyncDraftResult[] = [];

    for (const draft of body.drafts) {
      const result = await this.bakkiAreaDraft.syncDraft({
        draftRef: draft.localId,
        zoneRef: draft.zoneId,
        creatorUserId: userId,
        boundaryGeometry: draft.geometry,
        rawCapturePoints: draft.rawCapturePoints,
        captureMethod: draft.captureMethod,
        averageGpsAccuracy: draft.averageGpsAccuracy,
        devicePlatform: draft.deviceInfo.platform,
        deviceOsVersion: draft.deviceInfo.osVersion,
        appVersion: draft.deviceInfo.appVersion,
        draftName: draft.name,
      });

      results.push({
        localId: draft.localId,
        serverId: result.serverId ?? null,
        success: result.success,
        error: result.error,
        validationErrors: result.validationErrors,
      });
    }

    this.logger.log(
      `Synced ${results.length} drafts for user ${userId}: ${results.filter((r) => r.success).length} successful`,
    );

    return {
      results,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Get all pending drafts (for owner review on desktop).
   */
  async getPendingDrafts() {
    return this.bakkiAreaDraft.getPendingDrafts();
  }

  /**
   * Get a specific draft by reference.
   */
  async getDraft(draftRef: string) {
    return this.bakkiAreaDraft.getDraftByRef(draftRef);
  }

  /**
   * Review a draft (approve/reject).
   */
  async reviewDraft(
    draftRef: string,
    sessionToken: string,
    approved: boolean,
    notes?: string,
  ) {
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.user) {
      throw new Error('Invalid session');
    }

    const userId = parseInt(session.user.id, 10);

    return this.bakkiAreaDraft.reviewDraft({
      draftRef,
      reviewerUserId: userId,
      approved,
      notes,
    });
  }

  /**
   * Promote an approved draft to a real area.
   */
  async promoteDraft(draftRef: string) {
    return this.bakkiAreaDraft.promoteDraft(draftRef);
  }

  /**
   * Delete a draft.
   */
  async deleteDraft(draftRef: string) {
    return this.bakkiAreaDraft.deleteDraft(draftRef);
  }
}

/**
 * Calculate a bounding box from a GeoJSON geometry.
 */
function calculateBoundingBox(geometry: import('@bakki/domain').GeoJsonGeometry): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  function processCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;

    // If this is a [lng, lat] pair
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const lng = coords[0];
      const lat = coords[1];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      return;
    }

    // Otherwise recurse into nested arrays
    for (const item of coords) {
      processCoords(item);
    }
  }

  processCoords(geometry.coordinates);

  // Handle case where no valid coordinates were found
  if (!Number.isFinite(minLat)) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  return { minLat, maxLat, minLng, maxLng };
}
