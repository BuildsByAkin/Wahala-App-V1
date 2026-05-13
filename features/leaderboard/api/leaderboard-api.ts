// features/leaderboard/api/leaderboard-api.ts
import { api } from '@/lib/api/axios';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  winsCount: number;
  // bigint values arrive as strings — keep them as strings end-to-end and only
  // parse with BigInt when arithmetic or formatting is needed.
  totalWinningsKobo: string;
  totalStakedKobo: string;
  netProfitKobo: string;
};

export type LeaderboardPagination = {
  limit: number;
  offset: number;
  hasMore: boolean;
  // null when there are no more pages.
  nextOffset: number | null;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  pagination: LeaderboardPagination;
};

// Server caps: limit 1–50, offset 0–1000. Out-of-range values are clamped
// server-side, but we mirror the cap here to keep request/response shapes
// honest and avoid wasted round-trips.
export const LEADERBOARD_PAGE_SIZE = 20;
export const LEADERBOARD_MAX_LIMIT = 50;

export const leaderboardApi = {
  list: async (
    params: { limit?: number; offset?: number } = {}
  ): Promise<LeaderboardResponse> => {
    const { limit = LEADERBOARD_PAGE_SIZE, offset = 0 } = params;
    const { data } = await api.get<LeaderboardResponse>('/leaderboard', {
      params: { limit: String(limit), offset: String(offset) },
    });
    return data;
  },
};
