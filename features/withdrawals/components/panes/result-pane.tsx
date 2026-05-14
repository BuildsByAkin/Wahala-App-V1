// features/withdrawals/components/panes/result-pane.tsx
//
// Terminal screen of the withdrawal flow. Three visual states:
//
//   - pending   → primary success path (manual 4-hour SLA). Blue clock.
//   - completed → admin marked the txn as sent. Green check.
//   - failed    → declined / refunded. Red X + retry CTA.
//
// `cancelled` and `processing` from the backend status enum fall through to
// the pending visual — both are non-terminal from the user's perspective and
// the history list is where the precise badge is shown.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import type { WithdrawalStatus } from '@/features/withdrawals/api/withdrawals-api';
import { sheetStyles } from '../sheet-styles';

type Variant = 'pending' | 'completed' | 'failed';

type Props = {
  status: WithdrawalStatus;
  netAmountKobo: string;
  bankName: string | null;
  last4: string | null;
  failureReason: string | null;
  onDismiss: () => void;
  onRetry: () => void;
};

function toVariant(status: WithdrawalStatus): Variant {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  // pending | processing | cancelled — show the friendly "we'll process it"
  // screen. Precise state lives in history.
  return 'pending';
}

const PALETTE: Record<Variant, { bg: string; fg: string; icon: 'check' | 'x' | 'clock' }> = {
  pending: { bg: '#0E1620', fg: '#3B82F6', icon: 'check' },
  completed: { bg: '#0F1F12', fg: '#5BD37A', icon: 'check' },
  failed: { bg: '#1F0E0E', fg: '#FF5A5A', icon: 'x' },
};

export function ResultPane({
  status,
  netAmountKobo,
  bankName,
  last4,
  failureReason,
  onDismiss,
  onRetry,
}: Props) {
  const variant = toVariant(status);
  const palette = PALETTE[variant];

  const destination =
    bankName && last4
      ? `${bankName} •••• ${last4}`
      : bankName ?? 'your bank account';

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
        <Feather name={palette.icon} size={rs.font(30)} color={palette.fg} />
      </View>

      {variant === 'pending' && (
        <>
          <Text style={styles.title}>Withdrawal request received</Text>
          <Text style={styles.subtitle}>
            We&apos;ll send ₦{formatKoboAsNaira(netAmountKobo)} to {destination}{' '}
            within 4 hours.
          </Text>
          <Text style={styles.hint}>
            You&apos;ll see this in your withdrawal history as pending until
            it&apos;s processed.
          </Text>
        </>
      )}

      {variant === 'completed' && (
        <>
          <Text style={styles.title}>Withdrawal sent</Text>
          <Text style={styles.subtitle}>
            ₦{formatKoboAsNaira(netAmountKobo)} has been sent to {destination}.
          </Text>
        </>
      )}

      {variant === 'failed' && (
        <>
          <Text style={styles.title}>Withdrawal failed</Text>
          <Text style={styles.subtitle}>
            {failureReason ??
              'Something went wrong. Your wallet has been refunded.'}
          </Text>
        </>
      )}

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

      {variant === 'failed' && (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Done"
          style={({ pressed }) => [
            sheetStyles.ghostBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={sheetStyles.ghostBtnText}>Done</Text>
        </Pressable>
      )}
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
  hint: {
    marginTop: rs.size(10),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
    textAlign: 'center',
    paddingHorizontal: rs.size(16),
    lineHeight: rs.font(18),
  },
});
