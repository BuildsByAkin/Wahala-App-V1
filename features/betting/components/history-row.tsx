// features/betting/components/history-row.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { timeAgo } from '@/utils/market';
import type { MyBet } from '@/features/betting/api/betting-api';

type Props = {
  bet: MyBet;
};

const STATUS_STYLE: Record<
  MyBet['status'],
  { bg: string; border: string; fg: string; label: string }
> = {
  active: {
    bg: '#0F1A0F',
    border: '#1F3A1F',
    fg: '#7DDB7D',
    label: 'OPEN',
  },
  won: {
    bg: '#0F1A0F',
    border: '#1F3A1F',
    fg: '#7DDB7D',
    label: 'WON',
  },
  lost: {
    bg: '#1A0F0F',
    border: '#3A1F1F',
    fg: '#FF8A8A',
    label: 'LOST',
  },
};

export function HistoryRow({ bet }: Props) {
  const router = useRouter();
  const s = STATUS_STYLE[bet.status];
  const payout = bet.payoutKobo ?? '0';

  return (
    <Pressable
      onPress={() => router.push(`/market/${bet.marketSlug}`)}
      accessibilityRole="button"
      accessibilityLabel={`${s.label} bet on ${bet.marketQuestion}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.topRow}>
        <Text style={styles.question} numberOfLines={2}>
          {bet.marketQuestion}
        </Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: s.bg, borderColor: s.border },
          ]}
        >
          <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>

      <Text style={styles.outcomeLine} numberOfLines={1}>
        {bet.outcomeLabel}{' '}
        <Text style={styles.dim}>· {bet.multiplier}x</Text>
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>STAKE</Text>
          <Text style={styles.metaValue}>
            ₦{formatKoboAsNaira(bet.stakeKobo)}
          </Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>
            {bet.status === 'won' ? 'PAYOUT' : 'POTENTIAL'}
          </Text>
          <Text
            style={[
              styles.metaValue,
              bet.status === 'won' && { color: s.fg },
              bet.status === 'lost' && styles.dim,
            ]}
          >
            ₦{formatKoboAsNaira(payout)}
          </Text>
        </View>
        <Text style={styles.timeText}>{timeAgo(bet.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: rs.size(20),
    marginTop: rs.size(10),
    backgroundColor: '#0E0E0E',
    borderRadius: rs.size(14),
    borderWidth: 1,
    borderColor: '#151515',
    padding: rs.size(14),
  },
  rowPressed: {
    backgroundColor: '#121212',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(10),
  },
  question: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
    lineHeight: rs.font(19),
  },
  statusPill: {
    borderRadius: rs.size(6),
    borderWidth: 1,
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(3),
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.8,
  },
  outcomeLine: {
    marginTop: rs.size(8),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#BBBBBB',
  },
  dim: {
    color: '#555555',
    fontFamily: Fonts.regular,
  },
  metaRow: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(20),
  },
  metaCol: {},
  metaLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: '#555555',
    letterSpacing: 0.6,
  },
  metaValue: {
    marginTop: rs.size(2),
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  timeText: {
    marginLeft: 'auto',
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#444444',
  },
});
