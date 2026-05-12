// components/home/LiveTicker.tsx
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

export const LiveTicker: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.2,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
      <Text style={styles.text} numberOfLines={1}>
        <Text style={styles.regularText}>2,847 people dey argue on </Text>
        <Text style={styles.boldText}>BBNaija eviction</Text>
        <Text style={styles.regularText}>...</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: rs.size(10),
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
  },
  dot: {
    width: rs.size(8),
    height: rs.size(8),
    borderRadius: rs.size(4),
    backgroundColor: '#FF3B30',
  },
  text: {
    flex: 1,
  },
  regularText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#CCCCCC',
  },
  boldText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
});
