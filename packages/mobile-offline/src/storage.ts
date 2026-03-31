/**
 * Async Storage persistence layer for the offline store.
 *
 * SECURITY: Session tokens are stored separately in SecureStore (encrypted).
 * Only non-sensitive data is stored in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { OfflineStoreState } from './types';

const STORAGE_KEY = '@bakki/offline-store';
const SECURE_TOKEN_KEY = 'bakki_sync_session_token';

/**
 * Persisted subset of state (we don't persist transient flags like isOnline)
 * NOTE: syncSessionToken is stored separately in SecureStore for security
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
 * Save state to AsyncStorage (non-sensitive data) and SecureStore (token)
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

  // Store token securely (separate from main state)
  try {
    if (state.syncSessionToken) {
      await SecureStore.setItemAsync(SECURE_TOKEN_KEY, state.syncSessionToken);
    } else {
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
    }
  } catch (error) {
    console.error('[mobile-offline] Failed to persist session token securely:', error);
  }
}

/**
 * Load state from AsyncStorage and SecureStore
 */
export async function loadPersistedState(): Promise<Partial<OfflineStoreState> | null> {
  let state: Partial<OfflineStoreState> | null = null;

  // Load non-sensitive data from AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw) as PersistedState;
    }
  } catch (error) {
    console.error('[mobile-offline] Failed to load persisted state:', error);
    // Clear corrupted data
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore cleanup errors
    }
    return null;
  }

  // Load token from SecureStore
  try {
    const token = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
    if (state && token) {
      state.syncSessionToken = token;
    }
  } catch (error) {
    console.error('[mobile-offline] Failed to load session token:', error);
    // Continue without token - user will need to re-authenticate
  }

  return state;
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

  try {
    await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
  } catch (error) {
    console.error('[mobile-offline] Failed to clear session token:', error);
  }
}
