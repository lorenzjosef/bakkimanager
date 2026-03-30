/**
 * Offline Store - Zustand-based state management for offline-first mobile data.
 *
 * Provides cached access to tasks, map data, and area drafts with sync queue support.
 */

import { create } from 'zustand';
import type {
  OfflineStore,
  OfflineStoreState,
  CachedTask,
  CachedZone,
  CachedArea,
  AreaDraft,
  TaskFilters,
  TaskSortField,
  SortDirection,
  BootstrapPayload,
} from './types';
import { persistState, loadPersistedState, clearPersistedState } from './storage';

// Generate a simple UUID for local draft IDs
function generateLocalId(): string {
  return 'draft-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
}

const initialState: OfflineStoreState = {
  isInitialized: false,
  isOnline: true,
  lastBootstrapAt: null,
  bootstrapSyncStatus: 'stale',
  bootstrapError: null,
  userProfile: null,
  tasks: {},
  ranch: null,
  zones: {},
  areas: {},
  drafts: {},
  syncQueue: [],
};

export const useOfflineStore = create<OfflineStore>((set, get) => ({
  ...initialState,

  // ============================================================================
  // Initialization
  // ============================================================================

  initialize: async () => {
    const persisted = await loadPersistedState();
    if (persisted) {
      set({
        ...persisted,
        isInitialized: true,
        bootstrapSyncStatus: persisted.lastBootstrapAt ? 'stale' : 'stale',
      });
    } else {
      set({ isInitialized: true });
    }
  },

  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
    // Auto-trigger sync queue processing when coming online
    if (isOnline) {
      get().processSyncQueue();
    }
  },

  // ============================================================================
  // Bootstrap Sync
  // ============================================================================

  bootstrap: async (sessionToken: string) => {
    set({ bootstrapSyncStatus: 'syncing', bootstrapError: null });

    try {
      // Import config dynamically to avoid circular deps in mobile app
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4175/v1';

      const response = await fetch(`${apiBaseUrl}/mobile/bootstrap`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-bakki-client': 'mobile',
          'x-bakki-session': sessionToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Bootstrap failed: ${response.status} ${response.statusText}`);
      }

      const payload: BootstrapPayload = await response.json();

      // Normalize arrays into record maps
      const tasks: Record<string, CachedTask> = {};
      for (const task of payload.tasks) {
        tasks[task.id] = task;
      }

      const zones: Record<string, CachedZone> = {};
      for (const zone of payload.zones) {
        zones[zone.id] = zone;
      }

      const areas: Record<string, CachedArea> = {};
      for (const area of payload.areas) {
        areas[area.id] = area;
      }

      const drafts: Record<string, AreaDraft> = {};
      for (const draft of payload.drafts) {
        drafts[draft.localId] = draft;
      }

      const newState: Partial<OfflineStoreState> = {
        bootstrapSyncStatus: 'fresh',
        bootstrapError: null,
        lastBootstrapAt: new Date().toISOString(),
        userProfile: payload.user,
        tasks,
        ranch: payload.ranch,
        zones,
        areas,
        drafts,
      };

      set(newState);
      await persistState(get());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown bootstrap error';
      set({ bootstrapSyncStatus: 'error', bootstrapError: message });
    }
  },

  clearAllData: async () => {
    await clearPersistedState();
    set(initialState);
    set({ isInitialized: true }); // Keep initialized flag
  },

  // ============================================================================
  // Task Queries
  // ============================================================================

  getTask: (taskId: string) => {
    return get().tasks[taskId];
  },

  getTasks: (filters?: TaskFilters, sort?: { field: TaskSortField; direction: SortDirection }) => {
    let tasks = Object.values(get().tasks);

    // Apply filters
    if (filters) {
      if (filters.workflowState?.length) {
        tasks = tasks.filter((t) => filters.workflowState!.includes(t.workflowState));
      }
      if (filters.type?.length) {
        tasks = tasks.filter((t) => filters.type!.includes(t.type));
      }
      if (filters.priority?.length) {
        tasks = tasks.filter((t) => filters.priority!.includes(t.priority));
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(search) ||
            t.description?.toLowerCase().includes(search) ||
            t.areaName?.toLowerCase().includes(search)
        );
      }
    }

    // Apply sorting
    if (sort) {
      const direction = sort.direction === 'asc' ? 1 : -1;
      tasks.sort((a, b) => {
        let aVal: string | number | null = null;
        let bVal: string | number | null = null;

        switch (sort.field) {
          case 'dueDate':
            aVal = a.dueDate;
            bVal = b.dueDate;
            break;
          case 'priority':
            aVal = a.priority;
            bVal = b.priority;
            break;
          case 'createdAt':
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
        }

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
        return 0;
      });
    }

    return tasks;
  },

  getTasksByArea: (areaId: string) => {
    return Object.values(get().tasks).filter((t) => t.areaId === areaId);
  },

  // ============================================================================
  // Map Data Queries
  // ============================================================================

  getRanch: () => get().ranch,

  getZones: () => Object.values(get().zones),

  getZone: (zoneId: string) => get().zones[zoneId],

  getAreas: () => Object.values(get().areas),

  getArea: (areaId: string) => get().areas[areaId],

  getAreasByZone: (zoneId: string) => Object.values(get().areas).filter((a) => a.zoneId === zoneId),

  // ============================================================================
  // Area Drafts
  // ============================================================================

  getDrafts: () => Object.values(get().drafts),

  getDraft: (localId: string) => get().drafts[localId],

  getDraftsByZone: (zoneId: string) =>
    Object.values(get().drafts).filter((d) => d.zoneId === zoneId),

  createDraft: async (draftData) => {
    const localId = generateLocalId();
    const now = new Date().toISOString();

    const draft: AreaDraft = {
      ...draftData,
      localId,
      serverId: null,
      syncStatus: 'local',
      syncError: null,
      syncAttempts: 0,
      lastSyncAttemptAt: null,
      reviewStatus: 'pending',
      reviewerName: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      drafts: { ...state.drafts, [localId]: draft },
    }));

    await persistState(get());
    return draft;
  },

  updateDraft: (localId: string, updates: Partial<AreaDraft>) => {
    const existing = get().drafts[localId];
    if (!existing) return;

    set((state) => ({
      drafts: {
        ...state.drafts,
        [localId]: {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    persistState(get());
  },

  deleteDraft: async (localId: string) => {
    set((state) => {
      const { [localId]: _, ...remaining } = state.drafts;
      return { drafts: remaining };
    });

    // Also remove from sync queue if present
    set((state) => ({
      syncQueue: state.syncQueue.filter((item) => item.payload.localId !== localId),
    }));

    await persistState(get());
  },

  queueDraftForSync: (localId: string) => {
    const draft = get().drafts[localId];
    if (!draft) return;

    // Update draft status
    get().updateDraft(localId, { syncStatus: 'queued' });

    // Add to sync queue
    set((state) => ({
      syncQueue: [
        ...state.syncQueue,
        {
          id: localId,
          type: 'area_draft',
          payload: { ...draft, syncStatus: 'queued' },
          createdAt: new Date().toISOString(),
          attempts: 0,
          lastAttemptAt: null,
          lastError: null,
        },
      ],
    }));

    persistState(get());

    // If online, process immediately
    if (get().isOnline) {
      get().processSyncQueue();
    }
  },

  // ============================================================================
  // Sync Queue
  // ============================================================================

  processSyncQueue: async () => {
    const { syncQueue, isOnline } = get();
    if (!isOnline || syncQueue.length === 0) return;

    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4175/v1';

    for (const item of syncQueue) {
      if (item.type === 'area_draft') {
        const draft = item.payload;

        // Update draft to syncing
        get().updateDraft(draft.localId, { syncStatus: 'syncing' });

        try {
          // TODO: Get session token from auth store
          // For now, this will need to be passed or retrieved from secure storage
          const response = await fetch(`${apiBaseUrl}/mobile/area-drafts/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-bakki-client': 'mobile',
              // 'x-bakki-session': sessionToken,
            },
            body: JSON.stringify({
              drafts: [
                {
                  localId: draft.localId,
                  name: draft.name,
                  zoneId: draft.zoneId,
                  geometry: draft.geometry,
                  captureMethod: draft.captureMethod,
                  rawCapturePoints: draft.rawCapturePoints,
                  averageGpsAccuracy: draft.averageGpsAccuracy,
                  deviceInfo: draft.deviceInfo,
                },
              ],
            }),
          });

          if (response.ok) {
            const result = await response.json();
            const draftResult = result.results?.[0];

            if (draftResult?.success) {
              get().updateDraft(draft.localId, {
                syncStatus: 'synced',
                serverId: draftResult.serverId,
                syncError: null,
              });

              // Remove from queue
              set((state) => ({
                syncQueue: state.syncQueue.filter((i) => i.id !== item.id),
              }));
            } else {
              get().updateDraft(draft.localId, {
                syncStatus: draftResult?.rejected ? 'rejected' : 'failed',
                syncError: draftResult?.error || 'Unknown error',
                syncAttempts: draft.syncAttempts + 1,
                lastSyncAttemptAt: new Date().toISOString(),
              });
            }
          } else {
            throw new Error(`Sync failed: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          get().updateDraft(draft.localId, {
            syncStatus: 'failed',
            syncError: message,
            syncAttempts: draft.syncAttempts + 1,
            lastSyncAttemptAt: new Date().toISOString(),
          });
        }
      }
    }

    await persistState(get());
  },

  getSyncQueueStatus: () => {
    const queue = get().syncQueue;
    const failed = Object.values(get().drafts).filter((d) => d.syncStatus === 'failed').length;
    return {
      pending: queue.length,
      failed,
      total: queue.length + failed,
    };
  },
}));
