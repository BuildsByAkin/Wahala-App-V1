// components/motion/WahalaSpinner.tsx
// Branded pull-to-refresh indicator. The host screen drives `progress` (0..1)
// while the user pulls, and `refreshing` once the threshold is crossed and
// the fetch is in-flight. We render a rotating wordmark + a pulsing dot.
//
// This is the *visual* part — the host integrates it with whichever scroller
// it owns (RefreshControl wrapper or a custom Pan integration). The simple
// case is wiring it into a `<RefreshControl>` via the `progressViewOffset`
// pattern (iOS) and as a custom header (Android), but for now we expose it
// as a standalone overlay that callers can mount above their list.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { rs } from '@/utils/responsive';

export interface WahalaSpinnerProps {
  /** True while a refresh is in-flight. Drives continuous rotation. */
  refreshing: boolean;
  /** Optional pull-progress (0..1) when used in a custom Pan integration. */
  progress?: number;
  /** Sub-copy under the spinner. Defaults to a Pidgin string. */
  caption?: string;
}

export const WahalaSpinner: React.FC<WahalaSpinnerProps> = ({
  refreshing,
  progress,
  caption = 'Pulling fresh gist…',
}) => {
  const reduced = useReducedMotion();
  const rotate = useSharedValue(0);
  const dot = useSharedValue(0.8);

  useEffect(() => {
    if (refreshing && !reduced) {
      rotate.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
      dot.value = withRepeat(
        withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(rotate);
      cancelAnimation(dot);
      rotate.value = withTiming(0, { duration: 180 });
      dot.value = withTiming(0.8, { duration: 180 });
    }
  }, [refreshing, reduced, rotate, dot]);

  const wordmarkStyle = useAnimatedStyle(() => {
    const pull = typeof progress === 'number' ? Math.min(1, Math.max(0, progress)) : 1;
    const scale = 0.6 + pull * 0.4;
    return {
      opacity: pull,
      transform: [{ rotate: `${rotate.value * 360}deg` }, { scale }],
    };
  });

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot.value }],
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.logoRow, wordmarkStyle]}>
        <Text style={styles.logo}>Wahala</Text>
        <Animated.View style={[styles.dot, dotStyle]} />
      </Animated.View>
      {refreshing ? (
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs.size(12),
    gap: rs.size(6),
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rs.size(4),
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: rs.font(22),
    color: Colors.brand,
  },
  dot: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
    backgroundColor: Colors.brand,
    marginBottom: rs.size(6),
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    letterSpacing: 0.2,
  },
});
