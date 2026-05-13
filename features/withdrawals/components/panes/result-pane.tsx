// features/withdrawals/components/panes/result-pane.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { sheetStyles } from '../sheet-styles';

type Props = {
  status: 'success' | 'failed' | 'pending' | 'abandoned';
  amountKobo: string;
  feeKobo: string;
  failureReason: string | null;
  onDismiss: () => void;
  onRetry: () => void;
};

export function ResultPane({
  status,
  amountKobo,
  feeKobo,
  failureReason,
  onDismiss,
  onRetry,
}: Props) {
  const variant =
    status === 'success'
      ? 'success'
      : status === 'failed' || status === 'abandoned'
        ? 'failed'
        : 'pending';

  const palette = {
    success: { bg: '#0F1F12', fg: '#5BD37A', icon: 'check' as const },
    failed: { bg: '#1F0E0E', fg: '#FF5A5A', icon: 'x' as const },
    pending: { bg: '#0E1620', fg: '#5BAEFF', icon: 'clock' as const },
  }[variant];

  const title =
    variant === 'success'
      ? 'Withdrawal sent'
      : variant === 'failed'
        ? 'Withdrawal failed'
        : 'Still processing';

  const subtitle =
    variant === 'success'
      ? `₦${formatKoboAsNaira(amountKobo)} is on its way. Fee: ₦${formatKoboAsNaira(feeKobo)}.`
      : variant === 'failed'
        ? failureReason ?? "We couldn't process your withdrawal."
        : "We're still waiting on confirmation. You'll see it in your history shortly.";

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
        <Feather name={palette.icon} size={rs.font(30)} color={palette.fg} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <Pressable
        onPress={variant === 'failed' ? onRetry : onDismiss}
        accessibilityRole="button"
        accessibilityLabel={variant === 'failed' ? 'Try again' : 'Done'}
        style={({ pressed }) => [
          sheetStyles.submit,
          { marginTop: rs.size(28), opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={sheetStyles.submitText}>
          {variant === 'failed' ? 'Try again' : 'Done'}
        </Text>
      </Pressable>

      {variant === 'failed' ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [
            sheetStyles.ghostBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={sheetStyles.ghostBtnText}>Close</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: rs.size(16), alignItems: 'center' },
  iconCircle: {
    width: rs.size(72),
    height: rs.size(72),
    borderRadius: rs.size(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: rs.size(20),
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: rs.size(12),
    lineHeight: rs.font(19),
  },
});
