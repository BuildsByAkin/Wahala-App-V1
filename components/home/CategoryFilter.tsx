// components/home/CategoryFilter.tsx
// Category chips with ChipToggle motion (ANIMATIONS.md §3.A.2):
//   - selected: background ramps to category soft, text ticks to category
//     primary, scale 1→1.06→1 on `springs.bouncy`.
//   - deselected: opacity dims to 0.6.
import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { springs } from '@/lib/motion/springs';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';
import { useCategories } from '@/features/categories/hooks/use-categories';

interface CategoryFilterProps {
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
}

interface ChipProps {
  label: string;
  active: boolean;
  accent: string;
  onPress: () => void;
}

const Chip: React.FC<ChipProps> = ({ label, active, accent, onPress }) => {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(active ? 1 : 0.6);

  useEffect(() => {
    opacity.value = withTiming(active ? 1 : 0.6, time.fast);
    if (active && !reduced) {
      scale.value = withSequence(
        withSpring(1.06, springs.bouncy),
        withSpring(1, springs.snappy)
      );
    }
  }, [active, reduced, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const bg = active ? `${accent}22` : 'transparent';
  const borderColor = active ? `${accent}66` : Colors.border.s01;
  const textColor = active ? accent : Colors.text.secondary;

  return (
    <PressableSpring
      variant="ghost"
      haptic="soft"
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}`}
      style={[styles.pill, { backgroundColor: bg, borderColor }, animStyle]}
    >
      <Text
        style={[
          styles.text,
          { color: textColor, fontFamily: active ? Fonts.bold : Fonts.medium },
        ]}
      >
        {label}
      </Text>
    </PressableSpring>
  );
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  active,
  onSelect,
}) => {
  // Prefer the server-denormalized colour triplet (BACKEND.md §1); fall back
  // to the local palette through useCategories().lookup so cold-starts still
  // render branded.
  const { lookup } = useCategories();
  const handlePress = useCallback(
    (cat: string) => {
      onSelect(cat);
    },
    [onSelect]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      nestedScrollEnabled
    >
      {categories.map((category) => {
        const accent =
          category === 'All' ? Colors.brand : lookup(category).primaryColor;
        return (
          <Chip
            key={category}
            label={category}
            accent={accent}
            active={category === active}
            onPress={() => handlePress(category)}
          />
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: rs.size(20),
    // Vertical padding leaves headroom for the ChipToggle scale-bounce (1→1.06)
    // and the soft glow ring so the top/bottom of selected chips isn't clipped.
    paddingVertical: rs.size(6),
    gap: rs.size(8),
    alignItems: 'center',
  },
  pill: {
    borderRadius: rs.size(999),
    borderWidth: 1,
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(10),
  },
  text: {
    fontSize: rs.font(13),
    letterSpacing: 0.1,
  },
});
