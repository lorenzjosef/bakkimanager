import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation';
import { useAuthStore } from './src/store';
import { useOfflineStore } from '@bakki/mobile-offline';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeOffline = useOfflineStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
    initializeOffline();
  }, [initializeAuth, initializeOffline]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
