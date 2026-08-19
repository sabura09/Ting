import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Get the base URL for the Next.js web application.
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_URL environment variable
 * 2. Platform-specific localhost defaults for development
 *
 * For production builds, always set EXPO_PUBLIC_API_URL to your
 * deployed Next.js URL (e.g., https://your-domain.com).
 */
export function getApiUrl(): string {
  // Web browser preview fallback to target local Next.js instance on port 3000
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
      }
      return `http://${hostname}:3000`;
    }
    return 'http://localhost:3000';
  }

  // Check environment variable first
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    // If it's a deployed production URL, use it directly
    if (!trimmed.includes('localhost') && !trimmed.includes('127.0.0.1') && !trimmed.includes('10.0.2.2')) {
      return trimmed;
    }
  }

  // Development fallbacks
  if (__DEV__) {
    // Attempt to dynamically resolve host IP address from Expo's Metro bundler URI
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip.trim().length > 0) {
        // Next.js dev server runs on port 3000
        const resolved = `http://${ip.trim()}:3000`;
        console.log(`[AI Suite Mobile] Dynamically resolved developer server: ${resolved}`);
        return resolved;
      }
    }

    if (Platform.OS === 'android') {
      // Android emulator fallback
      return 'http://10.0.2.2:3000';
    }
    // iOS simulator fallback
    return 'http://localhost:3000';
  }

  // Production fallback
  console.warn(
    '[AI Suite Mobile] EXPO_PUBLIC_API_URL is not set. ' +
    'The app will not load correctly in production without it.'
  );
  return envUrl ? envUrl.trim().replace(/\/+$/, '') : 'http://localhost:3000';
}

/**
 * App configuration constants
 */
export const APP_CONFIG = {
  APP_NAME: 'AI Suite',
  VERSION: Constants.expoConfig?.version ?? '1.0.0',
  BUNDLE_ID: Platform.select({
    ios: Constants.expoConfig?.ios?.bundleIdentifier,
    android: Constants.expoConfig?.android?.package,
  }) ?? 'com.aisuite.app',
} as const;
