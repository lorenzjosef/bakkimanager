/**
 * Hook for managing offline data sync with server.
 */

import { useCallback, useEffect } from 'react';
import { useOfflineStore, type CachedTask, type CachedZone, type CachedArea, type CachedRanch, type AreaDraft } from '@bakki/mobile-offline';
import { useAuthStore } from '../store';
import { mobileApi } from '../api';
import type { MobileBootstrapResponse } from '@bakki/domain';

/**
 * Convert bootstrap response to cached entities.
 */
function convertBootstrapToCache(data: MobileBootstrapResponse) {
  // Convert tasks
  const tasksMap: Record<string, CachedTask> = {};
  for (const task of data.tasks) {
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
      assigneeId: task.assigneeId ? parseInt(task.assigneeId, 10) : null,
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
      syncStatus: draft.syncStatus === 'synced' ? 'synced' : 'failed',
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

export function useOfflineSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const {
    isOnline,
    bootstrapSyncStatus,
    bootstrapError,
    lastBootstrapAt,
    setOnlineStatus,
    tasks,
    ranch,
    zones,
    areas,
    drafts,
  } = useOfflineStore();

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
      // Fetch bootstrap data
      const data = await mobileApi.getBootstrap();

      // Convert to cached format
      const {
        tasksMap,
        cachedRanch,
        zonesMap,
        areasMap,
        draftsMap,
        userProfile,
      } = convertBootstrapToCache(data);

      // Update store
      useOfflineStore.setState({
        tasks: tasksMap,
        ranch: cachedRanch,
        zones: zonesMap,
        areas: areasMap,
        drafts: draftsMap,
        userProfile,
        lastBootstrapAt: data.serverTime,
        bootstrapSyncStatus: 'fresh',
        bootstrapError: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      useOfflineStore.setState({
        bootstrapSyncStatus: 'error',
        bootstrapError: message,
      });
    }
  }, [isAuthenticated]);

  /**
   * Trigger sync on login if needed.
   */
  useEffect(() => {
    if (isAuthenticated && isOnline && bootstrapSyncStatus === 'stale') {
      syncData();
    }
  }, [isAuthenticated, isOnline, bootstrapSyncStatus, syncData]);

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
