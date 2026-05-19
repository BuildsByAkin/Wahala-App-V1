// components/portfolio/AllTimeSparkline.tsx
//
// All-time P&L sparkline. SVG path with a `strokeDashoffset` reveal over
// 900ms (`time.slow`). Pure-display — the parent computes the series (naira).
// Width is responsive so the line hugs whatever container it's dropped into.
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
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface AllTimeSparklineProps {
  /** Cumulative P&L samples in naira. Empty array → flat hint. */
  series: number[];
}

const W = 320;
const H = 72;
const STROKE = 2;

function buildPath(series: number[]): { d: string; length: number } {
  if (series.length < 2) {
    return { d: `M0 ${H / 2} L${W} ${H / 2}`, length: W };
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const step = W / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * (H - STROKE * 4) - STROKE * 2;
    return [x, y] as const;
  });
  const d = pts
    .map(([x, y], i) =>
      i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : `L${x.toFixed(2)} ${y.toFixed(2)}`
    )
    .join(' ');
  let length = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { d, length };
}

export const AllTimeSparkline: React.FC<AllTimeSparklineProps> = ({ series }) => {
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

  const last = series.length > 0 ? series[series.length - 1]! : 0;
  const negative = last < 0;
  const colour = series.length < 2
    ? Colors.text.tertiary
    : negative
      ? Colors.status.loss
      : Colors.status.win;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>ALL-TIME P&amp;L</Text>
      <View style={styles.chart}>
        <Svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
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
      {series.length < 2 ? (
        <Text style={styles.empty}>Settle a few bets to see the trend.</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: rs.size(20),
    marginHorizontal: rs.size(20),
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(14),
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: Colors.border.s01,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 1.2,
  },
  chart: {
    marginTop: rs.size(10),
  },
  empty: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});
