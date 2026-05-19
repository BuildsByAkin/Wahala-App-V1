// components/portfolio/BalanceSummary.tsx
//
// Hero balance card for the Portfolio tab. Big total balance up top, with
// three secondary stats below: Won (all-time profit from settled wins),
// Available (wallet liquid), and Staked (kobo currently locked in open bets).
// All amounts arrive as kobo bigint strings and are formatted to naira.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { RollingNumber } from '@/components/motion';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { rs } from '@/utils/responsive';

export interface BalanceSummaryProps {
  availableKobo: string | null;
  stakedKobo: string | null;
  wonKobo: string | null;
}

function koboToNairaNumber(koboString: string | null | undefined): number {
  if (!koboString) return 0;
  try {
    return Number(BigInt(koboString) / 100n);
  } catch {
    return 0;
  }
}

function safeBigInt(v: string | null | undefined): bigint {
  if (!v) return 0n;
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  availableKobo,
  stakedKobo,
  wonKobo,
}) => {
  const totalKoboStr = useMemo(() => {
    const total = safeBigInt(availableKobo) + safeBigInt(stakedKobo);
    return total.toString();
  }, [availableKobo, stakedKobo]);

  const totalNaira = koboToNairaNumber(totalKoboStr);
  const safeForRolling = Number.isSafeInteger(totalNaira);
  const totalFallback = `₦${formatKoboAsNaira(totalKoboStr)}`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>TOTAL BALANCE</Text>
      <View style={styles.row}>
        <Text style={styles.naira}>₦</Text>
        {safeForRolling ? (
          <RollingNumber
            value={totalNaira}
            format={(n) => n.toLocaleString('en-US')}
            digitHeight={rs.font(40) * 1.05}
            textStyle={styles.amount}
          />
        ) : (
          <Text
            style={styles.amount}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={totalFallback}
          >
            {totalFallback.replace('₦', '')}
          </Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <Stat
          label="Won"
          value={`₦${formatKoboAsNaira(wonKobo)}`}
          accent={Colors.status.win}
        />
        <Divider />
        <Stat label="Available" value={`₦${formatKoboAsNaira(availableKobo)}`} />
        <Divider />
        <Stat label="Staked" value={`₦${formatKoboAsNaira(stakedKobo)}`} />
      </View>
    </View>
  );
};

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[styles.statValue, accent ? { color: accent } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: rs.size(16),
    marginHorizontal: rs.size(20),
    paddingHorizontal: rs.size(18),
    paddingVertical: rs.size(18),
    backgroundColor: Colors.surface['01'],
    borderRadius: rs.size(20),
    borderWidth: 1,
    borderColor: Colors.border.s01,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 1.4,
  },
  row: {
    marginTop: rs.size(8),
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  naira: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(26),
    color: Colors.text.primary,
    marginRight: rs.size(4),
    lineHeight: rs.font(40) * 1.05,
    includeFontPadding: false,
  },
  amount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(40),
    color: Colors.text.primary,
    letterSpacing: -1,
    includeFontPadding: false,
  },
  statsRow: {
    marginTop: rs.size(18),
    paddingTop: rs.size(14),
    borderTopWidth: 1,
    borderTopColor: Colors.border.s01,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    letterSpacing: 0.4,
  },
  statValue: {
    marginTop: rs.size(4),
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    color: Colors.text.primary,
  },
  divider: {
    width: 1,
    height: rs.size(28),
    backgroundColor: Colors.border.s01,
    marginHorizontal: rs.size(10),
  },
});
