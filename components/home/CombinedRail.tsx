// components/home/CombinedRail.tsx
// Two-segment probability rail with rounded inner caps, embedded percentages,
// and a continuous "breathe" oscillation that hints at liveness.
// See REDESIGN.md §5.1 and ANIMATIONS.md §2.3.
//
// The breathing is implemented as ±0.5% oscillation around the resting ratio.
// We never animate width directly; the segments are `flex`'d and we animate
// `flex` values on the UI thread via a shared value.
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { rs } from '@/utils/responsive';

export interface CombinedRailProps {
  /** Leader side. */
  leaderLabel: string;
  leaderPercent: number; // 0..100
  leaderColor: string;
  /** Trailer side. */
  trailerLabel: string;
  trailerPercent: number; // 0..100
  trailerColor: string;
  /** Rail thickness. Defaults to 28dp (mid). Hero uses 36dp. */
  height?: number;
  /** Suppress the breathe oscillation (e.g. for resolved markets). */
  still?: boolean;
  /** Show big numerals inside each segment. Default true. */
  showPercents?: boolean;
}

export const CombinedRail: React.FC<CombinedRailProps> = ({
  leaderLabel,
  leaderPercent,
  leaderColor,
  trailerLabel,
  trailerPercent,
  trailerColor,
  height,
  still,
  showPercents = true,
}) => {
  const reduced = useReducedMotion();
  // Resting ratio for the leader segment. Clamp to keep both ends visible.
  const rest = useMemo(
    () => Math.max(0.05, Math.min(0.95, leaderPercent / 100)),
    [leaderPercent]
  );

  // Breathe oscillation, applied as an additive delta on top of `rest`.
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (still || reduced) {
      cancelAnimation(breathe);
      breathe.value = 0;
      return;
    }
    breathe.value = 0;
    breathe.value = withRepeat(
      withSequence(
        withTiming(0.005, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(-0.005, { duration: 800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(breathe);
    };
  }, [still, reduced, breathe]);

  const railH = height ?? rs.size(28);

  const leaderStyle = useAnimatedStyle(() => ({
    flex: Math.max(0.001, rest + breathe.value),
  }));
  const trailerStyle = useAnimatedStyle(() => ({
    flex: Math.max(0.001, 1 - rest - breathe.value),
  }));

  return (
    <View style={[styles.rail, { height: railH, borderRadius: railH / 2 }]}>
      <Animated.View
        style={[
          styles.segment,
          styles.segmentLeft,
          { backgroundColor: `${leaderColor}33`, borderColor: `${leaderColor}55` },
          leaderStyle,
        ]}
      >
        <View style={[styles.fill, { backgroundColor: leaderColor }]} />
        <View style={styles.segmentContent}>
          <View style={[styles.dot, { backgroundColor: '#0A0A0A' }]} />
          <Text
            style={[styles.label, { color: '#0A0A0A' }]}
            numberOfLines={1}
            accessibilityLabel={`${leaderLabel} ${leaderPercent} percent`}
          >
            {leaderLabel}
          </Text>
          {showPercents ? (
            <Text style={[styles.percent, { color: '#0A0A0A' }]}>{leaderPercent}%</Text>
          ) : null}
        </View>
      </Animated.View>

      <View style={[styles.seam, { height: railH }]} />

      <Animated.View
        style={[
          styles.segment,
          styles.segmentRight,
          { backgroundColor: `${trailerColor}24`, borderColor: `${trailerColor}40` },
          trailerStyle,
        ]}
      >
        <View style={styles.segmentContent}>
          {showPercents ? (
            <Text style={[styles.percent, { color: trailerColor }]}>{trailerPercent}%</Text>
          ) : null}
          <Text
            style={[styles.label, { color: trailerColor }]}
            numberOfLines={1}
            accessibilityLabel={`${trailerLabel} ${trailerPercent} percent`}
          >
            {trailerLabel}
          </Text>
          <View style={[styles.dot, { backgroundColor: trailerColor }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.surface['01'],
  },
  segment: {
    minWidth: 0,
    overflow: 'hidden',
    borderWidth: 1,
    justifyContent: 'center',
  },
  segmentLeft: {
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  segmentRight: {
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  // Solid colour wash *behind* the label text on the leader side.
  fill: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    paddingHorizontal: rs.size(10),
    height: '100%',
  },
  seam: {
    width: 2,
    backgroundColor: Colors.surface['00'],
  },
  dot: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 0.4,
  },
  percent: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    fontVariant: ['tabular-nums'],
  },
});
