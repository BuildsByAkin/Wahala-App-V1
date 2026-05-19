// components/motion/TickFlash.tsx
// Numeric display. Originally animated via Reanimated's Animated.Text +
// interpolateColor — known to crash on react-native-reanimated@4.x with
// react-native@0.81 (Fabric text prop bridge). Temporarily downgraded to a
// plain Text render until Reanimated ships a fix; the value still updates,
// just without the colour-wash / slide-flash motion.
import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { Colors } from '@/constants/colors';

export interface TickFlashProps {
  /** Numeric value to display. */
  value: number;
  /** Optional formatter (e.g. percent, currency). Defaults to integer. */
  format?: (n: number) => string;
  /** Text styling. */
  style?: StyleProp<TextStyle>;
  /** Legacy prop — accepted for API compatibility, ignored. */
  travelDp?: number;
  /** Legacy prop — accepted for API compatibility, ignored. */
  noColorWash?: boolean;
}

export const TickFlash: React.FC<TickFlashProps> = ({ value, format, style }) => {
  const formatted = format ? format(value) : String(value);
  return (
    <Text
      style={[styles.text, style]}
      numberOfLines={1}
      accessibilityLiveRegion="polite"
      accessibilityLabel={formatted}
    >
      {formatted}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    color: Colors.text.primary,
  },
});
