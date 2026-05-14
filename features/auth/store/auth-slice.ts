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
  // E.164-normalized Nigerian phone, captured at login/signup so the profile
  // screen can render it without an extra round-trip. Optional because the
  // /me payload doesn't return it today.
  phoneNumber: string | null;
  // Whether this user is visible on the public /leaderboard. Defaults to false.
  leaderboardOptIn: boolean;
  // Kept as a string — it's a bigint kobo value from the API.
  walletAvailableKobo: string | null;
  walletLockedKobo: string | null;
  // True once redux-persist has rehydrated this slice from SecureStore.
  // Routing gates should never make decisions before this flips to true.
  hydrated: boolean;
  // ISO timestamp set the moment the user accepts T&C + Privacy at signup.
  // Existing users who signed up before this field shipped will have `null`
  // — that's intentional, we never retroactively block them.
  agreedToTermsAt: string | null;
  // One-time welcome screen flag. Persisted so it never shows twice for the
  // same install. Survives logout — if the user logs back in we still skip it.
  hasSeenWelcome: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  userId: null,
  username: null,
  displayName: null,
  phoneNumber: null,
  leaderboardOptIn: false,
  walletAvailableKobo: null,
  walletLockedKobo: null,
  hydrated: false,
  agreedToTermsAt: null,
  hasSeenWelcome: false,
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
      state.phoneNumber = null;
      state.leaderboardOptIn = false;
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
        phoneNumber?: string | null;
      }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      if (action.payload.displayName !== undefined) {
        state.displayName = action.payload.displayName;
      }
      if (action.payload.phoneNumber !== undefined) {
        state.phoneNumber = action.payload.phoneNumber;
      }
      state.isAuthenticated = true;
    },
    setPhoneNumber: (state, action: PayloadAction<string | null>) => {
      state.phoneNumber = action.payload;
    },
    applyMe: (state, action: PayloadAction<MeResponse>) => {
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      state.displayName = action.payload.displayName;
      state.leaderboardOptIn = action.payload.leaderboardOptIn ?? false;
      if (action.payload.phoneNumber) {
        state.phoneNumber = action.payload.phoneNumber;
      }
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
    // Captured at signup completion only — never on login. The timestamp
    // gives us a defensible audit trail of when the user accepted the
    // current terms.
    setAgreedToTerms: (state, action: PayloadAction<string | null>) => {
      state.agreedToTermsAt = action.payload;
    },
    // Flipped to true the first time the welcome screen is dismissed
    // (either CTA). Persisted, so it never re-shows on this install.
    setHasSeenWelcome: (state, action: PayloadAction<boolean>) => {
      state.hasSeenWelcome = action.payload;
    },
  },
});

export const {
  logout,
  setHydrated,
  setAuthSession,
  setPhoneNumber,
  applyMe,
  applyWallet,
  setAgreedToTerms,
  setHasSeenWelcome,
} = authSlice.actions;

export default authSlice.reducer;
