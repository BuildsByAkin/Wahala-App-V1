// features/auth/store/auth-slice.ts
// Auth slice is intentionally a *materialized* store — it holds the result of
// authentication and the latest /me snapshot. All network calls live in
// TanStack Query mutations/queries (see features/auth/hooks/*). This avoids
// duplicate fetches, gives us request dedupe + retry, and keeps the slice
// trivially testable.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { MeResponse } from '@/features/auth/api/auth-api';

export type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  // Kept as a string — it's a bigint kobo value from the API.
  walletAvailableKobo: string | null;
  walletLockedKobo: string | null;
  // True once redux-persist has rehydrated this slice from SecureStore.
  // Routing gates should never make decisions before this flips to true.
  hydrated: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  userId: null,
  username: null,
  displayName: null,
  walletAvailableKobo: null,
  walletLockedKobo: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.accessToken = null;
      state.userId = null;
      state.username = null;
      state.displayName = null;
      state.walletAvailableKobo = null;
      state.walletLockedKobo = null;
    },
    setHydrated: (state, action: PayloadAction<boolean>) => {
      state.hydrated = action.payload;
    },
    // Seeds the session immediately after a successful login/signup so the
    // axios request interceptor can attach the bearer on the very next call.
    setAuthSession: (
      state,
      action: PayloadAction<{
        accessToken: string;
        userId: string;
        username: string;
        displayName?: string | null;
      }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      if (action.payload.displayName !== undefined) {
        state.displayName = action.payload.displayName;
      }
      state.isAuthenticated = true;
    },
    applyMe: (state, action: PayloadAction<MeResponse>) => {
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      state.displayName = action.payload.displayName;
      state.walletAvailableKobo = action.payload.wallet.availableKobo;
      state.walletLockedKobo = action.payload.wallet.lockedKobo;
    },
    applyWallet: (
      state,
      action: PayloadAction<{ availableKobo: string; lockedKobo: string }>
    ) => {
      state.walletAvailableKobo = action.payload.availableKobo;
      state.walletLockedKobo = action.payload.lockedKobo;
    },
  },
});

export const { logout, setHydrated, setAuthSession, applyMe, applyWallet } =
  authSlice.actions;

export default authSlice.reducer;
