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

// Max retry attempts before marking draft as permanently failed
const MAX_SYNC_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 5_000;
const RETRY_MAX_DELAY_MS = 30_000; // Reduced from 120s for better mobile UX

function calculateNextAttemptAt(attempts: number, now = Date.now()): string {
  const delay = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempts - 1)), RETRY_MAX_DELAY_MS);
  return new Date(now + delay).toISOString();
}

// Track if sync is in progress to prevent concurrent execution (atomic flag)
let isSyncInProgress = false;

const initialState: OfflineStoreState = {
  isInitialized: false,
  isOnline: true,
  syncSessionToken: null,
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
      void get().processSyncQueue();
    }
  },

  setSyncSessionToken: (token: string | null) => {
    set({ syncSessionToken: token });
    void persistState(get());
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

      const payload = await response.json();

      // Validate bootstrap response structure before using
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid bootstrap response: expected object');
      }
      if (!payload.user || typeof payload.user !== 'object') {
        throw new Error('Invalid bootstrap response: missing user');
      }
      if (!Array.isArray(payload.tasks)) {
        throw new Error('Invalid bootstrap response: tasks must be an array');
      }
      if (!Array.isArray(payload.zones)) {
        throw new Error('Invalid bootstrap response: zones must be an array');
      }
      if (!Array.isArray(payload.areas)) {
        throw new Error('Invalid bootstrap response: areas must be an array');
      }
      if (!Array.isArray(payload.drafts)) {
        throw new Error('Invalid bootstrap response: drafts must be an array');
      }

      const validatedPayload = payload as BootstrapPayload;

      // Normalize arrays into record maps
      const tasks: Record<string, CachedTask> = {};
      for (const task of validatedPayload.tasks) {
        tasks[task.id] = task;
      }

      const zones: Record<string, CachedZone> = {};
      for (const zone of validatedPayload.zones) {
        zones[zone.id] = zone;
      }

      const areas: Record<string, CachedArea> = {};
      for (const area of validatedPayload.areas) {
        areas[area.id] = area;
      }

      const drafts: Record<string, AreaDraft> = {};
      for (const draft of validatedPayload.drafts) {
        drafts[draft.localId] = draft;
      }

      const newState: Partial<OfflineStoreState> = {
        syncSessionToken: sessionToken,
        bootstrapSyncStatus: 'fresh',
        bootstrapError: null,
        lastBootstrapAt: new Date().toISOString(),
        userProfile: validatedPayload.user,
        tasks,
        ranch: validatedPayload.ranch,
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

    void persistState(get());
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
    if (draft.syncStatus === 'syncing') return;
    if (get().syncQueue.some((item) => item.id === localId)) return;

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
          nextAttemptAt: null,
          lastError: null,
        },
      ],
    }));

    void persistState(get());

    // If online, process immediately
    if (get().isOnline) {
      void get().processSyncQueue();
    }
  },

  // ============================================================================
  // Sync Queue
  // ============================================================================

  processSyncQueue: async () => {
    if (isSyncInProgress) {
      return;
    }
    isSyncInProgress = true;

    try {
      const { isOnline, syncSessionToken } = get();
      if (!isOnline || !syncSessionToken) {
        return;
      }
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4175/v1';

      for (;;) {
        const { syncQueue } = get();
        if (syncQueue.length === 0 || !get().isOnline) {
          break;
        }
        const now = Date.now();
        const item = syncQueue.find((queuedItem) => (
          !queuedItem.nextAttemptAt
          || new Date(queuedItem.nextAttemptAt).getTime() <= now
        ));
        if (!item) {
          break;
        }
        // Check if still online before each item
        if (!get().isOnline) break;

        if (item.type === 'area_draft') {
          // Get current draft state (not stale snapshot from queue)
          const currentDraft = get().drafts[item.payload.localId];
          if (!currentDraft) {
            // Draft was deleted, remove from queue
            set((state) => ({
              syncQueue: state.syncQueue.filter((i) => i.id !== item.id),
            }));
            continue;
          }

          // Skip if already synced or currently syncing
          if (currentDraft.syncStatus === 'synced' || currentDraft.syncStatus === 'syncing') {
            continue;
          }

          // Check max retry limit
          if (currentDraft.syncAttempts >= MAX_SYNC_ATTEMPTS) {
            // Mark as permanently failed and remove from queue
            get().updateDraft(currentDraft.localId, {
              syncStatus: 'failed',
              syncError: `Max retry attempts (${MAX_SYNC_ATTEMPTS}) exceeded`,
            });
            set((state) => ({
              syncQueue: state.syncQueue.filter((i) => i.id !== item.id),
            }));
            continue;
          }

          // Update draft to syncing
          get().updateDraft(currentDraft.localId, { syncStatus: 'syncing' });

          try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30 second timeout

              const response = await fetch(`${apiBaseUrl}/mobile/area-drafts/sync`, {
                method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-bakki-client': 'mobile',
                'x-bakki-session': syncSessionToken,
              },
              body: JSON.stringify({
                drafts: [
                  {
                    localId: currentDraft.localId,
                    name: currentDraft.name,
                    zoneId: currentDraft.zoneId,
                    geometry: currentDraft.geometry,
                    captureMethod: currentDraft.captureMethod,
                    rawCapturePoints: currentDraft.rawCapturePoints,
                    averageGpsAccuracy: currentDraft.averageGpsAccuracy,
                    deviceInfo: currentDraft.deviceInfo,
                  },
                ],
              }),
                signal: controller.signal,
              });

            clearTimeout(timeoutId);

            if (response.ok) {
              const result = await response.json();
              const draftResult = result.results?.[0];

              if (draftResult?.success) {
                get().updateDraft(currentDraft.localId, {
                  syncStatus: 'synced',
                  serverId: draftResult.serverId,
                  syncError: null,
                });

                // Remove from queue
                set((state) => ({
                  syncQueue: state.syncQueue.filter((i) => i.id !== item.id),
                }));
              } else {
                const rejected = Array.isArray(draftResult?.validationErrors)
                  && draftResult.validationErrors.length > 0;

                // Get current attempt count from state
                const latestDraft = get().drafts[currentDraft.localId];
                const currentAttempts = latestDraft?.syncAttempts ?? 0;

                get().updateDraft(currentDraft.localId, {
                  syncStatus: rejected ? 'rejected' : 'failed',
                  syncError: draftResult?.error || 'Unknown error',
                  syncAttempts: currentAttempts + 1,
                  lastSyncAttemptAt: new Date().toISOString(),
                });

                // Remove from queue if rejected (validation error) or max attempts
                if (rejected || currentAttempts + 1 >= MAX_SYNC_ATTEMPTS) {
                  set((state) => ({
                    syncQueue: state.syncQueue.filter((i) => i.id !== item.id),
                  }));
                } else {
                  const attempts = (get().syncQueue.find((queuedItem) => queuedItem.id === item.id)?.attempts ?? item.attempts) + 1;
                  set((state) => ({
                    syncQueue: state.syncQueue.map((queuedItem) => (
                      queuedItem.id === item.id
                        ? {
                            ...queuedItem,
                            attempts,
                            lastAttemptAt: new Date().toISOString(),
                            nextAttemptAt: calculateNextAttemptAt(attempts),
                            lastError: draftResult?.error || 'Unknown error',
                          }
                        : queuedItem
                    )),
                  }));
                }
              }
            } else {
              throw new Error(`Sync failed: ${response.status}`);
            }
          } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown error';

            // Get current attempt count from state
            const latestDraft = get().drafts[currentDraft.localId];
            const currentAttempts = latestDraft?.syncAttempts ?? 0;

            get().updateDraft(currentDraft.localId, {
              syncStatus: 'failed',
              syncError: message,
              syncAttempts: currentAttempts + 1,
              lastSyncAttemptAt: new Date().toISOString(),
            });

            // Remove from queue if max attempts reached
              if (currentAttempts + 1 >= MAX_SYNC_ATTEMPTS) {
                set((state) => ({
                  syncQueue: state.syncQueue.filter((i) => i.id !== item.id),
                }));
              } else {
                const attempts = (get().syncQueue.find((queuedItem) => queuedItem.id === item.id)?.attempts ?? item.attempts) + 1;
                set((state) => ({
                  syncQueue: state.syncQueue.map((queuedItem) => (
                  queuedItem.id === item.id
                    ? {
                        ...queuedItem,
                        attempts,
                        lastAttemptAt: new Date().toISOString(),
                        nextAttemptAt: calculateNextAttemptAt(attempts),
                        lastError: message,
                      }
                    : queuedItem
                )),
              }));
            }
          }
        }
      }

      await persistState(get());
    } finally {
      isSyncInProgress = false;
      if (get().isOnline && get().syncQueue.length > 0) {
        void get().processSyncQueue();
      }
    }
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
