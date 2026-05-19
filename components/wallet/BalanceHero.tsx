// components/wallet/BalanceHero.tsx
// War-chest hero. Display-ramp ₦ amount that odometer-rolls on mount and
// every update via `RollingNumber`. The naira symbol is rendered as a
// detached display glyph next to the rolling digits so the tabular-nums
// alignment of the digits is preserved.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { RollingNumber } from '@/components/motion';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { rs } from '@/utils/responsive';

export interface BalanceHeroProps {
  /** Wallet available balance in kobo (bigint string). */
  availableKobo: string | null;
  /** Optional label shown above the amount. */
  label?: string;
  /** Optional helper line shown beneath the amount. */
  hint?: string;
}

function koboToNairaNumber(koboString: string | null | undefined): number {
  if (!koboString) return 0;
  try {
    // Display only — kobo-level precision is preserved upstream. The odometer
    // animates the naira integer, which is what the human reads.
    return Number(BigInt(koboString) / 100n);
  } catch {
    return 0;
  }
}

export const BalanceHero: React.FC<BalanceHeroProps> = ({
  availableKobo,
  label = 'WAR CHEST',
  hint,
}) => {
  const value = koboToNairaNumber(availableKobo);
  // Fallback string used when the value is too large for JS Number precision.
  const safeFallback = `₦${formatKoboAsNaira(availableKobo)}`;
  const useFallback = !Number.isSafeInteger(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={styles.naira}>₦</Text>
        {useFallback ? (
          <Text
            style={styles.fallback}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLiveRegion="polite"
            accessibilityLabel={safeFallback}
          >
            {safeFallback.replace('₦', '')}
          </Text>
        ) : (
          <RollingNumber
            value={value}
            format={(n) => n.toLocaleString('en-US')}
            digitHeight={rs.font(48) * 1.05}
            textStyle={styles.amount}
          />
        )}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(16),
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: Colors.text.secondary,
    letterSpacing: 1.4,
  },
  row: {
    marginTop: rs.size(8),
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  naira: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(32),
    color: Colors.text.primary,
    marginRight: rs.size(4),
    lineHeight: rs.font(48) * 1.05,
    includeFontPadding: false,
  },
  amount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(48),
    color: Colors.text.primary,
    letterSpacing: -1.2,
    includeFontPadding: false,
  },
  fallback: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(48),
    color: Colors.text.primary,
    letterSpacing: -1.2,
    includeFontPadding: false,
  },
  hint: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
});
