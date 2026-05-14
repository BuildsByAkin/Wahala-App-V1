// components/home/CategoryFilter.tsx
import React, { useCallback } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

interface CategoryFilterProps {
  categories: string[];
  active: string;
  onSelect: (cat: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  active,
  onSelect,
}) => {
  const handlePress = useCallback(
    (cat: string) => {
      if (cat !== active) {
        void Haptics.selectionAsync();
      }
      onSelect(cat);
    },
    [active, onSelect]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      nestedScrollEnabled
    >
      {categories.map((category) => {
        const isActive = category === active;
        return (
          <Pressable
            key={category}
            onPress={() => handlePress(category)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter by ${category}`}
            android_ripple={
              Platform.OS === 'android'
                ? { color: '#FF650022', borderless: false }
                : undefined
            }
            style={({ pressed }) => [
              styles.pill,
              isActive ? styles.activePill : styles.inactivePill,
              pressed && !isActive && styles.pressed,
            ]}
            hitSlop={rs.size(6)}
          >
            <Text
              style={[
                styles.text,
                isActive ? styles.activeText : styles.inactiveText,
                { fontFamily: isActive ? Fonts.bold : Fonts.medium },
              ]}
            >
              {category}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: rs.size(20),
    gap: rs.size(6),
  },
  pill: {
    borderRadius: rs.size(999),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(6),
  },
  activePill: {
    backgroundColor: '#FF6500',
  },
  inactivePill: {
    backgroundColor: 'transparent',
  },
  pressed: {
    backgroundColor: '#141414',
  },
  text: {
    fontSize: rs.font(13),
    letterSpacing: 0.1,
  },
  activeText: {
    color: '#0A0A0A',
  },
  inactiveText: {
    color: '#6B6B6B',
  },
});
