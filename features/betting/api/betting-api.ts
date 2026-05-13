// features/betting/api/betting-api.ts
import { api } from '@/lib/api/axios';

export type DisplayMode = 'username' | 'anonymous';

export type PlaceBetPayload = {
  marketId: string;
  outcomeId: string;
  // Kobo as a string to preserve bigint precision end-to-end.
  stakeKobo: string;
  clientBetId: string;
  displayMode: DisplayMode;
};

export type PlaceBetResult = {
  betId: string;
  alreadyPlaced: boolean;
  market: {
    totalPoolKobo: string;
    bettorCount: number;
  };
  outcome: {
    totalPoolKobo: string;
    bettorCount: number;
    multiplier: number;
  };
  wallet: {
    availableKobo: string;
    lockedKobo: string;
  };
};

export type BetStatus = 'active' | 'won' | 'lost';

export type MyBet = {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketSlug: string;
  outcomeId: string;
  outcomeLabel: string;
  stakeKobo: string;
  payoutKobo: string | null;
  status: BetStatus;
  multiplier: number;
  displayMode: DisplayMode;
  createdAt: string;
};

type ListMyBetsParams = {
  status?: BetStatus;
  limit?: number;
  offset?: number;
};

type ListMyBetsResponse = MyBet[] | { bets: MyBet[] } | { data: MyBet[] };

export const bettingApi = {
  placeBet: async (payload: PlaceBetPayload): Promise<PlaceBetResult> => {
    const { data } = await api.post<PlaceBetResult>('/bets', payload);
    return data;
  },

  listMyBets: async (params: ListMyBetsParams = {}): Promise<MyBet[]> => {
    const { data } = await api.get<ListMyBetsResponse>('/me/bets', {
      params: {
        status: params.status,
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
      },
    });
    if (Array.isArray(data)) return data;
    if ('bets' in data && Array.isArray(data.bets)) return data.bets;
    if ('data' in data && Array.isArray(data.data)) return data.data;
    return [];
  },
};
