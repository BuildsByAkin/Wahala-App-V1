// features/auth/store/auth-slice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { authApi, type MeResponse } from '@/features/auth/api/auth-api';
import { extractApiError } from '@/lib/api/axios';

export type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  // Kept as a string — it's a bigint kobo value from the API.
  walletAvailableKobo: string | null;
  walletLockedKobo: string | null;
  isLoading: boolean;
  error: string | null;
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
  isLoading: false,
  error: null,
  hydrated: false,
};

export const requestOtp = createAsyncThunk<void, { phoneNumber: string }>(
  'auth/requestOtp',
  async ({ phoneNumber }, { rejectWithValue }) => {
    try {
      await authApi.requestOtp(phoneNumber);
    } catch (err) {
      return rejectWithValue(extractApiError(err).message);
    }
  }
);

export const completeSignup = createAsyncThunk<
  { accessToken: string; userId: string; username: string },
  { phoneNumber: string; otp: string; pin: string }
>('auth/completeSignup', async (params, { rejectWithValue }) => {
  try {
    const res = await authApi.signupComplete(params);
    return {
      accessToken: res.accessToken,
      userId: res.userId,
      username: res.username,
    };
  } catch (err) {
    return rejectWithValue(extractApiError(err).message);
  }
});

export const loginWithPin = createAsyncThunk<
  {
    accessToken: string;
    userId: string;
    username: string;
    displayName: string | null;
    me: MeResponse;
  },
  { phoneNumber: string; pin: string }
>('auth/loginWithPin', async (params, { dispatch, rejectWithValue }) => {
  try {
    const res = await authApi.login(params);
    // Seed the token into the store BEFORE calling /me so the axios request
    // interceptor can attach the Authorization header from state.
    // Plain-action dispatch avoids the forward-reference to setAuthSession
    // (which is declared at the bottom of this file).
    dispatch({
      type: 'auth/setAuthSession',
      payload: {
        accessToken: res.accessToken,
        userId: res.userId,
        username: res.username,
      },
    });
    // /me still gives us wallet balances, which login does not return.
    const me = await authApi.getMe();
    return {
      accessToken: res.accessToken,
      userId: res.userId,
      username: res.username,
      displayName: res.displayName,
      me,
    };
  } catch (err) {
    return rejectWithValue(extractApiError(err).message);
  }
});

export const fetchMe = createAsyncThunk<MeResponse, void>(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      return await authApi.getMe();
    } catch (err) {
      return rejectWithValue(extractApiError(err).message);
    }
  }
);

export const updateDisplayName = createAsyncThunk<MeResponse, { displayName: string }>(
  'auth/updateDisplayName',
  async (params, { rejectWithValue }) => {
    try {
      return await authApi.updateMe(params);
    } catch (err) {
      return rejectWithValue(extractApiError(err).message);
    }
  }
);

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
      state.error = null;
      state.isLoading = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setHydrated: (state) => {
      state.hydrated = true;
    },
    // Used right after login/signup to seed the token before the next request.
    setAuthSession: (
      state,
      action: PayloadAction<{ accessToken: string; userId: string; username?: string }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId;
      if (action.payload.username) state.username = action.payload.username;
      state.isAuthenticated = true;
    },
    applyMe: (state, action: PayloadAction<MeResponse>) => {
      state.userId = action.payload.userId;
      state.username = action.payload.username;
      state.displayName = action.payload.displayName;
      state.walletAvailableKobo = action.payload.wallet.availableKobo;
      state.walletLockedKobo = action.payload.wallet.lockedKobo;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestOtp.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Failed to send code';
      })

      .addCase(completeSignup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeSignup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.accessToken;
        state.userId = action.payload.userId;
        state.username = action.payload.username;
        state.isAuthenticated = true;
      })
      .addCase(completeSignup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Sign up failed';
      })

      .addCase(loginWithPin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithPin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accessToken = action.payload.accessToken;
        state.userId = action.payload.userId;
        // Login response now carries username + displayName directly.
        state.username = action.payload.username ?? action.payload.me.username;
        state.displayName =
          action.payload.displayName ?? action.payload.me.displayName;
        state.walletAvailableKobo = action.payload.me.wallet.availableKobo;
        state.walletLockedKobo = action.payload.me.wallet.lockedKobo;
        state.isAuthenticated = true;
      })
      .addCase(loginWithPin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Login failed';
      })

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.userId = action.payload.userId;
        state.username = action.payload.username;
        state.displayName = action.payload.displayName;
        state.walletAvailableKobo = action.payload.wallet.availableKobo;
        state.walletLockedKobo = action.payload.wallet.lockedKobo;
      })

      .addCase(updateDisplayName.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDisplayName.fulfilled, (state, action) => {
        state.isLoading = false;
        state.displayName = action.payload.displayName;
      })
      .addCase(updateDisplayName.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? 'Could not update profile';
      });
  },
});

export const { logout, clearAuthError, setHydrated, setAuthSession, applyMe } =
  authSlice.actions;

export default authSlice.reducer;
