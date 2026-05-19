// utils/marketStateVariant.ts
// Pure derivation of a `StateVariant` for a market card based on lifecycle +
// the user's most recent bet on that market. The card component itself stays
// dumb — callers decide policy here.
import { getCategoryAccent } from '@/constants/colors';
import { formatPoolKobo, type Market } from '@/utils/market';
import type { MyBet } from '@/features/betting/api/betting-api';
import type { StateVariant } from '@/components/home/StateVariantChip';

const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;
const TWO_HOURS = 2 * 60 * 60 * 1000;

export interface DeriveOptions {
  /** All user bets — we filter inside. */
  myBets: MyBet[];
  /** "Now" override for tests. */
  now?: number;
}

export function deriveMarketStateVariant(
  market: Market,
  { myBets, now = Date.now() }: DeriveOptions
): StateVariant | null {
  const accent = getCategoryAccent(market.category).primary;
  const myBetsForMarket = myBets.filter((b) => b.marketId === market.id);
  const latest =
    myBetsForMarket.length > 0
      ? myBetsForMarket.reduce((a, b) =>
          new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? a : b
        )
      : null;

  // Resolved win/loss takes precedence.
  if (market.status === 'resolved' && latest) {
    if (latest.status === 'won') {
      return {
        kind: 'won',
        amount: formatPoolKobo(latest.payoutKobo ?? '0'),
      };
    }
    if (latest.status === 'lost') {
      return {
        kind: 'lost',
        amount: formatPoolKobo(latest.stakeKobo),
      };
    }
  }

  // Just-staked banner — for 24h after the latest bet on an open market.
  if (latest && market.status === 'open') {
    const ageMs = now - new Date(latest.createdAt).getTime();
    if (ageMs >= 0 && ageMs < TWENTY_FOUR_H) {
      return {
        kind: 'just-staked',
        sideLabel: latest.outcomeLabel,
        amount: formatPoolKobo(latest.stakeKobo),
        color: accent,
      };
    }
  }

  // Resolving today.
  const closesMs = new Date(market.closesAt).getTime();
  if (!Number.isNaN(closesMs)) {
    const untilClose = closesMs - now;
    if (market.status === 'open' && untilClose > 0 && untilClose <= TWO_HOURS) {
      const mins = Math.max(1, Math.floor(untilClose / 60_000));
      const label =
        mins >= 60 ? `Closes in ${Math.floor(mins / 60)}h ${mins % 60}m` : `Closes in ${mins}m`;
      return { kind: 'closing-soon', label, color: accent };
    }
    if (
      market.status === 'locked' ||
      (market.status === 'open' && untilClose > TWO_HOURS && untilClose < TWENTY_FOUR_H)
    ) {
      return { kind: 'resolving', color: accent };
    }
  }

  return null;
}
