// components/wallet/QuickAmountChip.tsx
// Quick-pick amount chip with the `ChipToggle` motion baked in. Selected
// chips fill in brand soft, pulse 1 → 1.06 → 1 on tap, and dim deselected
// peers via parent-controlled opacity. Wraps `PressableSpring` so the
// `ButtonPress` haptic is automatic.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { PressableSpring } from '@/components/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { springs } from '@/lib/motion/springs';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';

export interface QuickAmountChipProps {
  /** Numeric amount in naira. */
  amount: number;
  /** Whether this chip is the selected one. */
  selected: boolean;
  /** Whether any sibling chip is currently selected (dims unselected peers). */
  hasSelection: boolean;
  /** Optional label override (e.g. `Refill last`). */
  label?: string;
  onPress: () => void;
}

export const QuickAmountChip: React.FC<QuickAmountChipProps> = ({
  amount,
  selected,
  hasSelection,
  label,
  onPress,
}) => {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const fill = useSharedValue(selected ? 1 : 0);
  const dim = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      fill.value = withTiming(selected ? 1 : 0, time.fast);
      dim.value = withTiming(!selected && hasSelection ? 0.6 : 1, time.fast);
      return;
    }
    fill.value = withTiming(selected ? 1 : 0, time.standard);
    if (selected) {
      scale.value = withSequence(
        withTiming(1.06, time.fast),
        withSpring(1, springs.bouncy)
      );
    }
    dim.value = withTiming(
      !selected && hasSelection ? 0.6 : 1,
      time.fast
    );
  }, [selected, hasSelection, reduced, fill, dim, scale]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: dim.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
  }));

  return (
    <Animated.View style={wrapperStyle}>
      <PressableSpring
        onPress={onPress}
        haptic="soft"
        accessibilityRole="button"
        accessibilityLabel={label ?? `Quick deposit ${amount} naira`}
        accessibilityState={{ selected }}
      >
        <View style={styles.chip}>
          <Animated.View style={[styles.fill, fillStyle]} />
          <Text style={[styles.text, selected && styles.textActive]}>
            {label ?? `₦${amount.toLocaleString()}`}
          </Text>
        </View>
      </PressableSpring>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(8),
    borderRadius: rs.size(9999),
    backgroundColor: Colors.surface['01'],
    borderWidth: 1,
    borderColor: Colors.border.s01,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.category.politics.soft,
  },
  text: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#DDDDDD',
  },
  textActive: {
    color: Colors.brand,
  },
});
