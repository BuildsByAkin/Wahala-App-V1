// features/leaderboard/hooks/use-leaderboard.ts
//
// Cursor-paginated leaderboard. The server returns a pagination block with
// `nextOffset`/`hasMore` so we just thread that through TanStack Query's
// useInfiniteQuery — no manual offset bookkeeping in screens.
import { useInfiniteQuery } from '@tanstack/react-query';

import { leaderboardKeys } from '@/lib/api/query-keys';
import { useAppSelector } from '@/store';
import {
  LEADERBOARD_PAGE_SIZE,
  leaderboardApi,
  type LeaderboardEntry,
} from '@/features/leaderboard/api/leaderboard-api';

type Options = {
  limit?: number;
  enabled?: boolean;
};

export function useLeaderboard(options: Options = {}) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { limit = LEADERBOARD_PAGE_SIZE, enabled = true } = options;

  const query = useInfiniteQuery({
    queryKey: leaderboardKeys.list({ limit }),
    queryFn: ({ pageParam }) =>
      leaderboardApi.list({ limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextOffset : undefined,
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });

  // Flatten paginated pages into a single ordered list. Server already
  // guarantees rank ordering across pages, so concat is enough.
  const entries: LeaderboardEntry[] =
    query.data?.pages.flatMap((p) => p.entries) ?? [];

  return {
    entries,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
