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
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import type { WithdrawalStatus } from '@/features/withdrawals/api/withdrawals-api';
import { PressableSpring } from '@/components/motion';
import { CheckMarkDraw } from '@/components/wallet';
import { haptic } from '@/lib/motion/haptics';
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

const PALETTE: Record<
  Variant,
  { bg: string; fg: string; variant: 'check' | 'x' }
> = {
  pending: { bg: '#0E1620', fg: '#3B82F6', variant: 'check' },
  completed: { bg: '#0F1F12', fg: Colors.status.win, variant: 'check' },
  failed: { bg: '#1F0E0E', fg: Colors.status.loss, variant: 'x' },
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

  // Terminal haptic — fire once when the pane mounts with a terminal status.
  useEffect(() => {
    if (variant === 'completed') haptic.success();
    else if (variant === 'failed') haptic.error();
    else haptic.soft();
    // run-once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const destination =
    bankName && last4
      ? `${bankName} •••• ${last4}`
      : bankName ?? 'your bank account';

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        {variant === 'completed' ? (
          <View
            style={[styles.glow, { backgroundColor: Colors.status.win }]}
          />
        ) : null}
        <CheckMarkDraw
          variant={palette.variant}
          color={palette.fg}
          background={palette.bg}
          size={rs.size(72)}
        />
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

      <PressableSpring
        onPress={variant === 'failed' ? onRetry : onDismiss}
        variant="primary"
        haptic="medium"
        accessibilityLabel={variant === 'failed' ? 'Try again' : 'Done'}
        style={{ marginTop: rs.size(28), alignSelf: 'stretch' }}
      >
        <View style={sheetStyles.submit}>
          <Text style={sheetStyles.submitText}>
            {variant === 'failed' ? 'Try again' : 'Done'}
          </Text>
        </View>
      </PressableSpring>

      {variant === 'failed' && (
        <PressableSpring
          onPress={onDismiss}
          variant="ghost"
          haptic="tap"
          accessibilityLabel="Done"
          style={{ alignSelf: 'stretch' }}
        >
          <View style={sheetStyles.ghostBtn}>
            <Text style={sheetStyles.ghostBtnText}>Done</Text>
          </View>
        </PressableSpring>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: rs.size(16), alignItems: 'center' },
  badge: {
    width: rs.size(96),
    height: rs.size(96),
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: rs.size(96),
    height: rs.size(96),
    borderRadius: rs.size(48),
    opacity: 0.18,
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
