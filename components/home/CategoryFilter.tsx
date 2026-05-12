// components/home/CategoryFilter.tsx
import React from 'react';
import { StyleSheet, ScrollView, Pressable, Text } from 'react-native';
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      nestedScrollEnabled={true}
    >
      {categories.map((category) => {
        const isActive = category === active;
        return (
          <Pressable
            key={category}
            onPress={() => onSelect(category)}
            style={[styles.pill, isActive ? styles.activePill : styles.inactivePill]}
          >
            <Text
              style={[
                styles.text,
                isActive ? styles.activeText : styles.inactiveText,
                { fontFamily: isActive ? Fonts.semibold : Fonts.medium },
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
    gap: rs.size(8),
  },
  pill: {
    borderRadius: rs.size(20),
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(7),
  },
  activePill: {
    backgroundColor: '#FF6500',
  },
  inactivePill: {
    backgroundColor: '#1A1A1A',
  },
  text: {
    fontSize: rs.font(13),
  },
  activeText: {
    color: '#000000',
  },
  inactiveText: {
    color: '#888888',
  },
});
