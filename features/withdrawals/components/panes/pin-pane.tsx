// features/withdrawals/components/panes/pin-pane.tsx
//
// PIN is sensitive — held in component state and wiped (setPin('')) the
// instant the initiate API call returns, regardless of outcome. Never
// persisted, never logged.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { useBankAccounts } from '@/features/withdrawals/hooks/use-bank-accounts';
import PinInput from '@/components/ui/PinInput';
import { sheetStyles } from '../sheet-styles';

type Props = {
  amountKobo: string;
  bankAccountId: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (pin: string) => Promise<void> | void;
  onBack: () => void;
};

const PIN_LENGTH = 4;

export function PinPane({
  amountKobo,
  bankAccountId,
  isSubmitting,
  error,
  onSubmit,
  onBack,
}: Props) {
  const [pin, setPin] = useState('');
  const accountsQuery = useBankAccounts();
  const account = accountsQuery.data?.find((a) => a.id === bankAccountId);

  // Wipe pin if the pane unmounts unexpectedly.
  useEffect(() => {
    return () => setPin('');
  }, []);

  const handleSubmit = async () => {
    if (pin.length !== PIN_LENGTH) return;
    const captured = pin;
    // Wipe immediately — the captured local copy is what travels to the API.
    setPin('');
    await onSubmit(captured);
  };

  return (
    <>
      <View style={sheetStyles.headerRow}>
        <View style={sheetStyles.dot} />
        <Text style={sheetStyles.eyebrow}>CONFIRM</Text>
      </View>
      <Text style={sheetStyles.title}>Enter PIN to confirm</Text>

      <View style={styles.summary}>
        <SummaryRow label="Amount" value={`₦${formatKoboAsNaira(amountKobo)}`} />
        <SummaryRow
          label="Destination"
          value={
            account
              ? `${account.bankName} •••• ${account.accountNumber.slice(-4)}`
              : 'Selected account'
          }
        />
      </View>

      <View style={styles.pinWrap}>
        <PinInput
          value={pin}
          onChangeText={setPin}
          length={PIN_LENGTH}
          autoFocus
        />
      </View>

      {error ? (
        <View style={sheetStyles.errorBox}>
          <Feather
            name="alert-circle"
            size={rs.font(14)}
            color="#FF5A5A"
          />
          <Text style={sheetStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={pin.length !== PIN_LENGTH || isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Confirm withdrawal"
        style={({ pressed }) => [
          sheetStyles.submit,
          {
            opacity:
              pin.length !== PIN_LENGTH || isSubmitting
                ? 0.4
                : pressed
                  ? 0.85
                  : 1,
          },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#0A0A0A" />
        ) : (
          <Text style={sheetStyles.submitText}>Confirm withdrawal</Text>
        )}
      </Pressable>

      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.backLinkRow}
        disabled={isSubmitting}
      >
        <Feather name="chevron-left" size={rs.font(14)} color="#888" />
        <Text style={styles.backLinkText}>Back</Text>
      </Pressable>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginTop: rs.size(20),
    padding: rs.size(16),
    borderRadius: rs.size(14),
    backgroundColor: '#181818',
    gap: rs.size(10),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: rs.size(12),
  },
  summaryLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#888',
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  pinWrap: {
    marginTop: rs.size(24),
    paddingHorizontal: rs.size(20),
  },
  backLinkRow: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: rs.size(2),
  },
  backLinkText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: '#888888',
  },
});
