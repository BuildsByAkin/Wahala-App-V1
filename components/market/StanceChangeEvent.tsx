// components/market/StanceChangeEvent.tsx
// Special event card rendered between regular comments when a member of
// the gist flips their camp. Visual: a horizontal gradient cross-wipe from
// `fromColor` → `toColor` that animates left-to-right over 1200ms.
//
// REDESIGN_v2.md §4.4 — "rare, dramatic, narrative".
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  who: string;
  fromLabel: string;
  toLabel: string;
  fromColor: string;
  toColor: string;
  ago: string;
}

export const StanceChangeEvent: React.FC<Props> = ({
  who,
  fromLabel,
  toLabel,
  fromColor,
  toColor,
  ago,
}) => {
  const reduced = useReducedMotion();
  const wipe = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(wipe);
    if (reduced) {
      wipe.value = 1;
      return;
    }
    wipe.value = withTiming(1, {
      duration: 1200,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [reduced, wipe, fromColor, toColor]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      wipe.value,
      [0, 1],
      [`${fromColor}33`, `${toColor}33`]
    ),
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: wipe.value * rs.size(6) }],
  }));

  return (
    <Animated.View entering={FadeInUp.duration(220)} style={styles.host}>
      <Animated.View style={[styles.card, bgStyle, { borderColor: `${toColor}55` }]}>
        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: fromColor }]} />
          <Animated.View style={[styles.arrow, arrowStyle]}>
            <Text style={styles.arrowText}>{'>'}</Text>
          </Animated.View>
          <View style={[styles.dot, { backgroundColor: toColor }]} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.line} numberOfLines={2}>
            <Text style={styles.who}>{who}</Text>
            <Text style={styles.muted}> flipped from </Text>
            <Text style={[styles.side, { color: fromColor }]}>{fromLabel.toUpperCase()}</Text>
            <Text style={styles.muted}> to </Text>
            <Text style={[styles.side, { color: toColor }]}>{toLabel.toUpperCase()}</Text>
          </Text>
          <Text style={styles.ago}>{ago}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: rs.size(20),
    paddingVertical: rs.size(8),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(14),
    borderWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
  },
  dot: {
    width: rs.size(10),
    height: rs.size(10),
    borderRadius: rs.size(5),
  },
  arrow: {
    paddingHorizontal: rs.size(2),
  },
  arrowText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
  textWrap: { flex: 1 },
  line: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
  },
  who: {
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
  },
  muted: {
    color: Colors.text.tertiary,
  },
  side: {
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
  },
  ago: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
  },
});
