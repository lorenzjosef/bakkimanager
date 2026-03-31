import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { BakkiTaskTemplateService } from '../../bakki-core/bakki-task-template.service';
import { BakkiTreeSurveyService } from '../../bakki-core/bakki-tree-survey.service';
import { BakkiSpeciesService } from '../../bakki-core/bakki-species.service';
import { BakkiUserMirrorService } from '../../bakki-core/bakki-user-mirror.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { parseTrailingNumericId } from '../users/user-identity.helpers';
import type { SyncDraftsDto } from './dto';
import { validateGeoJsonGeometry } from '../../common/validation';

const DEFAULT_BOOTSTRAP_LIMIT = 250;
const MAX_BOOTSTRAP_LIMIT = 1000;

interface BootstrapQueryOptions {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class MobileService {
  private readonly logger = new Logger(MobileService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly bakkiAreaDraft: BakkiAreaDraftService,
    private readonly bakkiAreaMetrics: BakkiAreaMetricsService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiTaskMirror: BakkiTaskMirrorService,
    private readonly bakkiTaskTemplates: BakkiTaskTemplateService,
    private readonly bakkiTreeSurvey: BakkiTreeSurveyService,
    private readonly bakkiSpecies: BakkiSpeciesService,
    private readonly bakkiUsers: BakkiUserMirrorService,
  ) {}

  /**
   * Get bootstrap data for initial mobile sync.
   * Returns user, tasks, geometry, and draft data.
   */
  async getBootstrap(
    sessionToken: string,
    options?: BootstrapQueryOptions,
  ): Promise<MobileBootstrapResponse> {
    // Get session and user
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.user) {
      throw new Error('Invalid session');
    }

    const user = session.user;

    // Verify mobile access is enabled for this user
    if (!user.mobileAccessEnabled) {
      throw new ForbiddenException('Mobile access is not enabled for this account');
    }

    const userId = parseTrailingNumericId(user.id);
    if (!userId) {
      throw new Error('Invalid session user reference');
    }

    // Fetch all data in parallel
    const [
      tasks,
      ranchFeatureCollection,
      zoneSummaries,
      areaFeatureCollection,
      drafts,
      areaCatalog,
      templateSummaries,
      speciesRecords,
      userRecords,
    ] = await Promise.all([
      this.bakkiTaskMirror.listTasksForMobile(userId),
      this.bakkiGeometry.getRanchGeometryFeatureCollection(),
      this.bakkiGeometry.listZoneSummaries(),
      this.bakkiGeometry.getAreaGeometryFeatureCollection(),
      this.bakkiAreaDraft.getDraftsByUser(userId),
      this.bakkiGeometry.listAreas(),
      this.bakkiTaskTemplates.listActive(),
      this.bakkiSpecies.isConfigured() ? this.bakkiSpecies.listSpecies() : Promise.resolve([]),
      this.bakkiUsers.isConfigured() ? this.bakkiUsers.listUsers() : Promise.resolve([]),
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
    const templateMap = new Map(
      templateSummaries.map((template) => [template.templateRef, template]),
    );
    const speciesMap = new Map(
      speciesRecords.map((species) => [species.speciesRef, species]),
    );
    const reviewerMap = new Map(
      userRecords.map((record) => [record.id, record.displayName]),
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
    const allBootstrapTasks: MobileBootstrapTask[] = tasks.map((t) => ({
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
      youtubeUrl: t.templateRef ? (templateMap.get(t.templateRef)?.youtubeUrl ?? null) : null,
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
    const allBootstrapZones: MobileBootstrapZone[] = zoneSummaries.map((z) => {
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
    const allBootstrapAreas: MobileBootstrapArea[] = areaFeatureCollection.features.map((f) => {
      const metrics = metricsMap.get(String(f.id));
      const zone = zoneMap.get(f.properties.zoneRef);
      const assignedSpeciesRef = areaCatalog.get(String(f.id))?.assignedSpeciesRef ?? null;
      const species = assignedSpeciesRef ? speciesMap.get(assignedSpeciesRef) : null;
      return {
        id: String(f.id),
        name: f.properties.name,
        zoneId: f.properties.zoneRef,
        zoneName: zone?.name ?? '',
        hectaresTotal: f.properties.hectaresEstimate ?? 0,
        density: metrics?.currentDensityPer100Sqm ?? null,
        speciesId: assignedSpeciesRef,
        speciesName: species?.commonName ?? null,
        geometry: f.geometry as import('@bakki/domain').GeoJsonGeometry,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Transform drafts
    const allBootstrapDrafts: MobileBootstrapDraft[] = drafts.map((d) => ({
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
      reviewerName: d.reviewerUserId ? (reviewerMap.get(d.reviewerUserId) ?? null) : null,
      reviewedAt: d.reviewedAt,
      rejectionReason: d.reviewerNotes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    const limit = normalizeBootstrapLimit(options?.limit);
    const offset = parseBootstrapOffset(options?.cursor);
    const nextOffset = offset + limit;

    const bootstrapTasks = allBootstrapTasks.slice(offset, nextOffset);
    const bootstrapZones = allBootstrapZones.slice(offset, nextOffset);
    const bootstrapAreas = allBootstrapAreas.slice(offset, nextOffset);
    const bootstrapDrafts = allBootstrapDrafts.slice(offset, nextOffset);
    const hasMore = nextOffset < Math.max(
      allBootstrapTasks.length,
      allBootstrapZones.length,
      allBootstrapAreas.length,
      allBootstrapDrafts.length,
    );

    return {
      user: bootstrapUser,
      tasks: bootstrapTasks,
      ranch: bootstrapRanch,
      zones: bootstrapZones,
      areas: bootstrapAreas,
      drafts: bootstrapDrafts,
      page: {
        cursor: hasMore ? encodeBootstrapOffset(nextOffset) : null,
        hasMore,
        limit,
      },
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

    // Verify mobile access is enabled for this user
    if (!session.user.mobileAccessEnabled) {
      throw new ForbiddenException('Mobile access is not enabled for this account');
    }

    const userId = parseTrailingNumericId(session.user.id);
    if (!userId) {
      throw new Error('Invalid session user reference');
    }
    const results: MobileSyncDraftResult[] = [];

    for (const draft of body.drafts) {
      try {
        validateGeoJsonGeometry(draft.geometry, ['Polygon', 'MultiPolygon']);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid geometry';
        results.push({
          localId: draft.localId,
          serverId: null,
          success: false,
          error: message,
          validationErrors: [message],
        });
        continue;
      }

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

    await this.auditService.recordEvent({
      actor: session.user.id,
      message: `Synced ${results.filter((r) => r.success).length}/${results.length} mobile drafts`,
      payload: {
        failed: results.filter((item) => !item.success).length,
        synced: results.filter((item) => item.success).length,
        total: results.length,
      },
      targetModel: 'bakki_area_draft',
      type: 'mobile.drafts.sync',
    });

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

    const userId = parseTrailingNumericId(session.user.id);
    if (!userId) {
      throw new Error('Invalid session user reference');
    }
    const draft = await this.bakkiAreaDraft.reviewDraft({
      draftRef,
      reviewerUserId: userId,
      approved,
      notes,
    });

    await this.auditService.recordEvent({
      actor: session.user.id,
      message: approved
        ? `Approved mobile draft ${draftRef}`
        : `Rejected mobile draft ${draftRef}`,
      payload: {
        approved,
        notes: notes ?? null,
        reviewerUserId: userId,
      },
      targetModel: 'bakki_area_draft',
      type: 'mobile.drafts.review',
    });

    return draft;
  }

  /**
   * Promote an approved draft to a real area.
   */
  async promoteDraft(draftRef: string, sessionToken: string) {
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.user) {
      throw new Error('Invalid session');
    }
    const areaRef = await this.bakkiAreaDraft.promoteDraft(draftRef);
    await this.auditService.recordEvent({
      actor: session.user.id,
      message: `Promoted mobile draft ${draftRef} to area ${areaRef}`,
      payload: {
        areaRef,
        draftRef,
      },
      targetModel: 'bakki_area_draft',
      type: 'mobile.drafts.promote',
    });
    return areaRef;
  }

  /**
   * Delete a draft.
   */
  async deleteDraft(draftRef: string, sessionToken: string) {
    const { session } = await this.authService.getSession(sessionToken);
    if (!session?.user) {
      throw new Error('Invalid session');
    }
    const deleted = await this.bakkiAreaDraft.deleteDraft(draftRef);
    if (deleted) {
      await this.auditService.recordEvent({
        actor: session.user.id,
        message: `Deleted mobile draft ${draftRef}`,
        payload: {
          draftRef,
        },
        targetModel: 'bakki_area_draft',
        type: 'mobile.drafts.delete',
      });
    }
    return deleted;
  }
}

function normalizeBootstrapLimit(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_BOOTSTRAP_LIMIT;
  }
  return Math.max(1, Math.min(MAX_BOOTSTRAP_LIMIT, Math.floor(value)));
}

function parseBootstrapOffset(cursor?: string) {
  if (!cursor) {
    return 0;
  }
  const decoded = Buffer.from(cursor, 'base64').toString('utf8');
  const value = Number.parseInt(decoded.replace('offset:', ''), 10);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function encodeBootstrapOffset(offset: number) {
  return Buffer.from(`offset:${offset}`, 'utf8').toString('base64');
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
