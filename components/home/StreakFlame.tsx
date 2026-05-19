// components/home/StreakFlame.tsx
// Persistent header streak indicator. The glyph breathes (scale ±4%, opacity
// 1↔0.85, 1400ms) so the eye is drawn to the *number* not the icon. On a
// streak tick-up the value flashes via TickFlash and the flame fires a single
// 1→1.4→1 burst.  See ANIMATIONS.md §3.B.7.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { springs } from '@/lib/motion/springs';
import { TickFlash } from '@/components/motion/TickFlash';
import { rs } from '@/utils/responsive';

interface StreakFlameProps {
  /** Streak day count. 0 hides the component. */
  count: number;
}

export const StreakFlame: React.FC<StreakFlameProps> = ({ count }) => {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const burst = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    scale.value = withRepeat(
      withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [reduced, scale, opacity]);

  useEffect(() => {
    if (reduced) return;
    burst.value = withSequence(
      withSpring(1.4, springs.bouncy),
      withSpring(1, springs.snappy)
    );
  }, [count, reduced, burst]);

  const flameStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * burst.value }],
  }));

  if (count <= 0) return null;

  return (
    <View style={styles.row} accessibilityLabel={`Streak ${count} days`}>
      <Animated.Text style={[styles.flame, flameStyle]}>🔥</Animated.Text>
      <TickFlash
        value={count}
        format={(n) => String(n)}
        style={styles.count}
        noColorWash
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  flame: {
    fontSize: rs.font(18),
  },
  count: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
});
