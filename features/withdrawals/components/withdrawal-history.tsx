// features/withdrawals/components/withdrawal-history.tsx
//
// Inline history list shown under the Withdraw button. Reads from
// useMyWithdrawals (60s staleTime). Empty/loading/error states all handled
// inline so callers just drop the component in.
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import type {
  Withdrawal,
  WithdrawalStatus,
} from '@/features/withdrawals/api/withdrawals-api';
import { useMyWithdrawals } from '@/features/withdrawals/hooks/use-withdrawals';

const STATUS_COLOR: Record<WithdrawalStatus, { bg: string; fg: string; label: string }> = {
  success: { bg: '#0F1F12', fg: '#5BD37A', label: 'Completed' },
  failed: { bg: '#1F0E0E', fg: '#FF5A5A', label: 'Failed' },
  pending: { bg: '#0E1620', fg: '#5BAEFF', label: 'Pending' },
  abandoned: { bg: '#1A1208', fg: '#FFB561', label: 'Abandoned' },
};

export function WithdrawalHistory() {
  const { data, isLoading, isError, refetch } = useMyWithdrawals();

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Recent withdrawals</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.textSecondary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="cloud-off" size={rs.font(20)} color={Colors.textMuted} />
          <Text style={styles.muted}>Couldn&apos;t load history</Text>
          <Text
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading withdrawals"
            style={styles.retry}
          >
            Retry
          </Text>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={rs.font(22)} color={Colors.textMuted} />
          <Text style={styles.muted}>No withdrawals yet</Text>
        </View>
      ) : (
        <View>
          {data.map((w) => (
            <Row key={w.id} item={w} />
          ))}
        </View>
      )}
    </View>
  );
}

function Row({ item }: { item: Withdrawal }) {
  const status = STATUS_COLOR[item.status] ?? STATUS_COLOR.pending;
  const date = new Date(item.createdAt);
  const dateLabel = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowAmount}>
          ₦{formatKoboAsNaira(item.amountKobo)}
        </Text>
        <Text style={styles.rowDate}>{dateLabel}</Text>
      </View>
      <View
        style={[styles.pill, { backgroundColor: status.bg }]}
        accessibilityLabel={`Status ${status.label}`}
      >
        <Text style={[styles.pillText, { color: status.fg }]}>
          {status.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginTop: rs.size(32),
  },
  heading: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: rs.size(12),
  },
  center: {
    paddingVertical: rs.size(28),
    alignItems: 'center',
    gap: rs.size(8),
  },
  muted: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.textMuted,
  },
  retry: {
    marginTop: rs.size(4),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.brand,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rs.size(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F1F1F',
  },
  rowMain: {
    flex: 1,
  },
  rowAmount: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: Colors.textPrimary,
  },
  rowDate: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.textMuted,
  },
  pill: {
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(4),
    borderRadius: rs.size(9999),
    marginLeft: rs.size(12),
  },
  pillText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    letterSpacing: 0.3,
  },
});

export default WithdrawalHistory;
