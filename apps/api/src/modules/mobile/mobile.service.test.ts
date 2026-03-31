import assert from 'node:assert/strict';
import test from 'node:test';
import type { RecordAuditEventInput } from '../audit/audit.service';
import { MobileService } from './mobile.service';

function createMobileService() {
  const auditEvents: RecordAuditEventInput[] = [];
  const reviewCalls: Array<{ approved: boolean; draftRef: string; notes?: string; reviewerUserId: number }> = [];
  const syncCalls: Array<{ creatorUserId: number; draftRef: string }> = [];
  const promoteCalls: string[] = [];
  const deleteCalls: string[] = [];

  const service = new MobileService(
    {
      getSession: async () => ({
        session: {
          user: {
            id: 'user-profile-42',
            username: 'owner.user',
            displayName: 'Owner User',
            role: 'owner',
            mobileAccessEnabled: true,
            canResetCredentials: true,
            activePlantingPhaseId: null,
          },
        },
      }),
    } as never,
    {
      recordEvent: async (event: RecordAuditEventInput) => {
        auditEvents.push(event);
      },
    } as never,
    {
      deleteDraft: async (draftRef: string) => {
        deleteCalls.push(draftRef);
        return true;
      },
      getDraftByRef: async () => null,
      getDraftsByUser: async () => [],
      getPendingDrafts: async () => [],
      promoteDraft: async (draftRef: string) => {
        promoteCalls.push(draftRef);
        return 'area-123';
      },
      reviewDraft: async (input: { approved: boolean; draftRef: string; notes?: string; reviewerUserId: number }) => {
        reviewCalls.push(input);
        return {
          draftRef: input.draftRef,
          reviewStatus: input.approved ? 'approved' : 'rejected',
        };
      },
      syncDraft: async (input: { creatorUserId: number; draftRef: string }) => {
        syncCalls.push(input);
        return {
          draftRef: input.draftRef,
          success: true,
          serverId: input.draftRef,
        };
      },
    } as never,
    {
      listByZoneRefs: async () => [],
    } as never,
    {
      getAreaGeometryFeatureCollection: async () => ({ features: [] }),
      getRanchGeometryFeatureCollection: async () => ({ features: [] }),
      getZoneGeometryFeatureCollection: async () => ({ features: [] }),
      listZoneSummaries: async () => [],
    } as never,
    {
      listTasksForMobile: async () => [],
    } as never,
    {
      listActive: async () => [],
    } as never,
    {
      isConfigured: () => false,
    } as never,
    {
      isConfigured: () => false,
      listSpecies: async () => [],
    } as never,
    {
      isConfigured: () => false,
      listUsers: async () => [],
    } as never,
  );

  return {
    auditEvents,
    deleteCalls,
    promoteCalls,
    reviewCalls,
    service,
    syncCalls,
  };
}

test('syncDrafts uses numeric user ID from session and writes sync audit event', async () => {
  const { service, syncCalls, auditEvents } = createMobileService();

  await service.syncDrafts('session-token', {
    drafts: [
      {
        localId: 'draft-1',
        name: 'Draft 1',
        zoneId: 'zone-1',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-23.48, 65.84],
            [-23.46, 65.84],
            [-23.46, 65.86],
            [-23.48, 65.84],
          ]],
        },
        rawCapturePoints: [],
        captureMethod: 'point_by_point',
        averageGpsAccuracy: 4,
        deviceInfo: {
          platform: 'android',
          osVersion: '14',
          appVersion: '1.0.0',
        },
      },
    ],
  });

  assert.equal(syncCalls[0]?.creatorUserId, 42);
  assert.equal(auditEvents[0]?.type, 'mobile.drafts.sync');
  assert.equal(auditEvents[0]?.actor, 'user-profile-42');
});

test('reviewDraft uses numeric reviewer ID from session and writes review audit event', async () => {
  const { service, reviewCalls, auditEvents } = createMobileService();

  await service.reviewDraft('draft-1', 'session-token', false, 'Bad shape');

  assert.equal(reviewCalls[0]?.reviewerUserId, 42);
  assert.equal(auditEvents[0]?.type, 'mobile.drafts.review');
  assert.equal(auditEvents[0]?.actor, 'user-profile-42');
});

test('promoteDraft and deleteDraft audit with the acting session user', async () => {
  const { service, promoteCalls, deleteCalls, auditEvents } = createMobileService();

  const promotedAreaRef = await service.promoteDraft('draft-promote', 'session-token');
  const deleted = await service.deleteDraft('draft-delete', 'session-token');

  assert.equal(promotedAreaRef, 'area-123');
  assert.equal(deleted, true);
  assert.deepEqual(promoteCalls, ['draft-promote']);
  assert.deepEqual(deleteCalls, ['draft-delete']);
  assert.equal(auditEvents[0]?.type, 'mobile.drafts.promote');
  assert.equal(auditEvents[0]?.actor, 'user-profile-42');
  assert.equal(auditEvents[1]?.type, 'mobile.drafts.delete');
  assert.equal(auditEvents[1]?.actor, 'user-profile-42');
});

test('getBootstrap enriches youtubeUrl, species and reviewer names', async () => {
  const service = new MobileService(
    {
      getSession: async () => ({
        session: {
          user: {
            id: 'user-profile-42',
            username: 'owner.user',
            displayName: 'Owner User',
            role: 'owner',
            mobileAccessEnabled: true,
            canResetCredentials: true,
            activePlantingPhaseId: null,
          },
        },
      }),
    } as never,
    {
      recordEvent: async () => undefined,
    } as never,
    {
      getDraftByRef: async () => null,
      getDraftsByUser: async () => [
        {
          appVersion: '1.0.0',
          areaHectaresEstimate: 1.25,
          averageGpsAccuracy: 4,
          boundaryGeometry: { type: 'Polygon', coordinates: [] },
          captureMethod: 'point_by_point',
          createdAt: new Date().toISOString(),
          creatorUserId: 42,
          creatorUsername: 'owner.user',
          deviceOsVersion: '17',
          devicePlatform: 'ios',
          draftName: 'Draft 1',
          draftRef: 'draft-1',
          promotedAreaRef: null,
          promotedAt: null,
          reviewStatus: 'approved',
          reviewedAt: new Date().toISOString(),
          reviewerNotes: null,
          reviewerUserId: 99,
          syncErrorMessage: null,
          syncStatus: 'synced',
          syncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          zoneName: 'Zone A',
          zoneRef: 'zone-1',
        },
      ],
      getPendingDrafts: async () => [],
      promoteDraft: async () => 'area-123',
      reviewDraft: async () => null,
      syncDraft: async () => ({ draftRef: 'draft-1', success: true, serverId: 'draft-1' }),
    } as never,
    {
      listByZoneRefs: async () => [{ areaRef: 'area-1', currentDensityPer100Sqm: 110 }],
    } as never,
    {
      getAreaGeometryFeatureCollection: async () => ({
        features: [
          {
            id: 'area-1',
            geometry: { type: 'Polygon', coordinates: [] },
            properties: { name: 'Area 1', zoneRef: 'zone-1', hectaresEstimate: 12.5 },
          },
        ],
      }),
      getRanchGeometryFeatureCollection: async () => ({ features: [] }),
      getZoneGeometryFeatureCollection: async () => ({
        features: [{ id: 'zone-1', geometry: { type: 'Polygon', coordinates: [] }, properties: { hectaresEstimate: 100 } }],
      }),
      listAreas: async () =>
        new Map([
          ['area-1', { areaRef: 'area-1', areaName: 'Area 1', assignedSpeciesRef: 'sitka-spruce', zoneRef: 'zone-1' }],
        ]),
      listZoneSummaries: async () => [{ id: 'zone-1', name: 'Zone A' }],
    } as never,
    {
      listTasksForMobile: async () => [
        {
          areaName: 'Area 1',
          areaRef: 'area-1',
          assigneeUserId: 42,
          assigneeUsername: 'owner.user',
          createdAt: new Date().toISOString(),
          description: 'Task description',
          dueDate: null,
          priority: '2',
          taskRef: 'task-1',
          templateRef: 'tpl-1',
          title: 'Task 1',
          type: 'monitoring',
          updatedAt: new Date().toISOString(),
          workflowState: 'pending',
          zoneName: 'Zone A',
          zoneRef: 'zone-1',
        },
      ],
    } as never,
    {
      listActive: async () => [
        {
          checklistItemCount: 1,
          defaultPriority: 2,
          description: 'Template description',
          label: 'Template 1',
          taskType: 'monitoring',
          templateRef: 'tpl-1',
          youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
        },
      ],
    } as never,
    {
      isConfigured: () => true,
    } as never,
    {
      isConfigured: () => true,
      listSpecies: async () => [
        {
          commonName: 'Sitka spruce',
          speciesRef: 'sitka-spruce',
        },
      ],
    } as never,
    {
      isConfigured: () => true,
      listUsers: async () => [
        {
          displayName: 'Reviewer User',
          id: 99,
        },
      ],
    } as never,
  );

  const bootstrap = await service.getBootstrap('session-token');

  assert.equal(bootstrap.tasks[0]?.youtubeUrl, 'https://www.youtube.com/watch?v=abc123');
  assert.equal(bootstrap.areas[0]?.speciesId, 'sitka-spruce');
  assert.equal(bootstrap.areas[0]?.speciesName, 'Sitka spruce');
  assert.equal(bootstrap.drafts[0]?.reviewerName, 'Reviewer User');
  assert.equal(bootstrap.page.hasMore, false);
  assert.equal(bootstrap.page.cursor, null);
});
