// components/market/CountdownClock.tsx
// Display-sized countdown for Drama Mode. Each new whole-second value runs a
// `TickFlash`-style numeral pop. Inside the final minute the palette swaps to
// `status.loss` and every second has a 1→1.04 heart-beat. Inside the final
// 10s the background flashes `category.glow` for 80ms per tick.
//
// Haptics are owned here so the screen wrapper doesn't have to know about
// the second-by-second cadence — drop the clock onto the screen and it does
// the right thing.
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptic } from '@/lib/motion/haptics';
import { springs } from '@/lib/motion/springs';
import { rs } from '@/utils/responsive';

export interface CountdownClockProps {
  /** Whole seconds remaining; expected from `useDramaMode`. */
  secondsLeft: number;
  /** Category glow color used for the T-10 background flash. */
  glowColor?: string;
  /** Larger numeric for hero-band use. Defaults to 96sp display. */
  size?: 'hero' | 'compact';
  /** Fire haptics on tick cadence. Off by default for the compact variant. */
  enableHaptics?: boolean;
}

function format(seconds: number): { major: string; label: string } {
  const s = Math.max(0, seconds);
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return { major: `${h}:${String(m).padStart(2, '0')}`, label: 'HOURS' };
  }
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return { major: `${m}:${String(sec).padStart(2, '0')}`, label: 'MINUTES' };
  }
  return { major: String(s).padStart(2, '0'), label: 'SECONDS' };
}

export const CountdownClock: React.FC<CountdownClockProps> = ({
  secondsLeft,
  glowColor = Colors.brand,
  size = 'hero',
  enableHaptics = false,
}) => {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  const flashBg = useSharedValue(0);
  const lastSec = useRef<number>(secondsLeft);

  useEffect(() => {
    if (lastSec.current === secondsLeft) return;
    const prev = lastSec.current;
    lastSec.current = secondsLeft;

    // Numeral pop on every whole-second change.
    if (!reduced) {
      cancelAnimation(pulse);
      const peak = secondsLeft <= 60 ? 1.04 : 1.02;
      pulse.value = withSequence(
        withTiming(peak, { duration: 90, easing: Easing.out(Easing.quad) }),
        withSpring(1, springs.snappy)
      );
    }

    // Background glow flash inside final 10s.
    if (secondsLeft > 0 && secondsLeft <= 10 && !reduced) {
      cancelAnimation(flashBg);
      flashBg.value = withSequence(
        withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })
      );
    }

    if (!enableHaptics) return;
    // Haptic ladder: every 10s in the final minute, then heavy at T<=10.
    if (secondsLeft <= 10 && secondsLeft > 0) {
      haptic.heavy();
    } else if (secondsLeft <= 60 && prev > secondsLeft && secondsLeft % 10 === 0) {
      haptic.tap();
    }
  }, [secondsLeft, reduced, enableHaptics, pulse, flashBg]);

  const major = format(secondsLeft);
  const inFinalMinute = secondsLeft <= 60 && secondsLeft > 0;
  const color = inFinalMinute ? Colors.status.loss : Colors.text.primary;

  const numeralStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: flashBg.value,
  }));

  const majorSize = size === 'hero' ? rs.font(96) : rs.font(36);
  const labelSize = size === 'hero' ? rs.font(13) : rs.font(11);

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bgFlash,
          { backgroundColor: glowColor },
          bgStyle,
        ]}
      />
      <Animated.Text
        style={[
          styles.major,
          {
            fontSize: majorSize,
            lineHeight: majorSize * 1.02,
            color,
          },
          numeralStyle,
        ]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${secondsLeft} seconds remaining`}
      >
        {major.major}
      </Animated.Text>
      <Text style={[styles.label, { fontSize: labelSize, color: inFinalMinute ? Colors.status.loss : Colors.text.tertiary }]}>
        {major.label} LEFT
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs.size(12),
    overflow: 'hidden',
  },
  bgFlash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    borderRadius: rs.size(20),
  },
  major: {
    fontFamily: Fonts.bold,
    letterSpacing: -2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  label: {
    marginTop: rs.size(4),
    fontFamily: Fonts.bold,
    letterSpacing: 1.6,
  },
});
