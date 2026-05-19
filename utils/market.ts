// utils/market.ts
// All market-pool math lives here. Kobo values arrive as bigint strings from the
// API — never parse them to JS Number, always use BigInt for arithmetic.

import { getCategoryAccent } from '@/constants/colors';

export type Outcome = {
  id: string;
  label: string;
  totalStakedKobo: string;
};

export type LastComment = {
  username: string;
  displayName: string | null;
  body: string;
  outcomeBetOn: string | null;
} | null;

// Lifecycle is driven server-side: scheduled → open → locked → resolved/cancelled.
// `voided` is an internal terminal state for edge resolutions. The backend
// applies an effective status at serialize time, so by the time we read
// `status` here it already reflects the live state (e.g. a market past its
// `closesAt` will report `locked` even within the cron lag).
export type MarketStatus =
  | 'scheduled'
  | 'open'
  | 'locked'
  | 'resolved'
  | 'cancelled'
  | 'voided';

// Denormalized colour triplet for a category. Mirrors `GET /categories`
// (BACKEND.md §1) so screens never have to import the static palette table.
export type CategoryMeta = {
  primaryColor: string;
  softColor: string;
  glowColor: string;
};

// Anonymous stakers are excluded from `recentStakers` per BACKEND.md §2 —
// they still count toward `recentStakersCount`. Username is included so the
// avatar stack can display initials without another lookup.
export type RecentStaker = {
  userId: string;
  displayName: string | null;
  username: string;
  avatarColor: string;
};

export type Market = {
  id: string;
  slug: string;
  question: string;
  category: string;
  status: MarketStatus;
  totalPoolKobo: string;
  bettorCount: number;
  commentCount: number;
  closesAt: string;
  featured: boolean;
  outcomes: Outcome[];
  lastComment: LastComment;
  imageUrl: string | null;
  // ── v2 alive fields (BACKEND.md §2). All optional so an older backend
  //    payload still parses; consumers must defensively fall back. ────────
  categoryMeta?: CategoryMeta;
  volatilityScore?: number;            // 0..1
  last24hPoolDeltaKobo?: string;
  last24hPoolDeltaPct?: number;
  last1hPoolDeltaKobo?: string;
  last1hPoolDeltaPct?: number;
  sparkline24h?: number[];             // 24 pool-ratio percent points
  recentStakers?: RecentStaker[];
  recentStakersCount?: number;
  // BACKEND.md §9 — Drama Mode late-fee pot, displayed on the detail screen.
  lateFeePoolKobo?: string | null;
};

const AVATAR_PALETTE = [
  '#E040FB',
  '#29B6F6',
  '#FF7043',
  '#66BB6A',
  '#FFA726',
  '#AB47BC',
] as const;

// Deterministic single-color avatar based on a stable id (e.g. userId, marketId).
export function getAvatarColor(id: string): string {
  const cleaned = (id ?? '').replace(/[^a-z0-9]/gi, '');
  if (cleaned.length === 0) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = (hash * 31 + cleaned.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function getInitial(displayName: string | null | undefined, username: string): string {
  const src = (displayName?.trim() || username || '?').trim();
  return src.charAt(0).toUpperCase();
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  if (diff < 45_000) return 'just now';
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo ago`;
  return `${Math.floor(diff / (365 * day))}y ago`;
}

function safeBigInt(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function getOutcomePercent(
  outcomeStakedKobo: string,
  totalPoolKobo: string
): number | null {
  const total = safeBigInt(totalPoolKobo);
  const part = safeBigInt(outcomeStakedKobo);
  if (total === null || part === null) return null;
  if (total === 0n || part === 0n) return null;
  // Multiply by 10000 to keep two decimals of precision before dividing.
  const scaled = (part * 10000n) / total;
  return Math.round(Number(scaled) / 100);
}

export function getOutcomeMultiplier(
  outcomeStakedKobo: string,
  totalPoolKobo: string
): number | null {
  const total = safeBigInt(totalPoolKobo);
  const part = safeBigInt(outcomeStakedKobo);
  if (total === null || part === null) return null;
  if (part === 0n) return null;
  const scaled = (total * 10n) / part;
  return Math.round(Number(scaled)) / 10;
}

export function formatClosesIn(closesAt: string): string {
  const target = new Date(closesAt).getTime();
  if (Number.isNaN(target)) return 'Closed';
  const diffMs = target - Date.now();
  if (diffMs <= 0) return 'Closed';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= day) {
    const days = Math.floor(diffMs / day);
    return `Closes in ${days}d`;
  }
  if (diffMs >= hour) {
    const hours = Math.floor(diffMs / hour);
    const mins = Math.floor((diffMs % hour) / minute);
    return mins > 0 ? `Closes in ${hours}h ${mins}m` : `Closes in ${hours}h`;
  }
  const mins = Math.max(1, Math.floor(diffMs / minute));
  return `Closes in ${mins}m`;
}

export function getMostPicked(outcomes: Outcome[]): Outcome | null {
  if (!outcomes || outcomes.length === 0) return null;
  let best: Outcome | null = null;
  let bestStake = -1n;
  for (const o of outcomes) {
    const stake = safeBigInt(o.totalStakedKobo);
    if (stake === null) continue;
    if (stake > bestStake) {
      bestStake = stake;
      best = o;
    }
  }
  if (!best || bestStake <= 0n) return null;
  return best;
}

export function getUnderdog(outcomes: Outcome[]): Outcome | null {
  if (!outcomes || outcomes.length === 0) return null;
  let worst: Outcome | null = null;
  let worstStake: bigint | null = null;
  for (const o of outcomes) {
    const stake = safeBigInt(o.totalStakedKobo);
    if (stake === null || stake <= 0n) continue;
    if (worstStake === null || stake < worstStake) {
      worstStake = stake;
      worst = o;
    }
  }
  return worst;
}

export function hasPool(totalPoolKobo: string): boolean {
  const total = safeBigInt(totalPoolKobo);
  return total !== null && total > 0n;
}

// Compact naira formatter: 1_200_000 kobo -> "₦12K", 487_200_00 kobo -> "₦487K", etc.
export function formatPoolKobo(totalPoolKobo: string): string {
  const total = safeBigInt(totalPoolKobo);
  if (total === null || total === 0n) return '₦0';
  const naira = total / 100n;
  const n = Number(naira);
  if (!Number.isFinite(n)) {
    return `₦${naira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `₦${n}`;
}

export function uniqueCategories(markets: Market[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const m of markets) {
    if (!seen.has(m.category)) {
      seen.add(m.category);
      list.push(m.category);
    }
  }
  return ['All', ...list];
}

export function shouldRenderFullCard(market: Market): boolean {
  return market.featured || market.outcomes.length > 2;
}

// N-ary outcome colors. Index 0 is intentionally NOT brand orange — orange is
// reserved for actions. These are identity colors only.
export const OUTCOME_PALETTE = [
  '#3B82F6',
  '#A855F7',
  '#06B6D4',
  '#F472B6',
  '#0EA5E9',
] as const;

export function outcomeColor(index: number): string {
  return OUTCOME_PALETTE[index % OUTCOME_PALETTE.length];
}

// Binary side identity. Less-loaded pairs only — no green/red, no
// good/bad coding. Deterministically picked per market so a given market
// always reads the same colors across sessions.
export const BINARY_COLOR_SCHEMES = [
  ['#3B82F6', '#F472B6'] as const, // cobalt / rose
  ['#06B6D4', '#A855F7'] as const, // cyan / violet
  ['#0EA5E9', '#FB7185'] as const, // sky / coral
  ['#22D3EE', '#C084FC'] as const, // aqua / lavender
] as const;

export type BinaryScheme = readonly [string, string];

export function getCardSchemeColors(marketId: string, category?: string | null): BinaryScheme {
  // Bundle 1: if a category is supplied, derive a deterministic pair where
  // the LEADER takes the category's primary identity colour and the TRAILER
  // takes a hash-picked neutral counterpart. This keeps a Politics market
  // visually distinct from a Sports market without sacrificing per-market
  // randomness on the trailer half.
  const cleaned = (marketId ?? '').replace(/[^a-z0-9]/gi, '');
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    hash = (hash * 31 + cleaned.charCodeAt(i)) >>> 0;
  }
  if (category) {
    const accent = getCategoryAccent(category).primary;
    const trailerPool = ['#A78BFA', '#F472B6', '#06B6D4', '#FBBF24', '#7DD3FC', '#10E0A0'];
    const trailer = trailerPool[hash % trailerPool.length];
    return [accent, trailer === accent ? trailerPool[(hash + 1) % trailerPool.length] : trailer] as const;
  }
  if (cleaned.length === 0) return BINARY_COLOR_SCHEMES[0];
  return BINARY_COLOR_SCHEMES[hash % BINARY_COLOR_SCHEMES.length];
}

export function isClosingSoon(closesAt: string): boolean {
  const target = new Date(closesAt).getTime();
  if (Number.isNaN(target)) return false;
  return target - Date.now() < 24 * 60 * 60 * 1000;
}
