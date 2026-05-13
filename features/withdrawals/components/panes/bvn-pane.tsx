// features/withdrawals/components/panes/bvn-pane.tsx
//
// BVN is sensitive — it lives in component state ONLY and is wiped via
// setBvn('') as soon as the verify mutation settles, regardless of outcome.
// Never log it, never put it in Redux, never let it touch a query cache.
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { useVerifyBvn } from '@/features/withdrawals/hooks/use-bvn';
import { extractWithdrawalError } from '@/features/withdrawals/hooks/use-withdrawals';
import { sheetStyles, ACCENT } from '../sheet-styles';

type Props = {
  onVerified: () => void;
  onBack: () => void;
};

export function BvnPane({ onVerified, onBack }: Props) {
  const [bvn, setBvn] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const verifyMutation = useVerifyBvn();

  const onSubmit = async () => {
    if (bvn.length !== 11) return;
    setLocalError(null);
    try {
      const res = await verifyMutation.mutateAsync(bvn);
      // Wipe immediately regardless of outcome.
      setBvn('');
      if (!res.verified) {
        setLocalError(res.reason ?? 'BVN could not be verified');
        return;
      }
      onVerified();
    } catch {
      // Wipe even on throw.
      setBvn('');
      // Error is rendered via verifyMutation.error.
    }
  };

  const apiError = verifyMutation.error
    ? extractWithdrawalError(verifyMutation.error)
    : null;
  const error = localError ?? apiError;

  return (
    <>
      <View style={sheetStyles.headerRow}>
        <View style={sheetStyles.dot} />
        <Text style={sheetStyles.eyebrow}>VERIFY IDENTITY</Text>
      </View>
      <Text style={sheetStyles.title}>Enter your BVN</Text>
      <Text style={sheetStyles.subtitle}>
        Required for withdrawals above ₦10,000.
      </Text>

      <View style={styles.inputBlock}>
        <TextInput
          value={bvn}
          onChangeText={(t) => setBvn(t.replace(/\D/g, '').slice(0, 11))}
          placeholder="11-digit BVN"
          placeholderTextColor="#444"
          keyboardType="number-pad"
          maxLength={11}
          style={styles.input}
          accessibilityLabel="Bank Verification Number"
          accessibilityHint="Eleven digit Bank Verification Number"
          autoFocus
          // BVN is sensitive — keep it out of autofill, paste history, and the
          // OS keyboard's learned-words store.
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          contextMenuHidden
          selectionColor={ACCENT}
        />
      </View>

      <View style={styles.privacyRow}>
        <Feather name="lock" size={rs.font(12)} color="#888" />
        <Text style={styles.privacyText}>
          Your BVN is hashed and never stored in plain text.
        </Text>
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
        onPress={onSubmit}
        disabled={bvn.length !== 11 || verifyMutation.isPending}
        accessibilityRole="button"
        accessibilityLabel="Verify BVN"
        style={({ pressed }) => [
          sheetStyles.submit,
          {
            opacity:
              bvn.length !== 11 || verifyMutation.isPending
                ? 0.4
                : pressed
                  ? 0.85
                  : 1,
          },
        ]}
      >
        <Text style={sheetStyles.submitText}>
          {verifyMutation.isPending ? 'Verifying…' : 'Verify'}
        </Text>
      </Pressable>

      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.backLinkRow}
      >
        <Feather name="chevron-left" size={rs.font(14)} color="#888" />
        <Text style={styles.backLinkText}>Back</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  inputBlock: {
    marginTop: rs.size(20),
    paddingHorizontal: rs.size(18),
    paddingVertical: rs.size(16),
    backgroundColor: '#181818',
    borderRadius: rs.size(14),
  },
  input: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(20),
    color: '#FFFFFF',
    letterSpacing: 4,
    padding: 0,
  },
  privacyRow: {
    marginTop: rs.size(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
  },
  privacyText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#888',
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
