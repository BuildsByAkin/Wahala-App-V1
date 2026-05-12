// lib/storage/secure-storage.ts
// redux-persist storage adapter backed by expo-secure-store.
// SecureStore encrypts values at rest (Keychain on iOS, EncryptedSharedPreferences/Keystore on Android),
// which is the Expo-blessed place for JWTs and other secrets.
import * as SecureStore from 'expo-secure-store';
import type { Storage } from 'redux-persist';

// SecureStore keys must match: [A-Za-z0-9._-]+
const sanitizeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureStorage: Storage = {
  getItem: async (key) => {
    try {
      const value = await SecureStore.getItemAsync(sanitizeKey(key));
      return value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(sanitizeKey(key), value);
    } catch {
      /* noop */
    }
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(sanitizeKey(key));
    } catch {
      /* noop */
    }
  },
};
