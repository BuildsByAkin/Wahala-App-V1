// features/markets/api/markets-api.ts
// Consolidated markets API client. Replaces the standalone `hooks/useMarket.ts`
// and `hooks/useMarkets.ts` data layer. The old hook files now re-export from
// here so existing consumers keep working without import changes.
import { api } from '@/lib/api/axios';
import type {
  CategoryMeta,
  Market,
  MarketStatus,
  RecentStaker,
} from '@/utils/market';

// ── Detail-only sub-types ───────────────────────────────────────────────────

export type CampStaker = {
  userId: string;
  displayName: string | null;
  username?: string;
  stakeKobo: string;
  avatarColor: string;
  joinedAt?: string;
};

export type DetailOutcome = {
  id: string;
  label: string;
  totalPoolKobo: string;
  bettorCount: number;
  sharePercent: number;
  // null when the outcome has zero pool — render "—" in that case.
  multiplier: number | null;
  // ── BACKEND.md §5.1 (optional — defensive fallback if older payload) ──
  topStakers?: CampStaker[];
  recentStakers?: CampStaker[];
  myStakeKobo?: string | null;
};

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
  // v2 fields — see Market for documentation. Detail mirrors the list shape
  // so the same components consume both. All optional.
  categoryMeta?: CategoryMeta;
  volatilityScore?: number;
  last24hPoolDeltaKobo?: string;
  last24hPoolDeltaPct?: number;
  last1hPoolDeltaKobo?: string;
  last1hPoolDeltaPct?: number;
  sparkline24h?: number[];
  recentStakers?: RecentStaker[];
  recentStakersCount?: number;
  lateFeePoolKobo?: string | null;
  // BACKEND.md §16 — winner camp once resolution lands; null otherwise.
  resolvedOutcomeId?: string | null;
};

export type MarketDetailResponse = {
  market: MarketDetail;
  outcomes: DetailOutcome[];
};

// ── List + detail fetchers ──────────────────────────────────────────────────

type RawMarket = Omit<Market, 'imageUrl'> & {
  imageUrl?: string | null;
  image_url?: string | null;
};

type RawMarketsResponse =
  | RawMarket[]
  | { markets: RawMarket[] }
  | { data: RawMarket[] };

type RawMarketDetail = Omit<MarketDetail, 'imageUrl'> & {
  imageUrl?: string | null;
  image_url?: string | null;
};

type RawMarketDetailResponse = {
  market: RawMarketDetail;
  outcomes: DetailOutcome[];
};

function normalizeMarket(m: RawMarket): Market {
  const { image_url, imageUrl, ...rest } = m;
  return { ...rest, imageUrl: imageUrl ?? image_url ?? null };
}

function normalizeDetail(
  res: RawMarketDetailResponse
): MarketDetailResponse {
  const { image_url, imageUrl, ...rest } = res.market;
  return {
    market: { ...rest, imageUrl: imageUrl ?? image_url ?? null },
    outcomes: res.outcomes,
  };
}

export const marketsApi = {
  list: async (params: { category?: string; limit?: number; offset?: number } = {}): Promise<Market[]> => {
    const { data } = await api.get<RawMarketsResponse>('/markets', {
      params: {
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        category: params.category,
      },
    });
    let raw: RawMarket[] = [];
    if (Array.isArray(data)) raw = data;
    else if (data && Array.isArray((data as { markets?: RawMarket[] }).markets)) {
      raw = (data as { markets: RawMarket[] }).markets;
    } else if (data && Array.isArray((data as { data?: RawMarket[] }).data)) {
      raw = (data as { data: RawMarket[] }).data;
    }
    return raw.map(normalizeMarket);
  },

  detail: async (slug: string): Promise<MarketDetailResponse> => {
    const { data } = await api.get<RawMarketDetailResponse>(`/markets/${slug}`);
    return normalizeDetail(data);
  },
};
