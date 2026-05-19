// components/home/MarketCardCompact.tsx
// Compact feed card — 75% of feed scroll volume (REDESIGN.md §5.2). Same
// DNA as MarketCardFull but no image, no sparkline, single right-aligned
// Stake pill, avatar stack collapses to "👥 N stakers" count.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors, getCategoryAccent } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import {
  type Market,
  type Outcome,
  formatClosesIn,
  formatPoolKobo,
  getOutcomePercent,
  hasPool,
  isClosingSoon,
} from '@/utils/market';
import { CombinedRail } from '@/components/home/CombinedRail';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { StateVariantChip, type StateVariant } from '@/components/home/StateVariantChip';
import type { MarketCardCtaVariant } from './MarketCardFull';

interface MarketCardCompactProps {
  market: Market;
  ctaVariant?: MarketCardCtaVariant;
  onPressStake?: () => void;
  stateVariant?: StateVariant | null;
}

function rankOutcomes(outcomes: Outcome[]): Outcome[] {
  return [...outcomes].sort((a, b) => {
    try {
      return BigInt(b.totalStakedKobo) > BigInt(a.totalStakedKobo) ? 1 : -1;
    } catch {
      return 0;
    }
  });
}

export const MarketCardCompact: React.FC<MarketCardCompactProps> = ({
  market,
  ctaVariant = 'view',
  onPressStake,
  stateVariant,
}) => {
  const poolExists = hasPool(market.totalPoolKobo);
  const closesLabel = formatClosesIn(market.closesAt);
  const isSoon = isClosingSoon(market.closesAt);
  // Prefer the server-denormalized categoryMeta (BACKEND.md §1); fall back to
  // the local palette so older payloads still render branded.
  const accent =
    market.categoryMeta?.primaryColor ?? getCategoryAccent(market.category).primary;
  // Server-provided count wins; falls back to bettorCount when the v2 alive
  // field isn't on the payload yet (BACKEND.md §2).
  const stakersCount = market.recentStakersCount ?? market.bettorCount;
  const trailerAccent = Colors.category.gist.primary;
  const resolved =
    market.status === 'resolved' ||
    market.status === 'cancelled' ||
    market.status === 'voided';

  const ranked = useMemo(() => rankOutcomes(market.outcomes), [market.outcomes]);
  const leader = ranked[0];
  const trailer = ranked[1];

  const leaderPct = leader && poolExists
    ? getOutcomePercent(leader.totalStakedKobo, market.totalPoolKobo) ?? 50
    : 50;
  const trailerPct = 100 - leaderPct;

  return (
    <View
      style={[
        styles.container,
        resolved && styles.containerResolved,
        isSoon && !resolved && { borderColor: `${accent}88` },
      ]}
    >
      {/* Category accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      {/* 1. Meta strip */}
      <View style={styles.metaRow}>
        <Text style={[styles.category, { color: accent }]}>
          {market.category.toUpperCase()}
        </Text>
        <View style={styles.closesIn}>
          <Feather
            name="clock"
            size={rs.font(10)}
            color={isSoon ? accent : Colors.text.tertiary}
          />
          <Text
            style={[
              styles.closesText,
              isSoon && { color: accent, fontFamily: Fonts.semibold },
            ]}
          >
            {closesLabel}
          </Text>
        </View>
      </View>

      {stateVariant ? (
        <View style={styles.chipRow}>
          <StateVariantChip variant={stateVariant} />
        </View>
      ) : null}

      {/* 2. Question */}
      <Text style={styles.question} numberOfLines={2}>
        {market.question}
      </Text>

      {/* 3. Combined rail (no sparkline in compact) */}
      {leader && trailer ? (
        <CombinedRail
          leaderLabel={leader.label}
          leaderPercent={leaderPct}
          leaderColor={accent}
          trailerLabel={trailer.label}
          trailerPercent={trailerPct}
          trailerColor={trailerAccent}
          height={rs.size(24)}
          still={resolved}
        />
      ) : null}

      {/* 4. Footer — stakers count + pool + single Stake CTA */}
      <View style={styles.footer}>
        <Text style={styles.metaSoft}>
          <Text style={styles.metaIcon}>👥 </Text>
          <Text style={styles.metaStrong}>
            {stakersCount.toLocaleString('en-NG')}
          </Text>
          <Text style={styles.metaSoft}> stakers</Text>
        </Text>
        {poolExists ? (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaStrong}>{formatPoolKobo(market.totalPoolKobo)}</Text>
            <Text style={styles.metaSoft}> pool</Text>
          </>
        ) : null}

        {ctaVariant === 'stake' && !resolved ? (
          <PressableSpring
            variant="primary"
            haptic="medium"
            onPress={onPressStake}
            style={[
              styles.stakePill,
              { backgroundColor: `${accent}26`, borderColor: `${accent}66` },
            ]}
            accessibilityLabel="Stake on this market"
          >
            <Text style={[styles.stakeText, { color: accent }]}>Stake</Text>
            <Feather name="chevron-right" size={rs.font(13)} color={accent} />
          </PressableSpring>
        ) : (
          <View style={styles.chevronOnly}>
            <Feather
              name="chevron-right"
              size={rs.font(13)}
              color={Colors.text.tertiary}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(16),
    padding: rs.size(12),
    borderWidth: 1,
    borderColor: Colors.border.s01,
    overflow: 'hidden',
    gap: rs.size(8),
  },
  containerResolved: {
    opacity: 0.55,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: rs.size(24),
    height: rs.size(3),
    borderTopLeftRadius: rs.size(16),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rs.size(2),
  },
  category: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.9,
  },
  closesIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  closesText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
  },
  question: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
    lineHeight: rs.font(20),
    letterSpacing: -0.1,
  },
  footer: {
    marginTop: rs.size(2),
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: rs.size(2),
  },
  metaIcon: {
    fontSize: rs.font(12),
  },
  metaStrong: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.primary,
  },
  metaSoft: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
  metaDot: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
    paddingHorizontal: rs.size(4),
  },
  stakePill: {
    marginLeft: 'auto',
    height: rs.size(32),
    paddingHorizontal: rs.size(12),
    borderRadius: rs.size(999),
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  stakeText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 0.2,
  },
  chevronOnly: {
    marginLeft: 'auto',
    paddingVertical: rs.size(6),
    paddingHorizontal: rs.size(4),
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: rs.size(-2),
  },
});
