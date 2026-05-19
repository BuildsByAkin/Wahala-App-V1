// components/wallet/TodaysEarnings.tsx
// Robinhood-style "Today's earnings" row: a tiny SVG sparkline of the day's
// settled-bet P&L beside a delta naira value. Pure-display — the caller
// computes the series; this component owns the visual treatment, the
// strokeDashoffset draw-in, and the colour token selection.
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface TodaysEarningsProps {
  /** Net delta in kobo as a bigint string. May be negative. */
  deltaKobo: string;
  /** Cumulative P&L samples (in naira) — at least 2 points renders a line. */
  series: number[];
}

const W = 96;
const H = 28;
const STROKE = 1.5;

function buildPath(series: number[]): { d: string; length: number } {
  if (series.length < 2) {
    return { d: `M0 ${H / 2} L${W} ${H / 2}`, length: W };
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = W / (series.length - 1);
  const points = series.map((v, i) => {
    const x = i * step;
    // Invert Y because SVG origin is top-left.
    const y = H - ((v - min) / range) * (H - STROKE * 2) - STROKE;
    return [x, y] as const;
  });
  const d = points
    .map(([x, y], i) => (i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : `L${x.toFixed(2)} ${y.toFixed(2)}`))
    .join(' ');
  // Cheap polyline length approximation (Manhattan + diagonal hypot).
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { d, length };
}

export const TodaysEarnings: React.FC<TodaysEarningsProps> = ({
  deltaKobo,
  series,
}) => {
  const reduced = useReducedMotion();
  const { d, length } = useMemo(() => buildPath(series), [series]);
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { ...time.slow, duration: 900 });
  }, [d, reduced, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));

  const negative = deltaKobo.startsWith('-');
  const flat = deltaKobo === '0' || deltaKobo === '';
  const colour = flat
    ? Colors.text.tertiary
    : negative
      ? Colors.status.loss
      : Colors.status.win;
  const sign = flat ? '' : negative ? '−' : '+';
  const absKobo = negative ? deltaKobo.slice(1) : deltaKobo;

  return (
    <View style={styles.row} accessibilityRole="summary">
      <View style={styles.left}>
        <Text style={styles.label}>TODAY&apos;S EARNINGS</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: colour }]} numberOfLines={1}>
            {sign}₦{formatKoboAsNaira(absKobo)}
          </Text>
        </View>
      </View>
      <Svg width={W} height={H}>
        <AnimatedPath
          d={d}
          stroke={colour}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={length}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    marginTop: rs.size(16),
    marginHorizontal: rs.size(20),
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(14),
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: Colors.border.s01,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flex: 1 },
  label: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 1.2,
  },
  amountRow: {
    marginTop: rs.size(4),
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  amount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
});
