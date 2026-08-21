import 'react-native-url-polyfill/auto';

import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function requiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required to initialize Supabase.`);
  }

  return value;
}

const secureStoreAdapter: SupportedStorage = {
  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      // iOS may block Keychain reads when the app is opened from a locked alarm.
      // Treat it like "no saved session" so the wake flow can still open.
      console.warn(
        'Supabase session could not be read from SecureStore.',
        error,
      );
      return null;
    }
  },
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(
        'Supabase session could not be removed from SecureStore.',
        error,
      );
    }
  },
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(
        'Supabase session could not be saved to SecureStore.',
        error,
      );
    }
  },
};

export const supabase = createClient(
  requiredEnv('EXPO_PUBLIC_SUPABASE_URL', supabaseUrl),
  requiredEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey),
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: secureStoreAdapter,
    },
  },
);
