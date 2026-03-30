/**
 * Async Storage persistence layer for the offline store.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineStoreState } from './types';

const STORAGE_KEY = '@bakki/offline-store';

/**
 * Persisted subset of state (we don't persist transient flags like isOnline)
 */
type PersistedState = Pick<
  OfflineStoreState,
  | 'lastBootstrapAt'
  | 'userProfile'
  | 'tasks'
  | 'ranch'
  | 'zones'
  | 'areas'
  | 'drafts'
  | 'syncQueue'
>;

/**
 * Save state to AsyncStorage
 */
export async function persistState(state: OfflineStoreState): Promise<void> {
  const persisted: PersistedState = {
    lastBootstrapAt: state.lastBootstrapAt,
    userProfile: state.userProfile,
    tasks: state.tasks,
    ranch: state.ranch,
    zones: state.zones,
    areas: state.areas,
    drafts: state.drafts,
    syncQueue: state.syncQueue,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch (error) {
    console.error('[mobile-offline] Failed to persist state:', error);
  }
}

/**
 * Load state from AsyncStorage
 */
export async function loadPersistedState(): Promise<Partial<OfflineStoreState> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch (error) {
    console.error('[mobile-offline] Failed to load persisted state:', error);
    return null;
  }
}

/**
 * Clear all persisted state
 */
export async function clearPersistedState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[mobile-offline] Failed to clear persisted state:', error);
  }
}
