// features/markets/hooks/use-markets.ts
import { useQuery } from '@tanstack/react-query';

import { marketKeys } from '@/lib/api/query-keys';
import { marketsApi } from '@/features/markets/api/markets-api';

export function useMarkets() {
  const query = useQuery({
    queryKey: marketKeys.list(),
    queryFn: () => marketsApi.list(),
    staleTime: 60_000,
  });

  return {
    markets: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
