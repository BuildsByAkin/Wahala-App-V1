// features/deposits/api/deposits-api.ts
//
// Stripe-backed deposit flow. The backend exposes two endpoints:
//   POST /deposits/initiate           — creates a Stripe Checkout session
//   GET  /deposits/:sessionId         — current status (poll target)
//
// Kobo is always sent / received as a string to preserve bigint precision.
import { api } from '@/lib/api/axios';

export type DepositStatus = 'pending' | 'completed' | 'expired' | 'failed';

export type InitiateDepositPayload = {
  amountKobo: string;
};

export type InitiateDepositResult = {
  checkoutUrl: string;
  sessionId: string;
};

export type DepositStatusResponse = {
  status: DepositStatus;
  amountKobo: string;
  createdAt: string;
};

export const depositsApi = {
  initiate: async (
    payload: InitiateDepositPayload
  ): Promise<InitiateDepositResult> => {
    const { data } = await api.post<InitiateDepositResult>(
      '/deposits/initiate',
      payload
    );
    return data;
  },

  getStatus: async (sessionId: string): Promise<DepositStatusResponse> => {
    const { data } = await api.get<DepositStatusResponse>(
      `/deposits/${sessionId}`
    );
    return data;
  },
};

// Backend-enforced bounds — Stripe minimum is ₦500.
export const DEPOSIT_MIN_KOBO = 50_000n; // ₦500
export const DEPOSIT_MAX_KOBO = 50_000_000n; // ₦500,000

// A status is "terminal" if no further polling will change it.
export function isTerminalDepositStatus(s: DepositStatus): boolean {
  return s === 'completed' || s === 'expired' || s === 'failed';
}

export function sanitizeNairaInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}

// amountKobo is BigInt-as-string end-to-end. This helper is the ONLY place we
// convert from the naira UI input to kobo, and it never touches JS Number.
export function nairaTextToKoboString(text: string): string | null {
  if (!text) return null;
  try {
    return (BigInt(text) * 100n).toString();
  } catch {
    return null;
  }
}

export function compareKobo(a: string, b: bigint): number {
  try {
    const av = BigInt(a);
    if (av < b) return -1;
    if (av > b) return 1;
    return 0;
  } catch {
    return -1;
  }
}
