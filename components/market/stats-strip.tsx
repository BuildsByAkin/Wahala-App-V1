// components/market/stats-strip.tsx
// Three-cell context strip: Pool · Stakers · Min.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsCompactNaira } from '@/lib/utils/money';

type Props = {
  totalPoolKobo: string;
  bettorCount: number;
  minStakeKobo: string;
  /**
   * BACKEND.md §9 — Drama-Mode late-fee pot. When present and > 0 we render
   * a fourth cell so the user can see the bonus pool growing in real time.
   */
  lateFeePoolKobo?: string | null;
};

function hasLateFee(v: string | null | undefined): v is string {
  if (!v) return false;
  try {
    return BigInt(v) > 0n;
  } catch {
    return false;
  }
}

export function StatsStrip({
  totalPoolKobo,
  bettorCount,
  minStakeKobo,
  lateFeePoolKobo,
}: Props) {
  const showLateFee = hasLateFee(lateFeePoolKobo);
  return (
    <View style={styles.wrap}>
      <Cell label="POOL" value={`₦${formatKoboAsCompactNaira(totalPoolKobo)}`} />
      <Sep />
      <Cell label="STAKERS" value={String(bettorCount)} />
      <Sep />
      <Cell label="MIN BET" value={`₦${formatKoboAsCompactNaira(minStakeKobo)}`} />
      {showLateFee && lateFeePoolKobo ? (
        <>
          <Sep />
          <Cell
            label="LATE FEE"
            value={`₦${formatKoboAsCompactNaira(lateFeePoolKobo)}`}
          />
        </>
      ) : null}
    </View>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function Sep() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface.elevated,
    borderRadius: rs.size(16),
    paddingVertical: rs.size(14),
    paddingHorizontal: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.primary,
  },
  label: {
    marginTop: rs.size(3),
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 0.6,
  },
  sep: {
    width: 1,
    height: rs.size(28),
    backgroundColor: Colors.border.subtle,
  },
});
