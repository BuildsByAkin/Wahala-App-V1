// components/home/Sparkline.tsx
// 24-point mini line drawn behind the probability rail to imply "this market
// is alive". When the API does not yet expose a real history series we fall
// back to a deterministic seeded walk derived from the market id so a market
// always looks the same across renders (no flicker).
//
// Rendered as an SVG `Path` with a `strokeDashoffset` reveal on mount so the
// line writes itself in over 600ms. Reanimated drives the offset on the UI
// thread.
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useReducedMotion } from '@/hooks/useReducedMotion';

// Hoisted so reanimated can wrap the SVG primitive once.
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SparklineProps {
  /** Optional explicit series (0..1). Falls back to a seeded random walk. */
  series?: number[];
  /** Used to seed the fallback walk. */
  seed: string;
  width: number;
  height: number;
  color: string;
  /** Opacity 0..1 of the stroke. Defaults to 0.3 (lives *behind* content). */
  opacity?: number;
  strokeWidth?: number;
}

function seedRandom(seed: string): () => number {
  // Tiny LCG seeded by string hash. Deterministic across renders.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return (h & 0xffffffff) / 0xffffffff;
  };
}

function fallbackSeries(seed: string, n = 24): number[] {
  const rand = seedRandom(seed);
  const out: number[] = [];
  let v = 0.4 + rand() * 0.2;
  for (let i = 0; i < n; i++) {
    v += (rand() - 0.5) * 0.08;
    v = Math.max(0.08, Math.min(0.92, v));
    out.push(v);
  }
  return out;
}

export const Sparkline: React.FC<SparklineProps> = ({
  series,
  seed,
  width,
  height,
  color,
  opacity = 0.3,
  strokeWidth = 1.5,
}) => {
  const data = useMemo(() => series && series.length >= 2 ? series : fallbackSeries(seed), [series, seed]);
  const reduced = useReducedMotion();

  const path = useMemo(() => {
    if (width <= 0 || height <= 0) return '';
    const stepX = width / (data.length - 1);
    return data
      .map((v, i) => {
        const x = i * stepX;
        const y = height - v * height;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [data, width, height]);

  // Approximate path length for the dash reveal. For a polyline this is the
  // sum of segment lengths; we compute once per series change.
  const pathLength = useMemo(() => {
    if (width <= 0 || height <= 0) return 0;
    const stepX = width / (data.length - 1);
    let len = 0;
    for (let i = 1; i < data.length; i++) {
      const dy = (data[i - 1] - data[i]) * height;
      len += Math.sqrt(stepX * stepX + dy * dy);
    }
    return len;
  }, [data, width, height]);

  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 900,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [reduced, progress, seed]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - progress.value) * pathLength,
  }));

  if (width <= 0 || height <= 0) return <View style={{ width, height }} />;

  return (
    <View style={[styles.host, { width, height, opacity }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <AnimatedPath
          d={path}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={pathLength}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    overflow: 'hidden',
  },
});
