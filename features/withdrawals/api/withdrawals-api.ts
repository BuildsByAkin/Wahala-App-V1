// features/withdrawals/api/withdrawals-api.ts
//
// Single API surface for the withdrawal flow. Covers four backend domains:
//   1. /banks                 — public list of Nigerian banks
//   2. /me/bank-accounts      — saved payout accounts (add / list / default / delete)
//   3. /me/kyc/bvn            — BVN status + submission
//   4. /withdrawals           — initiate, single status, my list
//
// All kobo fields are kept as strings end-to-end. The only deliberate
// type-normalisation is `nameMatchScore`, which is `number` on POST but
// `string | null` on GET — we coerce both to `number | null` so the UI never
// has to branch on it. nameMatchScore is non-monetary, so parseFloat is safe.
import { api } from '@/lib/api/axios';

// ── Banks ──────────────────────────────────────────────────────────────────
export type Bank = {
  name: string;
  code: string;
  slug: string;
};

// ── Bank accounts ──────────────────────────────────────────────────────────
export type BankAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  // Normalised: backend returns `string | null` on GET, `number` on POST.
  nameMatchScore: number | null;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
};

export type AddBankAccountPayload = {
  bankCode: string;
  accountNumber: string;
};

export type AddBankAccountResult = {
  bankAccountId: string;
  accountName: string;
  nameMatchScore: number;
  isDefault: boolean;
};

// ── KYC / BVN ──────────────────────────────────────────────────────────────
export type BvnStatus = {
  verified: boolean;
  verifiedAt: string | null;
  last4: string | null;
};

export type VerifyBvnResult = {
  verified: boolean;
  reason?: string;
};

// ── Withdrawals ────────────────────────────────────────────────────────────
// Backend-aligned status set. Withdrawals are now processed manually within
// a 4-hour SLA, so `pending` is the dominant happy-path state. `processing`
// is a transient admin-side flag. Terminal states: completed | failed |
// cancelled. (`abandoned` is no longer used.)
export type WithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type Withdrawal = {
  id: string;
  reference: string;
  status: WithdrawalStatus;
  amountKobo: string;
  feeKobo: string;
  netAmountKobo: string | null;
  failureReason: string | null;
  bankAccountId: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type InitiateWithdrawalPayload = {
  bankAccountId: string;
  // BigInt kobo as a string. Always stringified — never a number.
  amountKobo: string;
  pin: string;
};

export type InitiateWithdrawalResult = {
  paymentTransactionId: string;
  status: 'pending' | 'failed';
  failureReason?: string;
  estimatedFeeKobo: string;
  estimatedNetKobo: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────
function normalizeNameMatchScore(
  raw: string | number | null | undefined
): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

// ── API ────────────────────────────────────────────────────────────────────
export const withdrawalsApi = {
  // Banks
  listBanks: async (): Promise<Bank[]> => {
    const { data } = await api.get<{ items: Bank[] }>('/banks');
    return data.items;
  },

  // Bank accounts
  listBankAccounts: async (): Promise<BankAccount[]> => {
    const { data } = await api.get<{
      items: Array<Omit<BankAccount, 'nameMatchScore'> & {
        nameMatchScore: string | null;
      }>;
    }>('/me/bank-accounts');
    return data.items.map((row) => ({
      ...row,
      nameMatchScore: normalizeNameMatchScore(row.nameMatchScore),
    }));
  },

  addBankAccount: async (
    payload: AddBankAccountPayload
  ): Promise<AddBankAccountResult> => {
    const { data } = await api.post<AddBankAccountResult>(
      '/me/bank-accounts',
      payload
    );
    return {
      ...data,
      nameMatchScore: normalizeNameMatchScore(data.nameMatchScore) ?? 0,
    };
  },

  setDefaultBankAccount: async (id: string): Promise<void> => {
    await api.post(`/me/bank-accounts/${id}/default`);
  },

  deleteBankAccount: async (id: string): Promise<void> => {
    await api.delete(`/me/bank-accounts/${id}`);
  },

  // KYC / BVN
  getBvnStatus: async (): Promise<BvnStatus> => {
    const { data } = await api.get<BvnStatus>('/me/kyc/bvn');
    return data;
  },

  verifyBvn: async (bvn: string): Promise<VerifyBvnResult> => {
    const { data } = await api.post<VerifyBvnResult>('/me/kyc/bvn', { bvn });
    return data;
  },

  // Withdrawals
  initiate: async (
    payload: InitiateWithdrawalPayload
  ): Promise<InitiateWithdrawalResult> => {
    const { data } = await api.post<InitiateWithdrawalResult>(
      '/withdrawals',
      payload
    );
    return data;
  },

  getStatus: async (id: string): Promise<Withdrawal> => {
    const { data } = await api.get<Withdrawal>(`/withdrawals/${id}`);
    return data;
  },

  listMine: async (): Promise<Withdrawal[]> => {
    const { data } = await api.get<{ items: Withdrawal[] }>('/me/withdrawals');
    return data.items;
  },
};

// Server-enforced bounds, mirrored client-side for instant validation.
export const WITHDRAWAL_MIN_KOBO = 20_000n; // ₦200
export const WITHDRAWAL_MAX_KOBO = 50_000_000n; // ₦500,000
export const BVN_REQUIRED_THRESHOLD_KOBO = 1_000_000n; // ₦10,000

export function nairaTextToKobo(text: string): bigint | null {
  if (!text) return null;
  try {
    return BigInt(text) * 100n;
  } catch {
    return null;
  }
}

export function sanitizeNairaInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}
