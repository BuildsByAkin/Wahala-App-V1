// components/ui/PinInput.tsx
import React, { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

type PinInputProps = {
  value: string;
  onChangeText: (val: string) => void;
  autoFocus?: boolean;
  length?: number;
  secure?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PinInput({
  value,
  onChangeText,
  autoFocus = false,
  length = 4,
  secure = true,
  style,
}: PinInputProps) {
  const inputRef = useRef<TextInput>(null);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);
  };

  const focusInput = () => inputRef.current?.focus();
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={focusInput}
      style={[styles.row, style]}
      accessibilityRole="none"
    >
      {Array.from({ length }).map((_, i) => {
        const isFilled = i < value.length;
        const isActive = i === activeIndex && value.length < length;
        return (
          <View key={i} style={[styles.box, isActive && styles.boxActive]}>
            {isFilled ? (
              secure ? (
                <View style={styles.dot} />
              ) : (
                <Text allowFontScaling={false} style={styles.digit}>
                  {value[i]}
                </Text>
              )
            ) : null}
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="numeric"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        contextMenuHidden
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        importantForAutofill="yes"
        style={styles.hidden}
        accessibilityLabel="PIN code"
        accessibilityHint={`Enter your ${length} digit code`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  box: {
    width: rs.size(44),
    height: rs.size(52),
    borderRadius: rs.size(10),
    backgroundColor: Colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  boxActive: {
    borderColor: Colors.brand,
  },
  dot: {
    width: rs.size(10),
    height: rs.size(10),
    borderRadius: rs.size(10) / 2,
    backgroundColor: Colors.textPrimary,
  },
  digit: {
    color: Colors.textPrimary,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(18),
    includeFontPadding: false,
  },
  hidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
  },
});

export default PinInput;
