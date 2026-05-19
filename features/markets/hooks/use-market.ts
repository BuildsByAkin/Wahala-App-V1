// features/markets/hooks/use-market.ts
import { useQuery } from '@tanstack/react-query';

import { marketKeys } from '@/lib/api/query-keys';
import { marketsApi } from '@/features/markets/api/markets-api';

export function useMarket(slug: string | undefined) {
  const query = useQuery({
    queryKey: marketKeys.detail(slug),
    queryFn: () => marketsApi.detail(slug as string),
    enabled: !!slug,
    staleTime: 60_000,
  });

  return {
    market: query.data?.market,
    outcomes: query.data?.outcomes ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
