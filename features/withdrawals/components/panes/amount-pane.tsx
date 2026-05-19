// features/withdrawals/components/panes/amount-pane.tsx
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { sanitizeNairaInput } from '@/features/withdrawals/api/withdrawals-api';
import { PressableSpring } from '@/components/motion';
import { QuickAmountChip } from '@/components/wallet';
import { sheetStyles, ACCENT } from '../sheet-styles';

const QUICK = [1_000, 2_000, 5_000, 10_000, 20_000];

type Props = {
  value: string;
  onChangeValue: (v: string) => void;
  walletAvailableKobo: string | null;
  validation: { ok: boolean; reason: string };
  onContinue: () => void;
};

export function AmountPane({
  value,
  onChangeValue,
  walletAvailableKobo,
  validation,
  onContinue,
}: Props) {
  return (
    <>
      <View style={sheetStyles.headerRow}>
        <View style={sheetStyles.dot} />
        <Text style={sheetStyles.eyebrow}>WITHDRAW</Text>
      </View>
      <Text style={sheetStyles.title}>How much?</Text>

      <View style={styles.walletRow}>
        <Text style={styles.walletLabel}>Available</Text>
        <Text style={styles.walletValue}>
          ₦{formatKoboAsNaira(walletAvailableKobo)}
        </Text>
      </View>

      <View style={styles.inputBlock}>
        <Text style={styles.naira}>₦</Text>
        <TextInput
          value={value}
          onChangeText={(t) => onChangeValue(sanitizeNairaInput(t))}
          placeholder="0"
          placeholderTextColor="#2A2A2A"
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={9}
          style={styles.input}
          accessibilityLabel="Withdrawal amount in naira"
          selectionColor={ACCENT}
          autoFocus
        />
      </View>

      <View style={styles.chipsRow}>
        {QUICK.map((n) => {
          const selected = value === String(n);
          return (
            <QuickAmountChip
              key={n}
              amount={n}
              selected={selected}
              hasSelection={QUICK.some((q) => value === String(q))}
              onPress={() => onChangeValue(String(n))}
            />
          );
        })}
      </View>

      {validation.reason ? (
        <View style={sheetStyles.errorBox}>
          <Feather
            name="alert-circle"
            size={rs.font(14)}
            color="#FF5A5A"
          />
          <Text style={sheetStyles.errorText}>{validation.reason}</Text>
        </View>
      ) : null}

      <PressableSpring
        onPress={onContinue}
        disabled={!validation.ok}
        variant="primary"
        haptic="medium"
        accessibilityLabel="Continue"
        accessibilityHint="Proceed to choose a destination account"
        style={{ opacity: !validation.ok ? 0.4 : 1 }}
      >
        <View style={sheetStyles.submit}>
          <Text style={sheetStyles.submitText}>Continue</Text>
        </View>
      </PressableSpring>

      <Text style={styles.slaNote} accessibilityRole="text">
        Withdrawals are processed within 4 hours
      </Text>

      <Text style={styles.minNote}>Min: ₦200</Text>
    </>
  );
}

const styles = StyleSheet.create({
  walletRow: {
    marginTop: rs.size(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#666666',
    letterSpacing: 0.4,
  },
  walletValue: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  inputBlock: {
    marginTop: rs.size(16),
    backgroundColor: '#181818',
    borderRadius: rs.size(16),
    paddingHorizontal: rs.size(20),
    paddingVertical: rs.size(18),
    flexDirection: 'row',
    alignItems: 'center',
  },
  naira: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(34),
    color: '#FFFFFF',
    marginRight: rs.size(6),
  },
  input: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: rs.font(34),
    color: '#FFFFFF',
    padding: 0,
  },
  chipsRow: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs.size(8),
  },
  slaNote: {
    marginTop: rs.size(12),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
    textAlign: 'center',
  },
  minNote: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#555555',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
