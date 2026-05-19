// features/betting/api/wallet-locked-api.ts
//
// BACKEND.md §13 — per-camp wallet breakdown. The user's `walletLockedKobo`
// total is real (mirrored on the auth slice), but the breakdown by camp is
// a server-side aggregate so the wallet screen does not need to fan-out
// many bet queries to compute it.
import { api } from '@/lib/api/axios';

export type LockedCamp = {
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  outcomeId: string;
  outcomeLabel: string;
  color: string;
  lockedKobo: string;
};

export type LockedByCampResponse = {
  totalLockedKobo: string;
  camps: LockedCamp[];
};

export const walletLockedApi = {
  byCamp: async (): Promise<LockedByCampResponse> => {
    const { data } = await api.get<LockedByCampResponse>(
      '/me/wallet/locked-by-camp'
    );
    return {
      totalLockedKobo: data?.totalLockedKobo ?? '0',
      camps: data?.camps ?? [],
    };
  },
};
