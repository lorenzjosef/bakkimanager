import { Injectable, Logger } from '@nestjs/common';
import type { CaptureMethod, DraftReviewStatus, GeoJsonGeometry } from '@bakki/domain';
import { BakkiCoreService } from './bakki-core.service';
import { BakkiGeometryService } from './bakki-geometry.service';
import { ensureSchemaInitialized } from './schema-init.utils';

// ============================================================================
// Types
// ============================================================================

export interface AreaDraftRecord {
  draftRef: string;
  zoneRef: string;
  zoneName: string | null;
  creatorUserId: number;
  creatorUsername: string | null;
  boundaryGeometry: GeoJsonGeometry | null;
  areaHectaresEstimate: number | null;
  captureMethod: CaptureMethod;
  averageGpsAccuracy: number;
  devicePlatform: string | null;
  deviceOsVersion: string | null;
  appVersion: string | null;
  syncStatus: 'synced' | 'rejected';
  syncErrorMessage: string | null;
  syncedAt: string;
  reviewStatus: DraftReviewStatus;
  reviewerUserId: number | null;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  promotedAreaRef: string | null;
  promotedAt: string | null;
  draftName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAreaDraftInput {
  draftRef: string;
  zoneRef: string;
  creatorUserId: number;
  boundaryGeometry: GeoJsonGeometry;
  rawCapturePoints: CapturedPoint[];
  captureMethod: CaptureMethod;
  averageGpsAccuracy: number;
  devicePlatform?: string;
  deviceOsVersion?: string;
  appVersion?: string;
  draftName: string;
}

export interface CapturedPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export interface SyncDraftResult {
  draftRef: string;
  success: boolean;
  serverId?: string;
  error?: string;
  validationErrors?: string[];
}

export interface ReviewDraftInput {
  draftRef: string;
  reviewerUserId: number;
  approved: boolean;
  notes?: string;
}

export interface AreaDraftDiagnosticsSummary {
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

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class BakkiAreaDraftService {
  private readonly logger = new Logger(BakkiAreaDraftService.name);
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(
    private readonly bakkiCore: BakkiCoreService,
    private readonly bakkiGeometry: BakkiGeometryService,
  ) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  /**
   * Get all drafts for a specific user.
   */
  async getDraftsByUser(userId: number): Promise<AreaDraftRecord[]> {
    await this.ensureSchema();

    const result = await this.bakkiCore.query<AreaDraftRow>(
      `
        select
          d.draft_ref,
          d.zone_ref,
          z.name as zone_name,
          d.creator_user_id,
          u.login as creator_username,
          ST_AsGeoJSON(d.boundary_geometry)::json as boundary_geometry,
          d.area_hectares_estimate,
          d.capture_method,
          d.average_gps_accuracy,
          d.device_platform,
          d.device_os_version,
          d.app_version,
          d.sync_status,
          d.sync_error_message,
          d.synced_at,
          d.review_status,
          d.reviewer_user_id,
          d.reviewer_notes,
          d.reviewed_at,
          d.promoted_area_ref,
          d.promoted_at,
          d.draft_name,
          d.created_at,
          d.updated_at
        from bakki_area_draft d
        left join bakki_zone z on z.zone_ref = d.zone_ref
        left join bakki_user u on u.id = d.creator_user_id
        where d.creator_user_id = $1
        order by d.created_at desc
      `,
      [userId],
    );

    return result.rows.map(mapDraftRow);
  }

  /**
   * Get all drafts pending review (for owners).
   */
  async getPendingDrafts(): Promise<AreaDraftRecord[]> {
    await this.ensureSchema();

    const result = await this.bakkiCore.query<AreaDraftRow>(
      `
        select
          d.draft_ref,
          d.zone_ref,
          z.name as zone_name,
          d.creator_user_id,
          u.login as creator_username,
          ST_AsGeoJSON(d.boundary_geometry)::json as boundary_geometry,
          d.area_hectares_estimate,
          d.capture_method,
          d.average_gps_accuracy,
          d.device_platform,
          d.device_os_version,
          d.app_version,
          d.sync_status,
          d.sync_error_message,
          d.synced_at,
          d.review_status,
          d.reviewer_user_id,
          d.reviewer_notes,
          d.reviewed_at,
          d.promoted_area_ref,
          d.promoted_at,
          d.draft_name,
          d.created_at,
          d.updated_at
        from bakki_area_draft d
        left join bakki_zone z on z.zone_ref = d.zone_ref
        left join bakki_user u on u.id = d.creator_user_id
        where d.review_status = 'pending'
          and d.sync_status = 'synced'
        order by d.created_at asc
      `,
      [],
    );

    return result.rows.map(mapDraftRow);
  }

  /**
   * Get a draft by its reference.
   */
  async getDraftByRef(draftRef: string): Promise<AreaDraftRecord | null> {
    await this.ensureSchema();

    const result = await this.bakkiCore.query<AreaDraftRow>(
      `
        select
          d.draft_ref,
          d.zone_ref,
          z.name as zone_name,
          d.creator_user_id,
          u.login as creator_username,
          ST_AsGeoJSON(d.boundary_geometry)::json as boundary_geometry,
          d.area_hectares_estimate,
          d.capture_method,
          d.average_gps_accuracy,
          d.device_platform,
          d.device_os_version,
          d.app_version,
          d.sync_status,
          d.sync_error_message,
          d.synced_at,
          d.review_status,
          d.reviewer_user_id,
          d.reviewer_notes,
          d.reviewed_at,
          d.promoted_area_ref,
          d.promoted_at,
          d.draft_name,
          d.created_at,
          d.updated_at
        from bakki_area_draft d
        left join bakki_zone z on z.zone_ref = d.zone_ref
        left join bakki_user u on u.id = d.creator_user_id
        where d.draft_ref = $1
        limit 1
      `,
      [draftRef],
    );

    const row = result.rows[0];
    return row ? mapDraftRow(row) : null;
  }

  /**
   * Sync a draft from mobile. Creates or updates the draft.
   */
  async syncDraft(input: CreateAreaDraftInput): Promise<SyncDraftResult> {
    await this.ensureSchema();

    // Validate zone exists
    const zone = await this.bakkiGeometry.getZoneByRef(input.zoneRef);
    if (!zone) {
      return {
        draftRef: input.draftRef,
        success: false,
        error: 'Zone not found',
        validationErrors: [`Zone ${input.zoneRef} does not exist`],
      };
    }

    // Validate geometry
    const validationErrors = await this.validateDraftGeometry(
      input.boundaryGeometry,
      input.zoneRef,
    );

    const syncStatus = validationErrors.length > 0 ? 'rejected' : 'synced';
    const syncError = validationErrors.length > 0 ? validationErrors.join('; ') : null;

    try {
      // Convert GeoJSON to WKT for PostGIS
      const geometryJson = JSON.stringify(input.boundaryGeometry);

      const upsertResult = await this.bakkiCore.query(
        `
          insert into bakki_area_draft (
            draft_ref,
            zone_ref,
            creator_user_id,
            boundary_geometry,
            raw_capture_points,
            capture_method,
            average_gps_accuracy,
            device_platform,
            device_os_version,
            app_version,
            sync_status,
            sync_error_message,
            synced_at,
            draft_name
          ) values (
            $1, $2, $3,
            ST_SetSRID(ST_GeomFromGeoJSON($4), 4326),
            $5::jsonb,
            $6, $7, $8, $9, $10, $11, $12, now(), $13
          )
          on conflict (draft_ref)
          do update set
            zone_ref = excluded.zone_ref,
            boundary_geometry = excluded.boundary_geometry,
            raw_capture_points = excluded.raw_capture_points,
            capture_method = excluded.capture_method,
            average_gps_accuracy = excluded.average_gps_accuracy,
            device_platform = excluded.device_platform,
            device_os_version = excluded.device_os_version,
            app_version = excluded.app_version,
            sync_status = excluded.sync_status,
            sync_error_message = excluded.sync_error_message,
            synced_at = now(),
            draft_name = excluded.draft_name,
            updated_at = now()
          where bakki_area_draft.creator_user_id = excluded.creator_user_id
          returning creator_user_id
        `,
        [
          input.draftRef,
          input.zoneRef,
          input.creatorUserId,
          geometryJson,
          JSON.stringify(input.rawCapturePoints),
          input.captureMethod,
          input.averageGpsAccuracy,
          input.devicePlatform ?? null,
          input.deviceOsVersion ?? null,
          input.appVersion ?? null,
          syncStatus,
          syncError,
          input.draftName,
        ],
      );

      if (upsertResult.rowCount === 0) {
        this.logger.warn(
          `Rejected draft sync for ${input.draftRef}: creator mismatch for user ${input.creatorUserId}`,
        );
        return {
          draftRef: input.draftRef,
          success: false,
          error: 'Draft reference already exists for another user.',
          validationErrors: ['Draft reference conflict with another account'],
        };
      }

      this.logger.log(
        `Synced draft ${input.draftRef} for user ${input.creatorUserId}: ${syncStatus}`,
      );

      return {
        draftRef: input.draftRef,
        success: syncStatus === 'synced',
        serverId: input.draftRef,
        error: syncError ?? undefined,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync draft ${input.draftRef}: ${message}`);

      return {
        draftRef: input.draftRef,
        success: false,
        error: message,
      };
    }
  }

  /**
   * Review a draft (approve or reject).
   */
  async reviewDraft(input: ReviewDraftInput): Promise<AreaDraftRecord | null> {
    await this.ensureSchema();

    const draft = await this.getDraftByRef(input.draftRef);
    if (!draft) {
      return null;
    }

    if (draft.reviewStatus !== 'pending') {
      throw new Error(`Draft ${input.draftRef} is not pending review`);
    }

    const newStatus: DraftReviewStatus = input.approved ? 'approved' : 'rejected';

    await this.bakkiCore.query(
      `
        update bakki_area_draft
        set
          review_status = $1,
          reviewer_user_id = $2,
          reviewer_notes = $3,
          reviewed_at = now(),
          updated_at = now()
        where draft_ref = $4
      `,
      [newStatus, input.reviewerUserId, input.notes ?? null, input.draftRef],
    );

    this.logger.log(
      `Draft ${input.draftRef} ${newStatus} by user ${input.reviewerUserId}`,
    );

    return this.getDraftByRef(input.draftRef);
  }

  /**
   * Promote an approved draft to a real area.
   */
  async promoteDraft(draftRef: string): Promise<string> {
    await this.ensureSchema();

    const draft = await this.getDraftByRef(draftRef);
    if (!draft) {
      throw new Error(`Draft ${draftRef} not found`);
    }

    if (draft.reviewStatus !== 'approved') {
      throw new Error(`Draft ${draftRef} is not approved`);
    }

    if (draft.promotedAreaRef) {
      return draft.promotedAreaRef;
    }

    // Create the real area
    const areaRef = `area-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await this.bakkiCore.withClient(async (client) => {
      // Insert into bakki_area
      await client.query(
        `
          insert into bakki_area (
            area_ref,
            zone_ref,
            name,
            boundary_geometry,
            area_hectares_estimate,
            source_file_name
          )
          select
            $1,
            zone_ref,
            draft_name,
            ST_Multi(boundary_geometry),
            area_hectares_estimate,
            'mobile-capture'
          from bakki_area_draft
          where draft_ref = $2
        `,
        [areaRef, draftRef],
      );

      // Update draft with promotion info
      await client.query(
        `
          update bakki_area_draft
          set
            promoted_area_ref = $1,
            promoted_at = now(),
            updated_at = now()
          where draft_ref = $2
        `,
        [areaRef, draftRef],
      );
    });

    this.logger.log(`Promoted draft ${draftRef} to area ${areaRef}`);

    return areaRef;
  }

  /**
   * Delete a draft (only if not promoted).
   */
  async deleteDraft(draftRef: string): Promise<boolean> {
    await this.ensureSchema();

    const draft = await this.getDraftByRef(draftRef);
    if (!draft) {
      return false;
    }

    if (draft.promotedAreaRef) {
      throw new Error(`Cannot delete draft ${draftRef} - already promoted to area`);
    }

    await this.bakkiCore.query(
      `delete from bakki_area_draft where draft_ref = $1`,
      [draftRef],
    );

    this.logger.log(`Deleted draft ${draftRef}`);

    return true;
  }

  async getDiagnosticsSummary(): Promise<AreaDraftDiagnosticsSummary> {
    if (!this.bakkiCore.isConfigured()) {
      return {
        configured: false,
        failedValidationCount: 0,
        lastReviewedAt: null,
        lastSyncedAt: null,
        pendingReviewCount: 0,
        promotedCount: 0,
        rejectedCount: 0,
        syncedCount: 0,
        totalDrafts: 0,
      };
    }

    await this.ensureSchema();
    const result = await this.bakkiCore.query<{
      failed_validation_count: number | string;
      last_reviewed_at: Date | string | null;
      last_synced_at: Date | string | null;
      pending_review_count: number | string;
      promoted_count: number | string;
      rejected_count: number | string;
      synced_count: number | string;
      total_drafts: number | string;
    }>(
      `
        select
          count(*) as total_drafts,
          count(*) filter (where sync_status = 'synced') as synced_count,
          count(*) filter (where sync_status = 'rejected') as rejected_count,
          count(*) filter (where sync_status = 'rejected') as failed_validation_count,
          count(*) filter (where review_status = 'pending' and sync_status = 'synced') as pending_review_count,
          count(*) filter (where promoted_area_ref is not null) as promoted_count,
          max(synced_at) as last_synced_at,
          max(reviewed_at) as last_reviewed_at
        from bakki_area_draft
      `,
      [],
    );

    const row = result.rows[0];
    return {
      configured: true,
      failedValidationCount: row ? Number(row.failed_validation_count) : 0,
      lastReviewedAt: row?.last_reviewed_at ? formatDate(row.last_reviewed_at) : null,
      lastSyncedAt: row?.last_synced_at ? formatDate(row.last_synced_at) : null,
      pendingReviewCount: row ? Number(row.pending_review_count) : 0,
      promotedCount: row ? Number(row.promoted_count) : 0,
      rejectedCount: row ? Number(row.rejected_count) : 0,
      syncedCount: row ? Number(row.synced_count) : 0,
      totalDrafts: row ? Number(row.total_drafts) : 0,
    };
  }

  /**
   * Validate draft geometry against zone and sibling areas.
   */
  private async validateDraftGeometry(
    geometry: GeoJsonGeometry,
    zoneRef: string,
  ): Promise<string[]> {
    const errors: string[] = [];
    const geometryJson = JSON.stringify(geometry);

    try {
      // Check geometry is valid
      const validResult = await this.bakkiCore.query<{ valid: boolean }>(
        `select ST_IsValid(ST_GeomFromGeoJSON($1)) as valid`,
        [geometryJson],
      );
      if (!validResult.rows[0]?.valid) {
        errors.push('Geometry is not valid');
        return errors;
      }

      // Check draft is contained within zone
      const containedResult = await this.bakkiCore.query<{ contained: boolean }>(
        `
          select ST_Contains(
            z.boundary_geometry,
            ST_GeomFromGeoJSON($1)
          ) as contained
          from bakki_zone z
          where z.zone_ref = $2
        `,
        [geometryJson, zoneRef],
      );
      if (!containedResult.rows[0]?.contained) {
        errors.push('Draft boundary must be fully contained within the zone');
      }

      // Check for overlaps with existing areas (but not touching)
      const overlapResult = await this.bakkiCore.query<{ overlapping_area: string }>(
        `
          select a.area_ref as overlapping_area
          from bakki_area a
          where a.zone_ref = $1
            and ST_Overlaps(
              a.boundary_geometry,
              ST_GeomFromGeoJSON($2)
            )
          limit 5
        `,
        [zoneRef, geometryJson],
      );
      if (overlapResult.rows.length > 0) {
        const overlaps = overlapResult.rows.map((r) => r.overlapping_area).join(', ');
        errors.push(`Draft overlaps with existing areas: ${overlaps}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Geometry validation failed';
      errors.push(message);
    }

    return errors;
  }

  private async ensureSchema() {
    await ensureSchemaInitialized({
      getSchemaInitPromise: () => this.schemaInitPromise,
      initialize: () => this.ensureSchemaInternal(),
      isConfigured: this.bakkiCore.isConfigured(),
      schemaEnsured: this.schemaEnsured,
      setSchemaInitPromise: (promise) => {
        this.schemaInitPromise = promise;
      },
    });
  }

  private async ensureSchemaInternal() {
    // Ensure the area draft table exists
    await this.bakkiCore.query(`
      create table if not exists bakki_area_draft (
        id bigserial primary key,
        draft_ref text unique not null,
        zone_ref text not null,
        creator_user_id bigint not null,
        boundary_geometry geometry(Polygon, 4326),
        area_hectares_estimate numeric,
        raw_capture_points jsonb not null,
        capture_method text not null,
        average_gps_accuracy numeric not null,
        device_platform text,
        device_os_version text,
        app_version text,
        sync_status text not null default 'synced',
        sync_error_message text,
        synced_at timestamptz not null default now(),
        review_status text not null default 'pending',
        reviewer_user_id bigint,
        reviewer_notes text,
        reviewed_at timestamptz,
        promoted_area_ref text,
        promoted_at timestamptz,
        draft_name text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    // Indexes
    await this.bakkiCore.query(`
      create index if not exists bakki_area_draft_zone_ref_idx
      on bakki_area_draft (zone_ref)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_area_draft_creator_idx
      on bakki_area_draft (creator_user_id)
    `);
    await this.bakkiCore.query(`
      create index if not exists bakki_area_draft_review_status_idx
      on bakki_area_draft (review_status)
    `);

    // Trigger for auto-computing hectares
    await this.bakkiCore.query(`
      create or replace function bakki_area_draft_compute_hectares()
      returns trigger as $$
      begin
        if NEW.boundary_geometry is not null then
          NEW.area_hectares_estimate = ST_Area(NEW.boundary_geometry::geography) / 10000.0;
        end if;
        return NEW;
      end;
      $$ language plpgsql
    `);

    await this.bakkiCore.query(`
      drop trigger if exists bakki_area_draft_hectares_trigger on bakki_area_draft
    `);
    await this.bakkiCore.query(`
      create trigger bakki_area_draft_hectares_trigger
      before insert or update of boundary_geometry on bakki_area_draft
      for each row
      execute function bakki_area_draft_compute_hectares()
    `);

    // Trigger for auto-updating updated_at
    await this.bakkiCore.query(`
      create or replace function bakki_area_draft_updated_at()
      returns trigger as $$
      begin
        NEW.updated_at = now();
        return NEW;
      end;
      $$ language plpgsql
    `);

    await this.bakkiCore.query(`
      drop trigger if exists bakki_area_draft_updated_at_trigger on bakki_area_draft
    `);
    await this.bakkiCore.query(`
      create trigger bakki_area_draft_updated_at_trigger
      before update on bakki_area_draft
      for each row
      execute function bakki_area_draft_updated_at()
    `);

    this.schemaEnsured = true;
  }
}

// ============================================================================
// Row Mapping
// ============================================================================

interface AreaDraftRow {
  draft_ref: string;
  zone_ref: string;
  zone_name: string | null;
  creator_user_id: number | string;
  creator_username: string | null;
  boundary_geometry: GeoJsonGeometry | null;
  area_hectares_estimate: number | string | null;
  capture_method: string;
  average_gps_accuracy: number | string;
  device_platform: string | null;
  device_os_version: string | null;
  app_version: string | null;
  sync_status: string;
  sync_error_message: string | null;
  synced_at: Date | string;
  review_status: string;
  reviewer_user_id: number | string | null;
  reviewer_notes: string | null;
  reviewed_at: Date | string | null;
  promoted_area_ref: string | null;
  promoted_at: Date | string | null;
  draft_name: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapDraftRow(row: AreaDraftRow): AreaDraftRecord {
  return {
    draftRef: row.draft_ref,
    zoneRef: row.zone_ref,
    zoneName: row.zone_name,
    creatorUserId: Number(row.creator_user_id),
    creatorUsername: row.creator_username,
    boundaryGeometry: row.boundary_geometry,
    areaHectaresEstimate:
      row.area_hectares_estimate !== null ? Number(row.area_hectares_estimate) : null,
    captureMethod: row.capture_method as CaptureMethod,
    averageGpsAccuracy: Number(row.average_gps_accuracy),
    devicePlatform: row.device_platform,
    deviceOsVersion: row.device_os_version,
    appVersion: row.app_version,
    syncStatus: row.sync_status as 'synced' | 'rejected',
    syncErrorMessage: row.sync_error_message,
    syncedAt: formatDate(row.synced_at),
    reviewStatus: row.review_status as DraftReviewStatus,
    reviewerUserId: row.reviewer_user_id !== null ? Number(row.reviewer_user_id) : null,
    reviewerNotes: row.reviewer_notes,
    reviewedAt: row.reviewed_at ? formatDate(row.reviewed_at) : null,
    promotedAreaRef: row.promoted_area_ref,
    promotedAt: row.promoted_at ? formatDate(row.promoted_at) : null,
    draftName: row.draft_name,
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at),
  };
}

function formatDate(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}
