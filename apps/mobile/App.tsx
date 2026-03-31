import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Network from 'expo-network';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { useAuthStore } from './src/store';
import { useOfflineStore } from '@bakki/mobile-offline';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeOffline = useOfflineStore((state) => state.initialize);
  const setOnlineStatus = useOfflineStore((state) => state.setOnlineStatus);

  useEffect(() => {
    initializeAuth();
    initializeOffline();
  }, [initializeAuth, initializeOffline]);

  useEffect(() => {
    let cancelled = false;
    const refreshNetworkState = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (cancelled) {
          return;
        }
        setOnlineStatus(Boolean(state.isConnected && state.isInternetReachable !== false));
      } catch (error) {
        if (!cancelled) {
          console.error('[mobile] Failed to read network state:', error);
        }
      }
    };

    const interval = setInterval(() => {
      void refreshNetworkState();
    }, 15000);

    void refreshNetworkState();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setOnlineStatus]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
