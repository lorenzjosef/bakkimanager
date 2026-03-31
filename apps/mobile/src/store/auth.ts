import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { BakkiSessionUser, BakkiSessionState } from '@bakki/domain';
import { authApi, setSessionToken, getSessionToken } from '../api';

const SESSION_KEY = 'bakki_session';
const TOKEN_KEY = 'bakki_token';

interface StoredSession {
  session: BakkiSessionState;
  token: string;
}

interface AuthState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: BakkiSessionUser | null;
  session: BakkiSessionState | null;
  error: string | null;

  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * Safely get item from SecureStore, returning null on any error
 */
async function safeGetSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[auth] Failed to read ${key} from SecureStore:`, error);
    return null;
  }
}

/**
 * Safely set item in SecureStore, ignoring errors
 */
async function safeSetSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`[auth] Failed to write ${key} to SecureStore:`, error);
  }
}

/**
 * Safely delete item from SecureStore, ignoring errors
 */
async function safeDeleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`[auth] Failed to delete ${key} from SecureStore:`, error);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isInitialized: false,
  isAuthenticated: false,
  isLoading: false,
  user: null,
  session: null,
  error: null,

  initialize: async () => {
    try {
      const storedData = await safeGetSecureItem(SESSION_KEY);
      const storedToken = await safeGetSecureItem(TOKEN_KEY);
      
      if (storedData && storedToken) {
        let stored: StoredSession;
        try {
          stored = JSON.parse(storedData);
        } catch (parseError) {
          // Corrupted data - clear it and start fresh
          console.error('[auth] Corrupted session data, clearing:', parseError);
          await safeDeleteSecureItem(SESSION_KEY);
          await safeDeleteSecureItem(TOKEN_KEY);
          set({ isInitialized: true, isAuthenticated: false });
          return;
        }
        
        // Check if session is still valid (not expired)
        if (new Date(stored.session.expiresAt) > new Date()) {
          setSessionToken(storedToken);
          
          // Try to refresh the session online
          try {
            const refreshed = await authApi.refreshSession();
            if (refreshed.session) {
              const newToken = getSessionToken();
              if (newToken) {
                await safeSetSecureItem(SESSION_KEY, JSON.stringify({ 
                  session: refreshed.session,
                  token: newToken 
                }));
                await safeSetSecureItem(TOKEN_KEY, newToken);
              }
              set({
                isInitialized: true,
                isAuthenticated: true,
                user: refreshed.session.user,
                session: refreshed.session,
              });
              return;
            }
          } catch {
            // If refresh fails but session hasn't expired, allow offline use
            set({
              isInitialized: true,
              isAuthenticated: true,
              user: stored.session.user,
              session: stored.session,
            });
            return;
          }
        } else {
          // Session expired - clear stored data
          await safeDeleteSecureItem(SESSION_KEY);
          await safeDeleteSecureItem(TOKEN_KEY);
          setSessionToken(null);
        }
      }
      
      set({ isInitialized: true, isAuthenticated: false });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isInitialized: true, isAuthenticated: false });
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authApi.login(username, password);
      
      if (response.session) {
        // Check if user has mobile access
        if (!response.session.user.mobileAccessEnabled) {
          set({
            isLoading: false,
            error: 'Mobile access is not enabled for this account.',
          });
          return false;
        }

        const token = getSessionToken();
        if (token) {
          await safeSetSecureItem(SESSION_KEY, JSON.stringify({ 
            session: response.session,
            token 
          }));
          await safeSetSecureItem(TOKEN_KEY, token);
        }
        
        set({
          isLoading: false,
          isAuthenticated: true,
          user: response.session.user,
          session: response.session,
        });
        
        return true;
      }
      
      set({ isLoading: false, error: 'Login failed' });
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: async () => {
    // Try to call logout API, but don't fail if it errors
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    
    // Clear stored credentials (ignore errors)
    await safeDeleteSecureItem(SESSION_KEY);
    await safeDeleteSecureItem(TOKEN_KEY);
    
    // Always clear in-memory state
    setSessionToken(null);
    
    set({
      isAuthenticated: false,
      user: null,
      session: null,
    });
  },

  refreshSession: async () => {
    try {
      const response = await authApi.refreshSession();
      
      if (response.session) {
        const token = getSessionToken();
        if (token) {
          await safeSetSecureItem(SESSION_KEY, JSON.stringify({ 
            session: response.session,
            token 
          }));
          await safeSetSecureItem(TOKEN_KEY, token);
        }
        
        set({
          user: response.session.user,
          session: response.session,
        });
        
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
