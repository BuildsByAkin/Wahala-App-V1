// features/auth/api/auth-api.ts
import { api } from '@/lib/api/axios';

export type SignupCompleteResponse = {
  userId: string;
  walletId: string;
  accessToken: string;
  username: string;
};

export type LoginResponse = {
  accessToken: string;
  userId: string;
  username: string;
  displayName: string | null;
};

export type MeResponse = {
  userId: string;
  phoneNumber?: string;
  username: string;
  displayName: string | null;
  leaderboardOptIn: boolean;
  wallet: {
    availableKobo: string;
    lockedKobo: string;
  };
  // BACKEND.md §11.3 — daily streak surfaced via /me so the device can
  // reconcile the local SecureStore copy with the authoritative server value.
  // Optional because older deploys may not return them yet.
  dailyStreak?: number;
  dailyStreakLastDay?: string | null;
};

export type UpdateMePayload = {
  username?: string;
  displayName?: string;
  leaderboardOptIn?: boolean;
};

export const authApi = {
  requestOtp: async (phoneNumber: string): Promise<void> => {
    await api.post('/auth/signup/request-otp', { phoneNumber });
  },

  signupComplete: async (params: {
    phoneNumber: string;
    otp: string;
    pin: string;
  }): Promise<SignupCompleteResponse> => {
    const { data } = await api.post<SignupCompleteResponse>(
      '/auth/signup/complete',
      params
    );
    return data;
  },

  login: async (params: {
    phoneNumber: string;
    pin: string;
  }): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', params);
    return data;
  },

  getMe: async (): Promise<MeResponse> => {
    const { data } = await api.get<MeResponse>('/me');
    return data;
  },

  updateMe: async (params: UpdateMePayload): Promise<MeResponse> => {
    const { data } = await api.patch<MeResponse>('/me', params);
    return data;
  },
};
