// hooks/useMarket.ts
// DEPRECATED — re-exports from `features/markets`. New code should import
// directly from `@/features/markets`. Kept as a shim to avoid touching the
// existing consumers (app/market/[slug].tsx, features/betting/components/*,
// components/market/*).
export { useMarket } from '@/features/markets/hooks/use-market';
export type {
  DetailOutcome,
  MarketDetail,
  MarketDetailResponse,
} from '@/features/markets/api/markets-api';
