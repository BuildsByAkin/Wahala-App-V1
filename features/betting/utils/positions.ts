// features/betting/utils/positions.ts
// Pure helpers for collapsing the raw /me/bets feed (one row per stake action)
// into "positions" — one card per (market, outcome) the user is currently in.
import type { MyBet } from '@/features/betting/api/betting-api';

export type Position = {
  marketId: string;
  marketQuestion: string;
  marketSlug: string;
  outcomeId: string;
  outcomeLabel: string;
  // Sum of every active stake the user added on this outcome.
  totalStakeKobo: string;
  // Number of "add money" actions, useful to surface in the UI.
  entryCount: number;
  // The freshest multiplier we have for this outcome (last bet wins).
  // null when the outcome has zero pool — render "—".
  latestMultiplier: number | null;
  // ISO of the most recent bet, used for sort.
  lastBetAt: string;
};

export function groupBetsIntoPositions(bets: MyBet[]): Position[] {
  // Only "active" bets aggregate into open positions; settled bets belong to
  // history. Keep this guard explicit so callers can pass an unfiltered list.
  const active = bets.filter((b) => b.status === 'active');

  const map = new Map<string, Position>();
  for (const b of active) {
    const key = `${b.marketId}::${b.outcomeId}`;
    const existing = map.get(key);
    const stake = safeBigInt(b.stakeKobo);

    if (!existing) {
      map.set(key, {
        marketId: b.marketId,
        marketQuestion: b.marketQuestion,
        marketSlug: b.marketSlug,
        outcomeId: b.outcomeId,
        outcomeLabel: b.outcomeLabel,
        totalStakeKobo: stake.toString(),
        entryCount: 1,
        latestMultiplier: b.multiplier,
        lastBetAt: b.createdAt,
      });
      continue;
    }

    const newer =
      new Date(b.createdAt).getTime() > new Date(existing.lastBetAt).getTime();
    map.set(key, {
      ...existing,
      totalStakeKobo: (safeBigInt(existing.totalStakeKobo) + stake).toString(),
      entryCount: existing.entryCount + 1,
      latestMultiplier: newer ? b.multiplier : existing.latestMultiplier,
      lastBetAt: newer ? b.createdAt : existing.lastBetAt,
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastBetAt).getTime() - new Date(a.lastBetAt).getTime()
  );
}

// stake * multiplier with 4-decimal precision via BigInt micro-units.
// Multiplier may be `null` (no liquidity yet), `NaN`, `Infinity`, or <= 0 —
// in any of those cases we return the stake unchanged. `BigInt(Math.round(NaN))`
// and `BigInt(Math.round(Infinity))` both throw RangeError, hence the guard.
export function estimatePayoutKobo(
  stakeKoboString: string,
  multiplier: number | null
): string {
  const stake = safeBigInt(stakeKoboString);
  if (stake <= 0n) return '0';
  if (multiplier === null || !Number.isFinite(multiplier) || multiplier <= 0) {
    return stake.toString();
  }
  const micro = BigInt(Math.round(multiplier * 10_000));
  if (micro <= 0n) return stake.toString();
  return ((stake * micro) / 10_000n).toString();
}

export function sumStakesKobo(items: { stakeKobo: string }[]): string {
  let total = 0n;
  for (const it of items) total += safeBigInt(it.stakeKobo);
  return total.toString();
}

function safeBigInt(v: string | null | undefined): bigint {
  if (!v) return 0n;
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
}
