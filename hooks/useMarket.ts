// hooks/useMarket.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/axios';
import { marketKeys } from '@/lib/api/query-keys';
import type { MarketStatus } from '@/utils/market';

export type MarketDetail = {
  id: string;
  slug: string;
  question: string;
  description: string | null;
  category: string;
  status: MarketStatus;
  totalPoolKobo: string;
  bettorCount: number;
  commentCount: number;
  closesAt: string;
  feeBps: number;
  minStakeKobo: string;
  maxStakeKobo: string;
  imageUrl: string | null;
};

export type DetailOutcome = {
  id: string;
  label: string;
  totalPoolKobo: string;
  bettorCount: number;
  sharePercent: number;
  // null when the outcome has zero pool — render "—" in that case.
  multiplier: number | null;
};

type RawMarketDetail = Omit<MarketDetail, 'imageUrl'> & {
  imageUrl?: string | null;
  image_url?: string | null;
};

type MarketDetailResponse = {
  market: MarketDetail;
  outcomes: DetailOutcome[];
};

type RawMarketDetailResponse = {
  market: RawMarketDetail;
  outcomes: DetailOutcome[];
};

async function fetchMarket(slug: string): Promise<MarketDetailResponse> {
  const { data } = await api.get<RawMarketDetailResponse>(`/markets/${slug}`);
  const { image_url, imageUrl, ...rest } = data.market;
  return {
    market: { ...rest, imageUrl: imageUrl ?? image_url ?? null },
    outcomes: data.outcomes,
  };
}

export function useMarket(slug: string | undefined) {
  const query = useQuery({
    queryKey: marketKeys.detail(slug),
    queryFn: () => fetchMarket(slug as string),
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
