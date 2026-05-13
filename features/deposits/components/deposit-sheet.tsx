// features/deposits/components/deposit-sheet.tsx
//
// Bottom-sheet driven deposit flow. Mirrors the BetSheet visual system so the
// app feels coherent: backdrop fade + spring slide-up, naira input with
// quick-amount chips, single primary CTA. Three pane states are rendered
// inside the same sheet:
//
//   1. `entry`   — amount input + chips + Continue
//   2. `processing` — Paystack browser is open / poll is in flight
//   3. `terminal`  — success or failed, with primary action
//
// Network is owned by `useInitializeDeposit` + `useDepositStatus` (TanStack
// Query). The Paystack URL is opened with `expo-web-browser`'s in-app
// session — Paystack's webhook credits the wallet, we just poll status.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { API_BASE_URL } from '@/lib/api/axios';
import { useAuth } from '@/features/auth';
import {
  DEPOSIT_MAX_KOBO,
  DEPOSIT_MIN_KOBO,
} from '@/features/deposits/api/deposits-api';
import {
  extractDepositError,
  useDepositStatus,
  useInitializeDeposit,
} from '@/features/deposits/hooks/use-deposit';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const QUICK_NAIRA = [500, 1_000, 2_000, 5_000, 10_000];
const ACCENT = '#FF6500';

type Pane = 'entry' | 'processing' | 'terminal';

export function DepositSheet({ visible, onClose }: Props) {
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const { walletAvailableKobo, refreshMe } = useAuth();

  const initMutation = useInitializeDeposit();
  const [reference, setReference] = useState<string | undefined>();
  const [pane, setPane] = useState<Pane>('entry');
  const [stakeNairaText, setStakeNairaText] = useState('');

  // Poll status only while we're in the processing pane — flipping `enabled`
  // halts the React Query interval cleanly.
  const statusQuery = useDepositStatus({
    reference,
    enabled: pane === 'processing',
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      // Reset everything for a fresh deposit.
      setStakeNairaText('');
      setReference(undefined);
      setPane('entry');
      initMutation.reset();
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        }),
      ]).start();
    } else {
      translateY.setValue(400);
      backdropOpacity.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Move to terminal pane once the poll resolves to a non-pending state.
  useEffect(() => {
    if (pane !== 'processing') return;
    const status = statusQuery.data?.status;
    if (status === 'success' || status === 'failed') {
      Haptics.notificationAsync(
        status === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      if (status === 'success') void refreshMe();
      setPane('terminal');
    }
  }, [pane, statusQuery.data?.status, refreshMe]);

  // ── Derived values ───────────────────────────────────────────────────────
  const stakeKobo = useMemo(() => nairaTextToKobo(stakeNairaText), [
    stakeNairaText,
  ]);

  const validation = useMemo(() => {
    if (stakeKobo === null || stakeKobo <= 0n) {
      return { ok: false, reason: '' };
    }
    if (stakeKobo < DEPOSIT_MIN_KOBO) {
      return {
        ok: false,
        reason: `Minimum deposit is ₦${formatKoboAsNaira(
          DEPOSIT_MIN_KOBO.toString()
        )}`,
      };
    }
    if (stakeKobo > DEPOSIT_MAX_KOBO) {
      return {
        ok: false,
        reason: `Maximum deposit is ₦${formatKoboAsNaira(
          DEPOSIT_MAX_KOBO.toString()
        )}`,
      };
    }
    return { ok: true, reason: '' };
  }, [stakeKobo]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const continueToPaystack = async () => {
    if (!validation.ok || stakeKobo === null) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const init = await initMutation.mutateAsync({
        amountKobo: stakeKobo.toString(),
      });
      setReference(init.reference);
      setPane('processing');
      // openBrowserAsync resolves when the user dismisses the in-app browser.
      // The Paystack webhook is what actually credits the wallet — the poll
      // started above will surface the result.
      await WebBrowser.openBrowserAsync(toCheckoutUrl(init.authorizationUrl), {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: ACCENT,
        toolbarColor: '#0A0A0A',
      });
      // Force an immediate refetch when the user returns — don't make them
      // wait the full poll interval to see the resolved state.
      void statusQuery.refetch();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Mutation error is rendered via initMutation.error below.
      void e;
    }
  };

  const handleQuickPick = (naira: number) => {
    Haptics.selectionAsync();
    setStakeNairaText(String(naira));
  };

  const handleClose = () => {
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const initError = initMutation.error
    ? extractDepositError(initMutation.error)
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
          >
            <View style={styles.handle} />

            {pane === 'entry' && (
              <EntryPane
                stakeNairaText={stakeNairaText}
                setStakeNairaText={setStakeNairaText}
                walletAvailableKobo={walletAvailableKobo}
                onQuickPick={handleQuickPick}
                validation={validation}
                error={initError}
                isPending={initMutation.isPending}
                onContinue={continueToPaystack}
              />
            )}

            {pane === 'processing' && (
              <ProcessingPane
                amountKobo={stakeKobo?.toString() ?? '0'}
                statusError={
                  statusQuery.isError
                    ? "Couldn't reach the server. Retrying…"
                    : null
                }
              />
            )}

            {pane === 'terminal' && statusQuery.data && (
              <TerminalPane
                status={statusQuery.data.status}
                amountKobo={statusQuery.data.amountKobo}
                failureReason={statusQuery.data.failureReason}
                onPrimary={() => {
                  if (statusQuery.data?.status === 'failed') {
                    setPane('entry');
                    setReference(undefined);
                  } else {
                    handleClose();
                  }
                }}
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Pane: entry ─────────────────────────────────────────────────────────────

type EntryPaneProps = {
  stakeNairaText: string;
  setStakeNairaText: (v: string) => void;
  walletAvailableKobo: string | null;
  onQuickPick: (n: number) => void;
  validation: { ok: boolean; reason: string };
  error: string | null;
  isPending: boolean;
  onContinue: () => void;
};

function EntryPane({
  stakeNairaText,
  setStakeNairaText,
  walletAvailableKobo,
  onQuickPick,
  validation,
  error,
  isPending,
  onContinue,
}: EntryPaneProps) {
  return (
    <>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: ACCENT }]} />
        <Text style={styles.eyebrow}>ADD MONEY</Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        Top up your wallet
      </Text>

      <View style={styles.walletRow}>
        <Text style={styles.walletLabel}>Current balance</Text>
        <Text style={styles.walletValue}>
          ₦{formatKoboAsNaira(walletAvailableKobo)}
        </Text>
      </View>

      <View style={styles.inputBlock}>
        <Text style={styles.naira}>₦</Text>
        <TextInput
          value={stakeNairaText}
          onChangeText={(t) => setStakeNairaText(sanitizeNairaInput(t))}
          placeholder="0"
          placeholderTextColor="#2A2A2A"
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={9}
          style={styles.input}
          accessibilityLabel="Deposit amount in naira"
          selectionColor={ACCENT}
          autoFocus
        />
      </View>

      <View style={styles.chipsRow}>
        {QUICK_NAIRA.map((n) => (
          <Pressable
            key={n}
            onPress={() => onQuickPick(n)}
            accessibilityRole="button"
            accessibilityLabel={`Quick deposit ${n} naira`}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={styles.chipText}>
              ₦{n.toLocaleString()}
            </Text>
          </Pressable>
        ))}
      </View>

      {(error || validation.reason) && (
        <View style={styles.errorBox}>
          <Feather
            name="alert-circle"
            size={rs.font(14)}
            color="#FF5A5A"
          />
          <Text style={styles.errorText}>
            {error ?? validation.reason}
          </Text>
        </View>
      )}

      <Pressable
        onPress={onContinue}
        disabled={!validation.ok || isPending}
        accessibilityRole="button"
        accessibilityLabel="Continue to Paystack"
        accessibilityHint="Opens the Paystack checkout in a secure browser"
        style={({ pressed }) => [
          styles.submit,
          {
            opacity:
              !validation.ok || isPending ? 0.4 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={styles.submitText}>
          {isPending ? 'Preparing…' : 'Continue to Paystack'}
        </Text>
      </Pressable>

      <Text style={styles.legal}>
        Secure payment powered by Paystack · No card details touch our servers
      </Text>
    </>
  );
}

// ── Pane: processing ────────────────────────────────────────────────────────

function ProcessingPane({
  amountKobo,
  statusError,
}: {
  amountKobo: string;
  statusError: string | null;
}) {
  // Subtle pulse on the icon — communicates "we're listening" without a spinner.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.terminalWrap}>
      <Animated.View
        style={[
          styles.terminalIconCircle,
          { backgroundColor: '#1A1208', opacity: pulse },
        ]}
      >
        <Feather name="clock" size={rs.font(28)} color={ACCENT} />
      </Animated.View>
      <Text style={styles.terminalTitle}>Waiting for payment</Text>
      <Text style={styles.terminalSubtitle}>
        Finish the payment in the browser. We&apos;ll credit ₦
        {formatKoboAsNaira(amountKobo)} to your wallet automatically.
      </Text>
      {statusError ? (
        <Text style={styles.terminalNote}>{statusError}</Text>
      ) : (
        <Text style={styles.terminalNote}>Checking status every few seconds…</Text>
      )}
    </View>
  );
}

// ── Pane: terminal ──────────────────────────────────────────────────────────

function TerminalPane({
  status,
  amountKobo,
  failureReason,
  onPrimary,
}: {
  status: 'success' | 'failed' | 'pending';
  amountKobo: string;
  failureReason: string | null;
  onPrimary: () => void;
}) {
  const isSuccess = status === 'success';
  return (
    <View style={styles.terminalWrap}>
      <View
        style={[
          styles.terminalIconCircle,
          { backgroundColor: isSuccess ? '#0F1F12' : '#1F0E0E' },
        ]}
      >
        <Feather
          name={isSuccess ? 'check' : 'x'}
          size={rs.font(30)}
          color={isSuccess ? '#5BD37A' : '#FF5A5A'}
        />
      </View>
      <Text style={styles.terminalTitle}>
        {isSuccess ? 'Wallet topped up' : 'Payment failed'}
      </Text>
      <Text style={styles.terminalSubtitle}>
        {isSuccess
          ? `₦${formatKoboAsNaira(amountKobo)} is now in your wallet.`
          : failureReason ?? "We couldn't confirm your payment."}
      </Text>
      <Pressable
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={isSuccess ? 'Done' : 'Try again'}
        style={({ pressed }) => [
          styles.submit,
          { marginTop: rs.size(28), opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.submitText}>
          {isSuccess ? 'Done' : 'Try again'}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sanitizeNairaInput(text: string): string {
  // Strip everything that isn't a digit. We never accept decimals here — the
  // backend bound is in whole kobo and the chips are integer naira.
  const digits = text.replace(/\D/g, '');
  // Drop leading zeros so '0500' becomes '500'.
  return digits.replace(/^0+(?=\d)/, '');
}

// In Paystack mock mode the backend returns a localhost URL like
// `http://localhost:3000/deposits/{ref}/mock-checkout?...`. That host obviously
// can't load on a real device, so we rewrite it to the live API base. Real
// Paystack URLs (checkout.paystack.com / paystack.shop) pass through
// untouched.
function toCheckoutUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const isLocal =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '0.0.0.0';
    if (!isLocal) return rawUrl;
    const base = new URL(API_BASE_URL);
    url.protocol = base.protocol;
    url.host = base.host;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function nairaTextToKobo(text: string): bigint | null {
  if (!text) return null;
  try {
    return BigInt(text) * 100n;
  } catch {
    return null;
  }
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  kav: { width: '100%', justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: rs.size(28),
    borderTopRightRadius: rs.size(28),
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(10),
    paddingBottom: rs.size(28),
  },
  handle: {
    alignSelf: 'center',
    width: rs.size(40),
    height: rs.size(5),
    borderRadius: rs.size(3),
    backgroundColor: '#2A2A2A',
    marginBottom: rs.size(20),
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  dot: {
    width: rs.size(8),
    height: rs.size(8),
    borderRadius: rs.size(4),
  },
  eyebrow: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: '#666666',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: rs.size(8),
    fontFamily: Fonts.bold,
    fontSize: rs.font(24),
    color: '#FFFFFF',
    lineHeight: rs.font(30),
  },

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
  chip: {
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(8),
    borderRadius: rs.size(9999),
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#222222',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#DDDDDD',
  },

  errorBox: {
    marginTop: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    backgroundColor: '#1F0E0E',
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(12),
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: '#FF8A8A',
  },

  submit: {
    marginTop: rs.size(20),
    backgroundColor: ACCENT,
    paddingVertical: rs.size(16),
    borderRadius: rs.size(9999),
    alignItems: 'center',
  },
  submitText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },
  legal: {
    marginTop: rs.size(12),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#555555',
    textAlign: 'center',
  },

  terminalWrap: {
    paddingVertical: rs.size(16),
    alignItems: 'center',
  },
  terminalIconCircle: {
    width: rs.size(72),
    height: rs.size(72),
    borderRadius: rs.size(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalTitle: {
    marginTop: rs.size(20),
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  terminalSubtitle: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: rs.size(12),
    lineHeight: rs.font(19),
  },
  terminalNote: {
    marginTop: rs.size(16),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
    textAlign: 'center',
  },
});
