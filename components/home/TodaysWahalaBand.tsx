// components/home/TodaysWahalaBand.tsx
// Daily-Wahala band (v2 Pillar 1). Lives at the top of home with a live
// countdown and two camp doors. Tapping a door fires CampDoorTap motion and
// routes to the market's detail screen for staking.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { Colors, getCategoryAccent } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { springs } from '@/lib/motion/springs';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';
import {
  type Market,
  type Outcome,
  hasPool,
} from '@/utils/market';

interface TodaysWahalaBandProps {
  /** The curated daily market. When null the band hides itself. */
  market: Market | null;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00h 00m 00s';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

const Door: React.FC<{
  outcome: Outcome;
  count: number;
  accent: string;
  onPress: () => void;
  dimmed: boolean;
  onPressed: () => void;
}> = ({ outcome, count, accent, onPress, dimmed, onPressed }) => {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(dimmed ? 0.7 : 1, time.standard);
    if (dimmed && !reduced) {
      scale.value = withTiming(0.96, time.standard);
    } else {
      scale.value = withTiming(1, time.standard);
    }
  }, [dimmed, reduced, opacity, scale]);

  const handlePress = useCallback(() => {
    if (!reduced) {
      scale.value = withSequence(
        withSpring(0.94, springs.snappy),
        withSpring(1.02, springs.bouncy),
        withSpring(1, springs.snappy)
      );
    }
    onPressed();
    onPress();
  }, [onPress, onPressed, reduced, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.door, { borderColor: `${accent}55` }, animStyle]}>
      <PressableSpring
        variant="primary"
        haptic="medium"
        onPress={handlePress}
        accessibilityLabel={`Join ${outcome.label} camp, ${count} people in`}
        style={[styles.doorInner, { backgroundColor: `${accent}1F` }]}
      >
        <Text style={[styles.doorLabel, { color: accent }]} numberOfLines={1}>
          JOIN {outcome.label.toUpperCase()}
        </Text>
        <Text style={styles.doorCount}>{count.toLocaleString('en-NG')}</Text>
      </PressableSpring>
    </Animated.View>
  );
};

export const TodaysWahalaBand: React.FC<TodaysWahalaBandProps> = ({ market }) => {
  const router = useRouter();
  const [now, setNow] = useState(Date.now());
  const [pressedSide, setPressedSide] = useState<'leader' | 'trailer' | null>(null);

  // Live tick. Drives the countdown copy.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    if (!market) return null;
    const [leader, trailer] = [...market.outcomes].sort((a, b) => {
      try {
        return BigInt(b.totalStakedKobo) > BigInt(a.totalStakedKobo) ? 1 : -1;
      } catch {
        return 0;
      }
    });
    if (!leader || !trailer) return null;
    // Prefer the server-denormalized categoryMeta (BACKEND.md §1).
    const accent =
      market.categoryMeta?.primaryColor ??
      getCategoryAccent(market.category).primary;
    const closesAt = new Date(market.closesAt).getTime();
    const countdown = Number.isFinite(closesAt) ? closesAt - now : 0;
    const pool = hasPool(market.totalPoolKobo);
    return { leader, trailer, accent, countdown, pool };
  }, [market, now]);

  if (!market || !data) return null;

  const goDetail = () => router.push(`/market/${market.slug}` as never);
  const goVerdict = () =>
    router.push({ pathname: '/daily-wahala/verdict', params: { slug: market.slug } } as never);
  const goPreview = () => router.push('/daily-wahala/preview' as never);

  // Post-resolution layout: replace the two camp doors with a
  // shareable-verdict CTA + tomorrow's preview link. (v2 Pillar 1.)
  const isResolved = market.status === 'resolved';

  return (
    <View
      style={[
        styles.band,
        { borderColor: `${data.accent}55`, backgroundColor: `${data.accent}10` },
      ]}
      accessibilityLabel="Today's Wahala"
    >
      <View style={styles.bandHeader}>
        <Text style={[styles.bandKicker, { color: data.accent }]}>
          ⚡ TODAY&apos;S WAHALA
        </Text>
        <Text style={styles.countdown}>
          {isResolved ? 'RESOLVED' : `${formatCountdown(data.countdown)} left`}
        </Text>
      </View>

      <Text style={styles.question} numberOfLines={3}>
        {market.question}
      </Text>

      {isResolved ? (
        <View style={styles.resolvedActions}>
          <PressableSpring
            variant="primary"
            haptic="medium"
            onPress={goVerdict}
            accessibilityLabel="Share your verdict card"
            style={[styles.shareBtn, { backgroundColor: data.accent }]}
          >
            <Feather name="share-2" size={rs.size(16)} color={Colors.text.onAction} />
            <Text style={styles.shareBtnLabel}>Share verdict</Text>
          </PressableSpring>
          <PressableSpring
            variant="ghost"
            haptic="tap"
            onPress={goPreview}
            accessibilityLabel="See tomorrow's preview"
            style={styles.previewBtn}
          >
            <Text style={[styles.previewBtnLabel, { color: data.accent }]}>
              Tomorrow&apos;s Wahala
            </Text>
            <Feather name="chevron-right" size={rs.size(14)} color={data.accent} />
          </PressableSpring>
        </View>
      ) : (
        <View style={styles.doors}>
          <Door
            outcome={data.leader}
            count={Math.max(1, Math.floor(market.bettorCount * 0.55))}
            accent={data.accent}
            onPress={goDetail}
            dimmed={pressedSide === 'trailer'}
            onPressed={() => setPressedSide('leader')}
          />
          <Door
            outcome={data.trailer}
            count={Math.max(1, Math.floor(market.bettorCount * 0.45))}
            accent={Colors.category.gist.primary}
            onPress={goDetail}
            dimmed={pressedSide === 'leader'}
            onPressed={() => setPressedSide('trailer')}
          />
        </View>
      )}

      <Text style={styles.footnote} numberOfLines={1}>
        {market.bettorCount.toLocaleString('en-NG')} are in · {market.commentCount} talking now.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  band: {
    marginHorizontal: rs.size(16),
    marginTop: rs.size(8),
    padding: rs.size(14),
    borderRadius: rs.size(20),
    borderWidth: 1,
    gap: rs.size(10),
  },
  bandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bandKicker: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 1.2,
  },
  countdown: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  question: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: Colors.text.primary,
    letterSpacing: -0.3,
    lineHeight: rs.font(26),
  },
  doors: {
    flexDirection: 'row',
    gap: rs.size(10),
    marginTop: rs.size(4),
  },
  door: {
    flex: 1,
    borderWidth: 1,
    borderRadius: rs.size(14),
    overflow: 'hidden',
  },
  doorInner: {
    paddingVertical: rs.size(14),
    paddingHorizontal: rs.size(12),
    alignItems: 'center',
    gap: rs.size(4),
  },
  doorLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 0.6,
  },
  doorCount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  footnote: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.secondary,
  },
  resolvedActions: {
    flexDirection: 'row',
    gap: rs.size(10),
    marginTop: rs.size(4),
    alignItems: 'center',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
    paddingVertical: rs.size(12),
    paddingHorizontal: rs.size(14),
    borderRadius: rs.size(14),
  },
  shareBtnLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: Colors.text.onAction,
    letterSpacing: 0.3,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(2),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(8),
  },
  previewBtnLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
  },
});
