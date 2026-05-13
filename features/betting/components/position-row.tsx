// features/betting/components/position-row.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { type Position, estimatePayoutKobo } from '@/features/betting/utils/positions';

type Props = {
  position: Position;
};

export function PositionRow({ position }: Props) {
  const router = useRouter();
  const payout = estimatePayoutKobo(position.totalStakeKobo, position.latestMultiplier);

  return (
    <Pressable
      onPress={() => router.push(`/market/${position.marketSlug}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open position on ${position.marketQuestion}`}
      accessibilityHint="Opens the market detail to add or review your stake"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.question} numberOfLines={2}>
          {position.marketQuestion}
        </Text>
        <Feather name="chevron-right" size={rs.font(18)} color="#444444" />
      </View>

      <View style={styles.outcomePill}>
        <View style={styles.outcomeDot} />
        <Text style={styles.outcomeLabel} numberOfLines={1}>
          {position.outcomeLabel}
        </Text>
        <Text style={styles.multiplier}>{position.latestMultiplier}x</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>STAKED</Text>
          <Text style={styles.statValue}>
            ₦{formatKoboAsNaira(position.totalStakeKobo)}
          </Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>POTENTIAL</Text>
          <Text style={[styles.statValue, styles.statValueAccent]}>
            ₦{formatKoboAsNaira(payout)}
          </Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>ENTRIES</Text>
          <Text style={styles.statValue}>{position.entryCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: rs.size(20),
    marginTop: rs.size(12),
    backgroundColor: '#0F0F0F',
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: '#161616',
    padding: rs.size(16),
  },
  rowPressed: {
    backgroundColor: '#131313',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(8),
  },
  question: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: '#FFFFFF',
    lineHeight: rs.font(20),
  },
  outcomePill: {
    marginTop: rs.size(12),
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    backgroundColor: '#1A1208',
    borderRadius: rs.size(999),
    borderWidth: 1,
    borderColor: '#2A1A0A',
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(6),
  },
  outcomeDot: {
    width: rs.size(8),
    height: rs.size(8),
    borderRadius: rs.size(4),
    backgroundColor: '#FF6500',
  },
  outcomeLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
    maxWidth: rs.size(180),
  },
  multiplier: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: '#FF6500',
    letterSpacing: 0.3,
  },
  statsRow: {
    marginTop: rs.size(14),
    paddingTop: rs.size(14),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1A1A1A',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'flex-start' },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: '#555555',
    letterSpacing: 0.6,
  },
  statValue: {
    marginTop: rs.size(4),
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
  },
  statValueAccent: {
    color: '#FF6500',
  },
  statSep: {
    width: 1,
    height: rs.size(24),
    backgroundColor: '#1F1F1F',
    marginHorizontal: rs.size(12),
  },
});
