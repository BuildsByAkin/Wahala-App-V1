// components/home/MarketCardFull.tsx
// Feed full card. Top→bottom anatomy (REDESIGN.md §5.1):
//   1. Meta strip — category accent bar + label, closes-in.
//   2. Question + bleed thumb (image flush to right with rounded radius).
//   3. Combined two-segment rail with embedded percentages, drawn over a
//      24-tick sparkline at 30% opacity.
//   4. Avatar stack + crumbs (pool, comments).
//   5. Dual inline stake CTAs (left = leader, right = trailer) — opens detail.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

import { Colors, getCategoryAccent } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import {
  type Market,
  type Outcome,
  type RecentStaker,
  formatClosesIn,
  formatPoolKobo,
  getOutcomeMultiplier,
  getOutcomePercent,
  hasPool,
  isClosingSoon,
} from '@/utils/market';

import { CombinedRail } from '@/components/home/CombinedRail';
import { Sparkline } from '@/components/home/Sparkline';
import { AvatarStack, type AvatarStackEntry } from '@/components/home/AvatarStack';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { StateVariantChip, type StateVariant } from '@/components/home/StateVariantChip';

export type MarketCardCtaVariant = 'stake' | 'view';

interface MarketCardFullProps {
  market: Market;
  ctaVariant?: MarketCardCtaVariant;
  onPressLeader?: () => void;
  onPressTrailer?: () => void;
  /** Lifecycle / footprint chip (just-staked, closing-soon, …). */
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

function deriveStackers(market: Market): AvatarStackEntry[] {
  // Prefer server-provided recent stakers (BACKEND.md §2). Fall back to a
  // deterministic synthesized stack when the field is absent so older
  // backends still render.
  const real = market.recentStakers;
  if (real && real.length > 0) {
    return real.map<AvatarStackEntry>((s: RecentStaker) => ({
      id: s.userId,
      initial: (s.displayName?.trim() || s.username || '·').charAt(0).toUpperCase(),
    }));
  }
  const seed = market.id;
  const initials = ['A', 'C', 'I', 'O', 'S', 'M', 'D', 'F'];
  const count = Math.min(5, Math.max(2, market.bettorCount));
  const entries: AvatarStackEntry[] = [];
  for (let i = 0; i < count; i++) {
    entries.push({ id: `${seed}-${i}`, initial: initials[i % initials.length] });
  }
  return entries;
}

export const MarketCardFull: React.FC<MarketCardFullProps> = ({
  market,
  ctaVariant = 'view',
  onPressLeader,
  onPressTrailer,
  stateVariant,
}) => {
  const poolExists = hasPool(market.totalPoolKobo);
  const closesLabel = formatClosesIn(market.closesAt);
  const isSoon = isClosingSoon(market.closesAt);
  // Prefer the server-denormalized categoryMeta when present (BACKEND.md §1).
  // Falls back to the local palette so an older backend still renders branded.
  const accent =
    market.categoryMeta?.primaryColor ?? getCategoryAccent(market.category).primary;
  const trailerAccent = Colors.category.gist.primary;
  const resolved = market.status === 'resolved' || market.status === 'cancelled' || market.status === 'voided';

  const ranked = useMemo(() => rankOutcomes(market.outcomes), [market.outcomes]);
  const leader = ranked[0];
  const trailer = ranked[1];
  const hiddenCount = Math.max(0, ranked.length - 2);

  const leaderPct = leader && poolExists
    ? getOutcomePercent(leader.totalStakedKobo, market.totalPoolKobo) ?? 50
    : 50;
  const trailerPct = 100 - leaderPct;

  const leaderMult = leader && poolExists
    ? getOutcomeMultiplier(leader.totalStakedKobo, market.totalPoolKobo)
    : null;
  const trailerMult = trailer && poolExists
    ? getOutcomeMultiplier(trailer.totalStakedKobo, market.totalPoolKobo)
    : null;

  const sparkSeed = `${market.id}-${leaderPct}`;

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
        <View style={styles.metaLeft}>
          <Text style={[styles.category, { color: accent }]}>
            {market.category.toUpperCase()}
          </Text>
          {market.featured && <Text style={styles.trending}>· TRENDING</Text>}
          {typeof market.last1hPoolDeltaPct === 'number' &&
          Math.abs(market.last1hPoolDeltaPct) >= 1 ? (
            <View
              style={[
                styles.deltaPill,
                {
                  backgroundColor: `${accent}1A`,
                  borderColor: `${accent}55`,
                },
              ]}
            >
              <Feather
                name={market.last1hPoolDeltaPct >= 0 ? 'trending-up' : 'trending-down'}
                size={rs.font(10)}
                color={accent}
              />
              <Text style={[styles.deltaText, { color: accent }]}>
                {market.last1hPoolDeltaPct >= 0 ? '+' : ''}
                {Math.round(market.last1hPoolDeltaPct)}% 1h
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.closesIn}>
          <Feather
            name="clock"
            size={rs.font(11)}
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

      {/* 2. Question + image */}
      <View style={styles.questionRow}>
        <Text style={styles.question} numberOfLines={3}>
          {market.question}
        </Text>
        {market.imageUrl ? (
          <Image
            source={{ uri: market.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            accessibilityLabel={`Image for ${market.question}`}
          />
        ) : null}
      </View>

      {/* 3. Sparkline + Combined rail. Sparkline is absolutely positioned
            behind the rail at 30% opacity, the rail sits on top. */}
      {leader && trailer ? (
        <View style={styles.railLayer}>
          <View style={styles.sparkLayer} pointerEvents="none">
            <Sparkline
              series={market.sparkline24h}
              seed={sparkSeed}
              width={rs.size(320)}
              height={rs.size(32)}
              color={accent}
              opacity={0.3}
            />
          </View>
          <CombinedRail
            leaderLabel={leader.label}
            leaderPercent={leaderPct}
            leaderColor={accent}
            trailerLabel={trailer.label}
            trailerPercent={trailerPct}
            trailerColor={trailerAccent}
            height={rs.size(28)}
            still={resolved}
          />
        </View>
      ) : null}

      {hiddenCount > 0 ? (
        <View style={styles.moreOutcomes}>
          <Text style={styles.moreText}>+{hiddenCount} more options</Text>
          <Feather name="chevron-down" size={rs.font(11)} color={Colors.text.tertiary} />
        </View>
      ) : null}

      {/* 4. Avatar stack + crumbs */}
      <View style={styles.metaStrip}>
        {market.bettorCount > 0 ? (
          <AvatarStack entries={deriveStackers(market)} total={market.bettorCount} />
        ) : null}
        {poolExists ? (
          <Text style={styles.metaItem}>
            <Text style={styles.metaStrong}>  {formatPoolKobo(market.totalPoolKobo)}</Text>
            <Text style={styles.metaSoft}> pool</Text>
          </Text>
        ) : (
          <Text style={styles.firstStake}>  Be the first to stake</Text>
        )}
        <View style={styles.metaInline}>
          <Feather
            name="message-square"
            size={rs.font(11)}
            color={Colors.text.tertiary}
            style={styles.metaIcon}
          />
          <Text style={styles.metaSoftInline}>{market.commentCount}</Text>
        </View>
      </View>

      {/* 5. Dual inline CTAs (only when staking is available). */}
      {ctaVariant === 'stake' && leader && trailer && !resolved ? (
        <View style={styles.ctaRow}>
          <PressableSpring
            variant="primary"
            haptic="medium"
            onPress={onPressLeader}
            style={[
              styles.cta,
              { backgroundColor: `${accent}26`, borderColor: `${accent}66` },
            ]}
            accessibilityLabel={`Stake ${leader.label}`}
          >
            <Text style={[styles.ctaLabel, { color: accent }]} numberOfLines={1}>
              Stake {leader.label}
            </Text>
            {leaderMult ? (
              <Text style={[styles.ctaMult, { color: accent }]}>{leaderMult}x</Text>
            ) : null}
          </PressableSpring>
          <PressableSpring
            variant="primary"
            haptic="medium"
            onPress={onPressTrailer}
            style={[
              styles.cta,
              { backgroundColor: `${trailerAccent}1A`, borderColor: `${trailerAccent}55` },
            ]}
            accessibilityLabel={`Stake ${trailer.label}`}
          >
            <Text style={[styles.ctaLabel, { color: trailerAccent }]} numberOfLines={1}>
              Stake {trailer.label}
            </Text>
            {trailerMult ? (
              <Text style={[styles.ctaMult, { color: trailerAccent }]}>{trailerMult}x</Text>
            ) : null}
          </PressableSpring>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(18),
    padding: rs.size(16),
    borderWidth: 1,
    borderColor: Colors.border.s01,
    overflow: 'hidden',
    gap: rs.size(10),
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
    borderTopLeftRadius: rs.size(18),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rs.size(2),
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
    flexShrink: 1,
  },
  category: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.9,
  },
  trending: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: Colors.brand,
    letterSpacing: 0.6,
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
  questionRow: {
    marginTop: rs.size(4),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(12),
  },
  question: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
    lineHeight: rs.font(25),
    letterSpacing: -0.2,
  },
  thumb: {
    width: rs.size(64),
    height: rs.size(64),
    borderRadius: rs.size(14),
    backgroundColor: Colors.surface['00'],
  },
  railLayer: {
    marginTop: rs.size(6),
    justifyContent: 'center',
  },
  sparkLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreOutcomes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(4),
    marginTop: rs.size(-4),
  },
  moreText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    letterSpacing: 0.2,
  },
  metaStrip: {
    marginTop: rs.size(4),
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: rs.size(6),
  },
  metaItem: {
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
  metaSoftInline: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: rs.size(4),
  },
  metaIcon: {
    marginTop: rs.size(1),
  },
  firstStake: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.brand,
  },
  ctaRow: {
    marginTop: rs.size(6),
    flexDirection: 'row',
    gap: rs.size(10),
  },
  cta: {
    flex: 1,
    height: rs.size(48),
    borderRadius: rs.size(999),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs.size(6),
    paddingHorizontal: rs.size(12),
  },
  ctaLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
  },
  ctaMult: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    fontVariant: ['tabular-nums'],
    opacity: 0.85,
  },
  chipRow: {
    marginTop: rs.size(-2),
    flexDirection: 'row',
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(3),
    paddingHorizontal: rs.size(6),
    paddingVertical: rs.size(2),
    borderRadius: rs.size(999),
    borderWidth: 1,
    marginLeft: rs.size(4),
  },
  deltaText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.3,
  },
});
