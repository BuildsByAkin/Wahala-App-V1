// features/betting/hooks/use-my-bets.ts
import { useQuery } from '@tanstack/react-query';

import { useAppSelector } from '@/store';
import { betKeys } from '@/lib/api/query-keys';
import { bettingApi, type BetStatus } from '@/features/betting/api/betting-api';

type Options = {
  status?: BetStatus;
  limit?: number;
  offset?: number;
  enabled?: boolean;
};

export function useMyBets(options: Options = {}) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { status, limit = 20, offset = 0, enabled = true } = options;

  const query = useQuery({
    queryKey: betKeys.myBets({ status, limit, offset }),
    queryFn: () => bettingApi.listMyBets({ status, limit, offset }),
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });

  return {
    bets: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
