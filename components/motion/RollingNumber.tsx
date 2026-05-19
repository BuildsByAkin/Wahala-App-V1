// components/motion/RollingNumber.tsx
// Robinhood / Cash-App style odometer. Each digit is its own vertical strip
// of 0–9 stacked; we translate the strip by `-digitHeight * digit` so the
// correct numeral lands in the visible window. Non-digit characters (commas,
// currency symbols, dots) are rendered as static text.
//
// Pure-display component — pass a formatter or render with raw digits.
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { time } from '@/lib/motion/timings';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export interface RollingNumberProps {
  value: number;
  /** Optional formatter — defaults to `String(value)`. */
  format?: (n: number) => string;
  /** Style for every digit + non-digit glyph. Must set explicit `fontSize`. */
  textStyle?: StyleProp<TextStyle>;
  /** Pixel height of each digit strip. Required when fontSize varies. */
  digitHeight: number;
  /** Tint the value when negative. */
  signColored?: boolean;
}

interface DigitColumnProps {
  digit: number;
  delayMs: number;
  textStyle?: StyleProp<TextStyle>;
  digitHeight: number;
}

const DigitColumn: React.FC<DigitColumnProps> = ({
  digit,
  delayMs,
  textStyle,
  digitHeight,
}) => {
  const reduced = useReducedMotion();
  const translateY = useSharedValue(-digit * digitHeight);

  useEffect(() => {
    const target = -digit * digitHeight;
    if (reduced) {
      translateY.value = target;
      return;
    }
    translateY.value = withDelay(delayMs, withTiming(target, time.emphasis));
  }, [digit, digitHeight, delayMs, reduced, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.column, { height: digitHeight }]}>
      <Animated.View style={animatedStyle}>
        {DIGITS.map((d) => (
          <Text
            key={d}
            style={[styles.digit, { height: digitHeight, lineHeight: digitHeight }, textStyle]}
            numberOfLines={1}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
};

export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  format,
  textStyle,
  digitHeight,
  signColored,
}) => {
  const formatted = useMemo(() => (format ? format(value) : String(value)), [format, value]);
  const negative = value < 0;
  const tintStyle: TextStyle | undefined = signColored
    ? { color: negative ? Colors.status.loss : Colors.status.win }
    : undefined;

  // Per-character render. Right-most digit has the smallest delay so the
  // odometer reads as "the ones place changed first" — feels less robotic.
  const chars = formatted.split('');
  const digitIndices = chars.map((_, i) => i).filter((i) => /\d/.test(chars[i]));
  const lastDigitIndex = digitIndices[digitIndices.length - 1] ?? -1;

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={formatted}
    >
      {chars.map((char, i) => {
        const isDigit = /\d/.test(char);
        if (!isDigit) {
          return (
            <Text
              key={`s-${i}`}
              style={[styles.digit, { height: digitHeight, lineHeight: digitHeight }, textStyle, tintStyle]}
            >
              {char}
            </Text>
          );
        }
        const distanceFromEnd = lastDigitIndex - i;
        const delay = Math.max(0, distanceFromEnd) * 35;
        return (
          <DigitColumn
            key={`d-${i}`}
            digit={Number(char)}
            delayMs={delay}
            digitHeight={digitHeight}
            textStyle={[textStyle, tintStyle]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    overflow: 'hidden',
  },
  digit: {
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
