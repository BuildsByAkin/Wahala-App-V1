// components/home/AvatarStack.tsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

interface AvatarStackProps {
  colors: string[];
  extra: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({ colors, extra }) => {
  const displayedColors = colors.slice(0, 4);

  return (
    <View style={styles.container}>
      {displayedColors.map((color, index) => (
        <View
          key={index}
          style={[
            styles.avatar,
            { backgroundColor: color, marginLeft: index === 0 ? 0 : rs.size(-8) },
          ]}
        />
      ))}
      {extra > 0 && (
        <Text style={styles.extraText}>
          +{extra > 999 ? (extra / 1000).toFixed(1) + 'k' : extra}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: rs.size(26),
    height: rs.size(26),
    borderRadius: rs.size(13),
    borderWidth: 1.5,
    borderColor: '#0A0A0A',
  },
  extraText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: '#888888',
    marginLeft: rs.size(6),
  },
});
