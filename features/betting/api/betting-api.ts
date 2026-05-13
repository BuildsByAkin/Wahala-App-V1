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
    // null when the outcome has zero pool.
    multiplier: number | null;
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
  // null when the outcome has zero pool at the time the bet was serialized.
  multiplier: number | null;
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

  getMyBetsSummary: async (): Promise<MyBetsSummary> => {
    const { data } = await api.get<MyBetsSummary>('/me/bets/summary');
    return {
      activeStakeKobo: data?.activeStakeKobo ?? '0',
      activeCount: data?.activeCount ?? 0,
    };
  },
};

export type MyBetsSummary = {
  activeStakeKobo: string;
  activeCount: number;
};
