// hooks/useMarkets.ts
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/axios';
import { marketKeys } from '@/lib/api/query-keys';
import type { Market } from '@/utils/market';

type MarketsResponse =
  | Market[]
  | { markets: Market[] }
  | { data: Market[] };

async function fetchMarkets(): Promise<Market[]> {
  const { data } = await api.get<MarketsResponse>('/markets', {
    params: { limit: 20, offset: 0 },
  });
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { markets?: Market[] }).markets)) {
    return (data as { markets: Market[] }).markets;
  }
  if (data && Array.isArray((data as { data?: Market[] }).data)) {
    return (data as { data: Market[] }).data;
  }
  return [];
}

export function useMarkets() {
  const query = useQuery({
    queryKey: marketKeys.list(),
    queryFn: fetchMarkets,
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
