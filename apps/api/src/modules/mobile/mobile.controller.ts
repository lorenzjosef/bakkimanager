import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { OwnerOnly } from '../../common/decorators';
import { getRequestSessionToken } from '../auth/auth.service';
import { MobileService } from './mobile.service';
import { ReviewDraftDto, SyncDraftsDto } from './dto';

/**
 * Mobile API endpoints for the Bakki mobile field app.
 *
 * These endpoints support offline-first mobile operation:
 * - Bootstrap: bulk data fetch for offline cache initialization
 * - Sync: upload captured area drafts
 * - Draft review: owner-only approval workflow (also used by desktop)
 */
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  // ============================================================================
  // Mobile App Endpoints
  // ============================================================================

  /**
   * Get bootstrap data for initial mobile sync.
   *
   * Returns all data needed to initialize the offline cache:
   * - User profile
   * - Assigned tasks
   * - Ranch, zone, and area geometry
   * - User's draft areas
   */
  @Get('bootstrap')
  getBootstrap(@Req() request: Request) {
    return this.mobileService.getBootstrap(getRequestSessionToken(request));
  }

  /**
   * Sync area drafts from mobile.
   *
   * Accepts an array of drafts captured offline and validates them
   * server-side. Returns per-draft results indicating success/failure.
   */
  @Post('area-drafts/sync')
  syncDrafts(@Body() body: SyncDraftsDto, @Req() request: Request) {
    return this.mobileService.syncDrafts(getRequestSessionToken(request), body);
  }

  // ============================================================================
  // Draft Review Endpoints (Owner-only, used by desktop)
  // ============================================================================

  /**
   * List all pending drafts awaiting review.
   */
  @OwnerOnly()
  @Get('area-drafts/pending')
  getPendingDrafts() {
    return this.mobileService.getPendingDrafts();
  }

  /**
   * Get a specific draft by ID.
   */
  @OwnerOnly()
  @Get('area-drafts/:draftId')
  getDraft(@Param('draftId') draftId: string) {
    return this.mobileService.getDraft(draftId);
  }

  /**
   * Review a draft (approve or reject).
   */
  @OwnerOnly()
  @Patch('area-drafts/:draftId/review')
  reviewDraft(
    @Param('draftId') draftId: string,
    @Body() body: ReviewDraftDto,
    @Req() request: Request,
  ) {
    return this.mobileService.reviewDraft(
      draftId,
      getRequestSessionToken(request),
      body.approved,
      body.notes,
    );
  }

  /**
   * Promote an approved draft to a real area.
   */
  @OwnerOnly()
  @Post('area-drafts/:draftId/promote')
  promoteDraft(@Param('draftId') draftId: string) {
    return this.mobileService.promoteDraft(draftId);
  }

  /**
   * Delete a draft (only if not promoted).
   */
  @OwnerOnly()
  @Delete('area-drafts/:draftId')
  deleteDraft(@Param('draftId') draftId: string) {
    return this.mobileService.deleteDraft(draftId);
  }
}
