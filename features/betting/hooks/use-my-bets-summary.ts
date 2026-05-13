// features/betting/hooks/use-my-bets-summary.ts
import { useQuery } from '@tanstack/react-query';

import { useAppSelector } from '@/store';
import { betKeys } from '@/lib/api/query-keys';
import { bettingApi } from '@/features/betting/api/betting-api';

export function useMyBetsSummary(options: { enabled?: boolean } = {}) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: betKeys.mySummary(),
    queryFn: bettingApi.getMyBetsSummary,
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });

  return {
    activeStakeKobo: query.data?.activeStakeKobo ?? '0',
    activeCount: query.data?.activeCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
