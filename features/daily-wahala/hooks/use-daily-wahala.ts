// features/daily-wahala/hooks/use-daily-wahala.ts
import { useQuery } from '@tanstack/react-query';

import { dailyWahalaKeys } from '@/lib/api/query-keys';
import { dailyWahalaApi } from '@/features/daily-wahala/api/daily-wahala-api';

// Server caches the response for 60s; we mirror that staleTime and refetch
// every 5min so a daily that flips at the top of the hour is picked up
// without forcing a manual refresh.
export function useDailyWahala() {
  return useQuery({
    queryKey: dailyWahalaKeys.current(),
    queryFn: dailyWahalaApi.get,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
