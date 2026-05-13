// features/deposits/api/deposits-api.ts
import { api } from '@/lib/api/axios';

export type DepositStatus = 'pending' | 'success' | 'failed';

export type InitializeDepositPayload = {
  // Kobo as a string to preserve bigint precision end-to-end.
  amountKobo: string;
};

export type InitializeDepositResult = {
  paymentTransactionId: string;
  authorizationUrl: string;
  reference: string;
};

export type DepositStatusResponse = {
  reference: string;
  status: DepositStatus;
  amountKobo: string;
  failureReason: string | null;
};

export const depositsApi = {
  initialize: async (
    payload: InitializeDepositPayload
  ): Promise<InitializeDepositResult> => {
    const { data } = await api.post<InitializeDepositResult>(
      '/deposits/initialize',
      payload
    );
    return data;
  },

  getStatus: async (reference: string): Promise<DepositStatusResponse> => {
    const { data } = await api.get<DepositStatusResponse>(
      `/deposits/${reference}`
    );
    return data;
  },
};

// Server-enforced bounds, mirrored client-side for instant validation.
export const DEPOSIT_MIN_KOBO = 10_000n; // ₦100
export const DEPOSIT_MAX_KOBO = 50_000_000n; // ₦500,000
