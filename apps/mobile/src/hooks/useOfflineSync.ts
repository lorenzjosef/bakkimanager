/**
 * Hook for managing offline data sync with server.
 */

import { useCallback, useEffect } from 'react';
import { useOfflineStore, type CachedTask, type CachedZone, type CachedArea, type CachedRanch, type AreaDraft } from '@bakki/mobile-offline';
import { useAuthStore } from '../store';
import { mobileApi } from '../api';
import type { MobileBootstrapResponse } from '@bakki/domain';
import { getSessionToken } from '../api';

function assertBootstrapPayload(payload: unknown): asserts payload is MobileBootstrapResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid bootstrap payload: expected an object');
  }

  const candidate = payload as Partial<MobileBootstrapResponse>;
  if (!candidate.user || typeof candidate.user !== 'object') {
    throw new Error('Invalid bootstrap payload: missing user');
  }
  if (!Array.isArray(candidate.tasks)) {
    throw new Error('Invalid bootstrap payload: tasks must be an array');
  }
  if (!Array.isArray(candidate.zones)) {
    throw new Error('Invalid bootstrap payload: zones must be an array');
  }
  if (!Array.isArray(candidate.areas)) {
    throw new Error('Invalid bootstrap payload: areas must be an array');
  }
  if (!Array.isArray(candidate.drafts)) {
    throw new Error('Invalid bootstrap payload: drafts must be an array');
  }
  if (!candidate.page || typeof candidate.page !== 'object') {
    throw new Error('Invalid bootstrap payload: missing page');
  }
}

/**
 * Convert bootstrap response to cached entities.
 */
function convertBootstrapToCache(data: MobileBootstrapResponse) {
  // Convert tasks
  const tasksMap: Record<string, CachedTask> = {};
  for (const task of data.tasks) {
    // Safely parse assigneeId, handling invalid values
    let assigneeId: number | null = null;
    if (task.assigneeId) {
      const parsed = Number.parseInt(task.assigneeId, 10);
      assigneeId = Number.isNaN(parsed) ? null : parsed;
    }

    tasksMap[task.id] = {
      id: task.id,
      type: task.type as CachedTask['type'],
      title: task.title,
      description: task.description,
      workflowState: task.workflowState as CachedTask['workflowState'],
      priority: task.priority as CachedTask['priority'],
      dueDate: task.dueDate,
      areaId: task.areaId,
      areaName: task.areaName,
      zoneId: task.zoneId,
      zoneName: task.zoneName,
      assigneeId,
      assigneeName: task.assigneeName,
      templateId: task.templateId,
      templateName: null,
      youtubeUrl: task.youtubeUrl,
      checklistItemCount: 0,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  // Convert ranch
  const cachedRanch: CachedRanch | null = data.ranch
    ? {
        id: data.ranch.id,
        name: data.ranch.name,
        geometry: data.ranch.geometry,
        boundingBox: data.ranch.boundingBox,
      }
    : null;

  // Convert zones
  const zonesMap: Record<string, CachedZone> = {};
  for (const zone of data.zones) {
    zonesMap[zone.id] = {
      id: zone.id,
      name: zone.name,
      ranchId: zone.ranchId,
      hectaresEstimate: zone.hectaresEstimate,
      geometry: zone.geometry,
      status: zone.status,
    };
  }

  // Convert areas
  const areasMap: Record<string, CachedArea> = {};
  for (const area of data.areas) {
    areasMap[area.id] = {
      id: area.id,
      name: area.name,
      zoneId: area.zoneId,
      zoneName: area.zoneName,
      hectaresTotal: area.hectaresTotal,
      density: area.density,
      treeCount: null,
      speciesId: area.speciesId,
      speciesName: area.speciesName,
      geometry: area.geometry,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
    };
  }

  // Convert drafts
  const draftsMap: Record<string, AreaDraft> = {};
  for (const draft of data.drafts) {
    draftsMap[draft.serverId] = {
      localId: draft.serverId, // Use serverId as localId for synced drafts
      serverId: draft.serverId,
      name: draft.name,
      zoneId: draft.zoneId,
      zoneName: draft.zoneName,
      geometry: draft.geometry,
      hectaresTotal: draft.hectaresTotal,
      captureMethod: draft.captureMethod,
      rawCapturePoints: [],
      averageGpsAccuracy: draft.averageGpsAccuracy,
      deviceInfo: {
        platform: 'ios',
        osVersion: '',
        appVersion: '',
      },
      syncStatus: draft.syncStatus === 'rejected'
        ? 'rejected'
        : draft.syncStatus === 'synced'
          ? 'synced'
          : 'failed',
      syncError: draft.syncError,
      syncAttempts: 0,
      lastSyncAttemptAt: null,
      reviewStatus: draft.reviewStatus,
      reviewerName: draft.reviewerName,
      reviewedAt: draft.reviewedAt,
      rejectionReason: draft.rejectionReason,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  return {
    tasksMap,
    cachedRanch,
    zonesMap,
    areasMap,
    draftsMap,
    userProfile: {
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.displayName,
      role: data.user.role as 'owner' | 'planter',
      mobileAccessEnabled: data.user.mobileAccessEnabled,
      activePlantingPhaseId: data.user.activePlantingPhaseId,
    },
  };
}

function mergeDraftMaps(
  existingDrafts: Record<string, AreaDraft>,
  serverDrafts: Record<string, AreaDraft>,
): Record<string, AreaDraft> {
  const merged: Record<string, AreaDraft> = {};
  const remainingServerById = new Map(Object.values(serverDrafts).map((draft) => [draft.serverId, draft]));

  for (const [localId, draft] of Object.entries(existingDrafts)) {
    const shouldKeepLocalOnlyDraft = !draft.serverId
      || draft.syncStatus === 'local'
      || draft.syncStatus === 'queued'
      || draft.syncStatus === 'syncing'
      || draft.syncStatus === 'failed';

    if (shouldKeepLocalOnlyDraft) {
      merged[localId] = draft;
      continue;
    }

    if (draft.serverId) {
      const serverDraft = remainingServerById.get(draft.serverId);
      if (serverDraft) {
        merged[localId] = {
          ...serverDraft,
          localId,
          serverId: draft.serverId,
        };
        remainingServerById.delete(draft.serverId);
        continue;
      }
    }

    merged[localId] = draft;
  }

  for (const serverDraft of remainingServerById.values()) {
    merged[serverDraft.serverId ?? serverDraft.localId] = serverDraft;
  }

  return merged;
}

export function useOfflineSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const session = useAuthStore((s) => s.session);

  const isOnline = useOfflineStore((s) => s.isOnline);
  const bootstrapSyncStatus = useOfflineStore((s) => s.bootstrapSyncStatus);
  const bootstrapError = useOfflineStore((s) => s.bootstrapError);
  const lastBootstrapAt = useOfflineStore((s) => s.lastBootstrapAt);
  const setOnlineStatus = useOfflineStore((s) => s.setOnlineStatus);
  const setSyncSessionToken = useOfflineStore((s) => s.setSyncSessionToken);
  const tasks = useOfflineStore((s) => s.tasks);
  const ranch = useOfflineStore((s) => s.ranch);
  const zones = useOfflineStore((s) => s.zones);
  const areas = useOfflineStore((s) => s.areas);
  const drafts = useOfflineStore((s) => s.drafts);

  /**
   * Perform full data sync from server using bootstrap endpoint.
   */
  const syncData = useCallback(async () => {
    if (!isAuthenticated) return;

    useOfflineStore.setState({
      bootstrapSyncStatus: 'syncing',
      bootstrapError: null,
    });

    try {
      const pages: MobileBootstrapResponse[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      const pageLimit = 250;
      while (hasMore) {
        const page = await mobileApi.getBootstrapPage(pageLimit, cursor);
        assertBootstrapPayload(page);
        pages.push(page);
        hasMore = page.page.hasMore;
        cursor = page.page.cursor ?? undefined;
      }
      const data = mergeBootstrapPages(pages);
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        throw new Error('Mobile session token missing for sync.');
      }

      // Convert to cached format
      const {
        tasksMap,
        cachedRanch,
        zonesMap,
        areasMap,
        draftsMap,
        userProfile,
      } = convertBootstrapToCache(data);
      const existingDrafts = useOfflineStore.getState().drafts;
      const mergedDrafts = mergeDraftMaps(existingDrafts, draftsMap);

      // Update store
      useOfflineStore.setState({
        tasks: tasksMap,
        ranch: cachedRanch,
        zones: zonesMap,
        areas: areasMap,
        drafts: mergedDrafts,
        userProfile,
        lastBootstrapAt: data.serverTime,
        bootstrapSyncStatus: 'fresh',
        bootstrapError: null,
      });
      setSyncSessionToken(sessionToken);
      await useOfflineStore.getState().processSyncQueue();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      useOfflineStore.setState({
        bootstrapSyncStatus: 'error',
        bootstrapError: message,
      });
    }
  }, [isAuthenticated, setSyncSessionToken]);

  useEffect(() => {
    if (!isAuthenticated || !session) {
      setSyncSessionToken(null);
      return;
    }
    setSyncSessionToken(getSessionToken());
  }, [isAuthenticated, session, setSyncSessionToken]);

  /**
   * Trigger sync on login if needed.
   * Note: syncData is intentionally excluded from deps - we only want to trigger
   * on status changes, not when syncData reference changes. syncData uses current
   * store state internally.
   */
  useEffect(() => {
    if (isAuthenticated && isOnline && bootstrapSyncStatus === 'stale') {
      void syncData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isOnline, bootstrapSyncStatus]);

  return {
    isOnline,
    isSyncing: bootstrapSyncStatus === 'syncing',
    syncStatus: bootstrapSyncStatus,
    syncError: bootstrapError,
    lastSyncAt: lastBootstrapAt,
    hasCachedData: !!lastBootstrapAt && Object.keys(tasks).length > 0,
    taskCount: Object.keys(tasks).length,
    areaCount: Object.keys(areas).length,
    zoneCount: Object.keys(zones).length,
    draftCount: Object.keys(drafts).length,
    hasRanch: !!ranch,
    syncData,
    setOnlineStatus,
  };
}

function mergeBootstrapPages(pages: MobileBootstrapResponse[]): MobileBootstrapResponse {
  if (pages.length === 0) {
    throw new Error('Bootstrap returned no pages');
  }
  const [first, ...rest] = pages;
  const merged: MobileBootstrapResponse = {
    ...first,
    tasks: [...first.tasks],
    zones: [...first.zones],
    areas: [...first.areas],
    drafts: [...first.drafts],
    page: {
      cursor: null,
      hasMore: false,
      limit: first.page.limit,
    },
  };
  for (const page of rest) {
    merged.tasks.push(...page.tasks);
    merged.zones.push(...page.zones);
    merged.areas.push(...page.areas);
    merged.drafts.push(...page.drafts);
    merged.serverTime = page.serverTime;
  }
  return merged;
}
