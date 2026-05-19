// components/home/HeroPulseCard.tsx
// The 250dp showpiece sitting at the top of the home feed.
//   - surface/02 with a category-coloured radial glow bleeding from top-right
//   - LIVE pulse dot
//   - bleed image clipped on three sides
//   - combined two-segment rail (RailBreathe) with TickFlash %
//   - PoolPulse on pool growth
//   - dual inline stake CTAs that route straight into detail/stake sheet
// See REDESIGN.md §4.3.
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
// Note: `Feather` covers the trending-up / trending-down glyphs used by the
// "+N% in last hour" pill below (BACKEND.md §2).
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { Colors, getCategoryAccent } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CombinedRail } from '@/components/home/CombinedRail';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { TickFlash } from '@/components/motion/TickFlash';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';
import {
  type Market,
  formatClosesIn,
  formatPoolKobo,
  getOutcomeMultiplier,
  getOutcomePercent,
  hasPool,
} from '@/utils/market';

interface HeroPulseCardProps {
  market: Market;
}

export const HeroPulseCard: React.FC<HeroPulseCardProps> = ({ market }) => {
  const router = useRouter();
  const reduced = useReducedMotion();
  // Prefer the server-denormalized categoryMeta (BACKEND.md §1); fall back to
  // the local palette so older payloads still render branded.
  const accent =
    market.categoryMeta?.primaryColor ?? getCategoryAccent(market.category).primary;
  const last1h = market.last1hPoolDeltaPct;
  const showDelta = typeof last1h === 'number' && Math.abs(last1h) >= 1;

  const ranked = useMemo(() => {
    return [...market.outcomes].sort((a, b) => {
      try {
        return BigInt(b.totalStakedKobo) > BigInt(a.totalStakedKobo) ? 1 : -1;
      } catch {
        return 0;
      }
    });
  }, [market.outcomes]);

  const leader = ranked[0];
  const trailer = ranked[1];
  const pool = hasPool(market.totalPoolKobo);

  const leaderPct = leader && pool
    ? getOutcomePercent(leader.totalStakedKobo, market.totalPoolKobo) ?? 50
    : 50;
  const trailerPct = 100 - leaderPct;

  const leaderMult = leader && pool
    ? getOutcomeMultiplier(leader.totalStakedKobo, market.totalPoolKobo)
    : null;
  const trailerMult = trailer && pool
    ? getOutcomeMultiplier(trailer.totalStakedKobo, market.totalPoolKobo)
    : null;

  // PoolPulse — bump the pool number when it grows.
  const poolScale = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    poolScale.value = withSequence(
      withTiming(1.04, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(1, time.standard)
    );
  }, [market.totalPoolKobo, reduced, poolScale]);
  const poolStyle = useAnimatedStyle(() => ({ transform: [{ scale: poolScale.value }] }));

  // LIVE pulsing dot.
  const livePulse = useSharedValue(1);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(livePulse);
      livePulse.value = 1;
      return;
    }
    livePulse.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(livePulse);
  }, [reduced, livePulse]);
  const liveDotStyle = useAnimatedStyle(() => ({ opacity: livePulse.value }));

  const open = () => router.push(`/market/${market.slug}` as never);

  return (
    <PressableSpring
      variant="ghost"
      haptic="tap"
      onPress={open}
      style={[styles.card, { borderColor: Colors.border.s02 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open hero market: ${market.question}`}
      accessibilityHint="Opens the market detail screen"
    >
      {/* Radial glow — three Svg stops in the category colour, top-right. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="glow" cx="92%" cy="8%" r="70%">
              <Stop offset="0%" stopColor={accent} stopOpacity={0.35} />
              <Stop offset="40%" stopColor={accent} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#glow)" />
        </Svg>
      </View>

      {/* Meta strip */}
      <View style={styles.metaRow}>
        <View style={[styles.categoryPill, { backgroundColor: `${accent}22`, borderColor: `${accent}55` }]}>
          <Text style={[styles.categoryText, { color: accent }]}>
            {market.category.toUpperCase()}
          </Text>
        </View>
        <View style={styles.liveRow}>
          <Animated.View style={[styles.liveDot, { backgroundColor: accent }, liveDotStyle]} />
          <Text style={[styles.liveText, { color: accent }]}>LIVE</Text>
        </View>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.closes}>{formatClosesIn(market.closesAt)}</Text>
        {showDelta ? (
          <View
            style={[
              styles.deltaPill,
              { backgroundColor: `${accent}1F`, borderColor: `${accent}66` },
            ]}
            accessibilityLabel={`Pool ${last1h! >= 0 ? 'up' : 'down'} ${Math.round(
              Math.abs(last1h!)
            )} percent in the last hour`}
          >
            <Feather
              name={last1h! >= 0 ? 'trending-up' : 'trending-down'}
              size={rs.font(11)}
              color={accent}
            />
            <Text style={[styles.deltaText, { color: accent }]}>
              {last1h! >= 0 ? '+' : ''}
              {Math.round(last1h!)}% 1h
            </Text>
          </View>
        ) : null}
      </View>

      {/* Question + bleed image */}
      <View style={styles.body}>
        <Text style={styles.question} numberOfLines={3}>
          {market.question}
        </Text>
        {market.imageUrl ? (
          <Image
            source={{ uri: market.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={220}
            cachePolicy="memory-disk"
            accessibilityLabel={`Image for ${market.question}`}
          />
        ) : null}
      </View>

      {/* Combined rail */}
      {leader && trailer ? (
        <View style={styles.railWrap}>
          <CombinedRail
            leaderLabel={leader.label}
            leaderPercent={leaderPct}
            leaderColor={accent}
            trailerLabel={trailer.label}
            trailerPercent={trailerPct}
            trailerColor={Colors.category.gist.primary}
            height={rs.size(34)}
          />
        </View>
      ) : null}

      {/* Volume crumb */}
      <View style={styles.crumb}>
        <Text style={styles.crumbStrong}>{market.bettorCount}</Text>
        <Text style={styles.crumbMuted}> staking now · </Text>
        <Animated.View style={poolStyle}>
          <TickFlash
            value={Number(market.totalPoolKobo) || 0}
            format={() => formatPoolKobo(market.totalPoolKobo)}
            style={styles.crumbStrong}
          />
        </Animated.View>
        <Text style={styles.crumbMuted}> pool</Text>
      </View>

      {/* Dual inline CTAs */}
      <View style={styles.ctaRow}>
        <PressableSpring
          variant="primary"
          haptic="medium"
          onPress={open}
          style={[styles.cta, { backgroundColor: `${accent}2A`, borderColor: `${accent}66` }]}
          accessibilityLabel={`Stake ${leader?.label ?? 'leader'}`}
        >
          <Text style={[styles.ctaLabel, { color: accent }]} numberOfLines={1}>
            Stake {leader?.label ?? 'YES'}
          </Text>
          {leaderMult ? (
            <Text style={[styles.ctaMult, { color: accent }]}>{leaderMult}x</Text>
          ) : null}
        </PressableSpring>
        <PressableSpring
          variant="primary"
          haptic="medium"
          onPress={open}
          style={[
            styles.cta,
            {
              backgroundColor: `${Colors.category.gist.primary}1A`,
              borderColor: `${Colors.category.gist.primary}55`,
            },
          ]}
          accessibilityLabel={`Stake ${trailer?.label ?? 'trailer'}`}
        >
          <Text style={[styles.ctaLabel, { color: Colors.category.gist.primary }]} numberOfLines={1}>
            Stake {trailer?.label ?? 'NO'}
          </Text>
          {trailerMult ? (
            <Text style={[styles.ctaMult, { color: Colors.category.gist.primary }]}>
              {trailerMult}x
            </Text>
          ) : null}
        </PressableSpring>
      </View>

      {/* Single tap target overlay to open detail (uses chevron affordance). */}
      <View style={styles.openHint} pointerEvents="none">
        <Feather name="chevron-right" size={rs.font(14)} color={Colors.text.tertiary} />
      </View>
    </PressableSpring>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: rs.size(16),
    marginTop: rs.size(8),
    padding: rs.size(16),
    borderRadius: rs.size(20),
    borderWidth: 1,
    backgroundColor: Colors.surface['02'],
    overflow: 'hidden',
    gap: rs.size(10),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  categoryPill: {
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(3),
    borderRadius: rs.size(999),
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.8,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  liveDot: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
  },
  liveText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.8,
  },
  dot: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
  },
  closes: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: Colors.text.secondary,
  },
  deltaPill: {
    marginLeft: rs.size(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(3),
    paddingHorizontal: rs.size(7),
    paddingVertical: rs.size(2),
    borderRadius: rs.size(999),
    borderWidth: 1,
  },
  deltaText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(12),
  },
  question: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    color: Colors.text.primary,
    lineHeight: rs.font(28),
    letterSpacing: -0.4,
  },
  image: {
    width: rs.size(96),
    height: rs.size(96),
    borderRadius: rs.size(14),
    backgroundColor: Colors.surface['01'],
  },
  railWrap: {
    marginTop: rs.size(6),
  },
  crumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  crumbStrong: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  crumbMuted: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: rs.size(10),
    marginTop: rs.size(2),
  },
  cta: {
    flex: 1,
    height: rs.size(52),
    borderRadius: rs.size(999),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs.size(6),
    paddingHorizontal: rs.size(10),
  },
  ctaLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    letterSpacing: 0.2,
  },
  ctaMult: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    fontVariant: ['tabular-nums'],
    opacity: 0.85,
  },
  openHint: {
    position: 'absolute',
    bottom: rs.size(10),
    right: rs.size(10),
  },
});
