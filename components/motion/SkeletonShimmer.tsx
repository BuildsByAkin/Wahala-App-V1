// components/motion/SkeletonShimmer.tsx
// Loading state primitive. Renders the child geometry as a dim placeholder
// then runs a gradient "shimmer" strip across it. Built with react-native-svg
// (no LinearGradient package required) and clipped by the parent's bounds.
//
// Usage:
//   <SkeletonShimmer width="100%" height={120} borderRadius={16} />
// or as a wrapper:
//   <SkeletonShimmer width={W} height={H}><PlaceholderShape /></SkeletonShimmer>
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors } from '@/constants/colors';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { rs } from '@/utils/responsive';

export interface SkeletonShimmerProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  /** Optional override for the resting placeholder colour. */
  baseColor?: string;
  style?: React.ComponentProps<typeof View>['style'];
  children?: React.ReactNode;
}

export const SkeletonShimmer: React.FC<SkeletonShimmerProps> = ({
  width = '100%',
  height,
  borderRadius,
  baseColor = Colors.surface['01'],
  style,
  children,
}) => {
  const reduced = useReducedMotion();
  const [measured, setMeasured] = useState<number>(0);
  const x = useSharedValue(-1);
  const baseOpacity = useSharedValue(0.45);

  useEffect(() => {
    if (reduced) {
      x.value = 0; // park the gradient in-place
      baseOpacity.value = 0.6;
      return;
    }
    x.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.linear }),
      -1,
      false
    );
    baseOpacity.value = withRepeat(
      withTiming(0.85, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [reduced, x, baseOpacity]);

  const shimmerStyle = useAnimatedStyle(() => {
    const w = measured || 1;
    // Translate from -w → +w so the strip sweeps across the full width.
    return { transform: [{ translateX: -w + x.value * (2 * w) }] };
  });

  const dimStyle = useAnimatedStyle(() => ({ opacity: baseOpacity.value }));

  const radius = borderRadius ?? rs.size(12);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width)}
      style={[
        styles.box,
        { width, height, borderRadius: radius, backgroundColor: baseColor },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="Loading"
    >
      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]} />
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <Svg width={measured || 0} height={height}>
          <Defs>
            <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.06" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={measured || 0} height={height} fill="url(#shimmer)" />
        </Svg>
      </Animated.View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
});
