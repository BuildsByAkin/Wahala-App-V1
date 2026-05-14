// hooks/useMarkets.ts
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/axios';
import { marketKeys } from '@/lib/api/query-keys';
import type { Market } from '@/utils/market';

type RawMarket = Omit<Market, 'imageUrl'> & {
  imageUrl?: string | null;
  image_url?: string | null;
};

type MarketsResponse =
  | RawMarket[]
  | { markets: RawMarket[] }
  | { data: RawMarket[] };

function normalize(m: RawMarket): Market {
  const { image_url, imageUrl, ...rest } = m;
  return { ...rest, imageUrl: imageUrl ?? image_url ?? null };
}

async function fetchMarkets(): Promise<Market[]> {
  const { data } = await api.get<MarketsResponse>('/markets', {
    params: { limit: 20, offset: 0 },
  });
  let raw: RawMarket[] = [];
  if (Array.isArray(data)) raw = data;
  else if (data && Array.isArray((data as { markets?: RawMarket[] }).markets)) {
    raw = (data as { markets: RawMarket[] }).markets;
  } else if (data && Array.isArray((data as { data?: RawMarket[] }).data)) {
    raw = (data as { data: RawMarket[] }).data;
  }
  return raw.map(normalize);
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
