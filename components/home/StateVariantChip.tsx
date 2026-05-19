// components/home/StateVariantChip.tsx
// Lifecycle chip rendered on MarketCard variants per REDESIGN.md §5.3:
//   • just-staked  — "✓ Your bet · ₦5k on YES", category-soft bg, persists 24h.
//   • closing-soon — clock icon + time string, 1.05 scale pulse loop.
//   • resolving    — "⚡ Resolves today" in category accent.
//   • resolved-w/l — "✓ Won ₦8.4k" / "✗ Lost ₦1k" inline P&L.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
import { rs } from '@/utils/responsive';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type StateVariant =
  | { kind: 'just-staked'; sideLabel: string; amount: string; color: string }
  | { kind: 'closing-soon'; label: string; color: string }
  | { kind: 'resolving'; color: string }
  | { kind: 'won'; amount: string }
  | { kind: 'lost'; amount: string };

interface Props {
  variant: StateVariant;
}

export const StateVariantChip: React.FC<Props> = ({ variant }) => {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (variant.kind !== 'closing-soon' || reduced) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(scale);
  }, [variant.kind, reduced, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const body = (() => {
    switch (variant.kind) {
      case 'just-staked':
        return (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: `${variant.color}1A`,
                borderColor: `${variant.color}55`,
              },
            ]}
          >
            <Feather name="check" size={rs.font(11)} color={variant.color} />
            <Text style={[styles.text, { color: variant.color }]} numberOfLines={1}>
              Your bet · {variant.amount} on {variant.sideLabel}
            </Text>
          </View>
        );
      case 'closing-soon':
        return (
          <Animated.View
            style={[
              styles.pill,
              pulseStyle,
              {
                backgroundColor: `${variant.color}1A`,
                borderColor: `${variant.color}66`,
              },
            ]}
          >
            <Feather name="clock" size={rs.font(11)} color={variant.color} />
            <Text style={[styles.text, { color: variant.color }]} numberOfLines={1}>
              {variant.label}
            </Text>
          </Animated.View>
        );
      case 'resolving':
        return (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: `${variant.color}1A`,
                borderColor: `${variant.color}66`,
              },
            ]}
          >
            <Text style={[styles.text, { color: variant.color }]}>
              ⚡ Resolves today
            </Text>
          </View>
        );
      case 'won':
        return (
          <View
            style={[styles.pill, { backgroundColor: `${Colors.status.win}1A`, borderColor: Colors.status.win }]}
          >
            <Feather name="check" size={rs.font(11)} color={Colors.status.win} />
            <Text style={[styles.text, { color: Colors.status.win }]} numberOfLines={1}>
              Won {variant.amount}
            </Text>
          </View>
        );
      case 'lost':
        return (
          <View
            style={[styles.pill, { backgroundColor: `${Colors.status.loss}1A`, borderColor: Colors.status.loss }]}
          >
            <Feather name="x" size={rs.font(11)} color={Colors.status.loss} />
            <Text style={[styles.text, { color: Colors.status.loss }]} numberOfLines={1}>
              Lost {variant.amount}
            </Text>
          </View>
        );
    }
  })();

  return body;
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(4),
    borderRadius: rs.size(999),
    borderWidth: 1,
  },
  text: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 0.2,
  },
});
