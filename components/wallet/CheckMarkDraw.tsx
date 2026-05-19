// components/wallet/CheckMarkDraw.tsx
// SVG check-mark / X-mark with an `strokeDashoffset` reveal driven by a
// shared value. Used by `DepositSuccess` (check + glow + RollingNumber) and
// the failure pane (X-draw). Pure presentational — the parent decides which
// glyph to render and supplies the colour token.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type CheckMarkVariant = 'check' | 'x';

export interface CheckMarkDrawProps {
  /** Glyph variant — `check` for success, `x` for failure. */
  variant: CheckMarkVariant;
  /** Stroke colour. */
  color: string;
  /** Background tint (drawn as a circle behind the glyph). */
  background?: string;
  /** Outer circle size in dp. */
  size?: number;
  /** Delay before drawing starts (ms). */
  delayMs?: number;
}

// Pre-computed path lengths from the SVG paths below. Using a static value
// avoids needing to call `getTotalLength` (RN-svg doesn't expose it cheaply).
const PATH_LENGTHS = {
  check: 36,
  x: 38,
};

const PATHS: Record<CheckMarkVariant, string> = {
  // viewBox: 0 0 32 32 — checkmark spanning roughly (7,17) → (14,23) → (25,11).
  check: 'M7 17 L14 23 L25 11',
  // X mark across (9,9) → (23,23) and (23,9) → (9,23).
  x: 'M9 9 L23 23 M23 9 L9 23',
};

export const CheckMarkDraw: React.FC<CheckMarkDrawProps> = ({
  variant,
  color,
  background,
  size,
  delayMs = 0,
}) => {
  const reduced = useReducedMotion();
  const dim = size ?? rs.size(72);
  const length = PATH_LENGTHS[variant];
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delayMs,
      withTiming(1, { ...time.emphasis, duration: 320 })
    );
  }, [variant, reduced, delayMs, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));

  return (
    <View
      style={[
        styles.wrap,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: background ?? 'transparent',
        },
      ]}
    >
      <Svg width={dim} height={dim} viewBox="0 0 32 32">
        <AnimatedPath
          d={PATHS[variant]}
          stroke={color}
          strokeWidth={3.5}
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
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
