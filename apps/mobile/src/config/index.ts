import Constants from 'expo-constants';

interface AppConfig {
  apiBaseUrl: string;
  appVersion: string;
  buildChannel: 'development' | 'preview' | 'production';
}

function resolveConfig(): AppConfig {
  const extra = Constants.expoConfig?.extra ?? {};

  return {
    apiBaseUrl: extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4175/v1',
    appVersion: Constants.expoConfig?.version ?? '0.1.0',
    buildChannel: (extra.buildChannel as AppConfig['buildChannel']) ?? 'development',
  };
}

export const config = resolveConfig();
