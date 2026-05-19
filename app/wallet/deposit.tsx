// app/wallet/deposit.tsx
//
// Stripe-backed deposit screen. Five distinct visual states:
//   1. entry       — naira input + quick-pick chips + Continue
//   2. processing  — Stripe browser sheet open / polling for confirmation
//   3. success     — wallet credited, balance refreshed via cache invalidation
//   4. failed      — payment failed or expired; offer Try again
//   5. cancelled   — user dismissed the Stripe sheet without paying
//
// Flow resilience:
//   - The active sessionId + amountKobo are persisted in Redux. On mount we
//     check for a non-terminal flow and resume polling so a backgrounded /
//     killed app picks up exactly where it left off.
//   - Polling is bounded (10 × 2s). After the budget is exhausted we land on
//     the "still processing" screen — the webhook may still arrive shortly
//     and `useFocusEffect` revalidates ['me'] on return.
//
// Stripe quirks:
//   - openAuthSessionAsync is given the EXACT wahala://deposit/success URL so
//     the Safari sheet auto-dismisses when Stripe redirects.
//   - The checkoutUrl is never cached. Each Continue press calls
//     /deposits/initiate fresh.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import RNAnimated, {
  Easing as REasing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { Fonts } from '@/constants/fonts';
import { Colors } from '@/constants/colors';
import { rs } from '@/utils/responsive';
import { PressableSpring, RollingNumber } from '@/components/motion';
import { CheckMarkDraw, QuickAmountChip } from '@/components/wallet';
import { haptic } from '@/lib/motion/haptics';
import { useToast } from '@/hooks/useToast';
import { authKeys, useAuth } from '@/features/auth';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  DEPOSIT_MAX_KOBO,
  DEPOSIT_MIN_KOBO,
  compareKobo,
  depositCancelled,
  depositCompleted,
  depositFailed,
  depositInitiating,
  depositSessionStarted,
  extractDepositError,
  isResumableFlowStatus,
  nairaTextToKoboString,
  resetDepositFlow,
  sanitizeNairaInput,
  useDepositStatusPolling,
  useInitiateDeposit,
  type DepositStatus,
  type DepositStatusResponse,
} from '@/features/deposits';

const ACCENT = '#FF6500';
const QUICK_NAIRA = [1_000, 2_000, 5_000, 10_000];
const RETURN_URL = 'wahala://deposit/success';

type Pane = 'entry' | 'processing' | 'success' | 'failed' | 'cancelled';

export default function DepositScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { walletAvailableKobo } = useAuth();

  const depositState = useAppSelector((s) => s.deposit);
  const initMutation = useInitiateDeposit();
  const toast = useToast();

  // On mount we only resume a deposit if it's genuinely mid-flight (loading
  // or processing with a sessionId). Terminal states from a previous attempt
  // — completed/failed/cancelled — are stale UI noise; the user opened the
  // screen because they want to deposit *now*, not see last week's failure.
  // We wipe the slice in that case so they start fresh at the entry pane.
  const initialPane: Pane = useMemo(() => {
    if (
      depositState.sessionId &&
      isResumableFlowStatus(depositState.status)
    ) {
      return 'processing';
    }
    return 'entry';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pane, setPane] = useState<Pane>(initialPane);

  // One-shot wipe for stale terminal flows. Runs only on first mount so the
  // user doesn't see "Deposit failed" left over from a previous session.
  const didResetStaleRef = useRef(false);
  useEffect(() => {
    if (didResetStaleRef.current) return;
    didResetStaleRef.current = true;
    if (initialPane === 'entry' && depositState.status !== 'idle') {
      dispatch(resetDepositFlow());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [stakeNairaText, setStakeNairaText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  // Guards against double-submission while the network call is in flight or
  // the in-app browser is launching. Reset back to false in finally{}.
  const submittingRef = useRef(false);

  const stakeKoboString = useMemo(
    () => nairaTextToKoboString(stakeNairaText),
    [stakeNairaText]
  );

  const validation = useMemo(() => {
    if (!stakeKoboString) return { ok: false, reason: '' };
    if (compareKobo(stakeKoboString, 1n) < 0) {
      return { ok: false, reason: '' };
    }
    if (compareKobo(stakeKoboString, DEPOSIT_MIN_KOBO) < 0) {
      return {
        ok: false,
        reason: `Minimum deposit is ₦${formatKoboAsNaira(
          DEPOSIT_MIN_KOBO.toString()
        )}`,
      };
    }
    if (compareKobo(stakeKoboString, DEPOSIT_MAX_KOBO) > 0) {
      return {
        ok: false,
        reason: `Maximum deposit is ₦${formatKoboAsNaira(
          DEPOSIT_MAX_KOBO.toString()
        )}`,
      };
    }
    return { ok: true, reason: '' };
  }, [stakeKoboString]);

  // ── Polling ─────────────────────────────────────────────────────────────
  // Driven entirely by Redux's persisted sessionId so a cold start with a
  // pending deposit re-enters polling automatically.
  const pollEnabled = pane === 'processing' && !!depositState.sessionId;

  const handleTerminal = useCallback(
    (data: DepositStatusResponse) => {
      if (data.status === 'completed') {
        haptic.success();
        toast.show({
          kind: 'success',
          title: 'Deposit complete',
          body: 'Your wallet has been credited.',
        });
        dispatch(depositCompleted());
        setPane('success');
      } else {
        // 'expired' and 'failed' both land on the failed pane.
        haptic.error();
        const message =
          data.status === 'expired'
            ? 'This payment session expired before it could be completed.'
            : 'Your payment could not be completed.';
        toast.show({ kind: 'error', title: 'Deposit failed', body: message });
        dispatch(depositFailed({ message }));
        setPane('failed');
      }
    },
    [dispatch, toast]
  );

  const handleTimeout = useCallback(() => {
    // Don't mark as failed — the webhook may still land. Just surface a
    // "still processing" affordance to the user.
    // We keep the slice in `processing` so background reconciliation can
    // continue when the user returns later.
  }, []);

  const polling = useDepositStatusPolling({
    sessionId: depositState.sessionId ?? undefined,
    enabled: pollEnabled,
    onTerminal: handleTerminal,
    onTimeout: handleTimeout,
  });

  // Manual refetch on screen focus — covers the "user came back from
  // background, payment already cleared" case so they don't wait a poll tick.
  useFocusEffect(
    useCallback(() => {
      if (pane === 'processing' && depositState.sessionId) {
        polling.refetchNow();
      }
      // Also keep the wallet balance fresh on focus, cheap and silent.
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    }, [pane, depositState.sessionId, polling, queryClient])
  );

  // Disable hardware back while a payment is in-flight so the user doesn't
  // accidentally lose track of the session via the Android system back.
  useEffect(() => {
    if (pane !== 'processing') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [pane]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const onBack = useCallback(() => {
    if (pane === 'processing') return; // Blocked — keep them in the flow.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [pane, router]);

  const onContinue = useCallback(async () => {
    if (submittingRef.current) return;
    if (!validation.ok || !stakeKoboString) return;

    submittingRef.current = true;
    setLocalError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    dispatch(depositInitiating({ amountKobo: stakeKoboString }));

    try {
      const init = await initMutation.mutateAsync({
        amountKobo: stakeKoboString,
      });
      dispatch(
        depositSessionStarted({
          sessionId: init.sessionId,
          amountKobo: stakeKoboString,
        })
      );
      setPane('processing');

      // openAuthSessionAsync — the redirect URL MUST match the backend's
      // success_url so the Safari sheet auto-closes on completion.
      const result = await WebBrowser.openAuthSessionAsync(
        init.checkoutUrl,
        RETURN_URL,
        {
          // iOS Safari sheet styling — slides up from bottom.
          preferEphemeralSession: false,
        }
      );

      // The browser sheet has been dismissed. Three outcomes matter:
      //   - 'success'   — Stripe redirected us, webhook is firing or fired.
      //                   Polling will surface the completed state.
      //   - 'cancel'    — User tapped Done/Cancel manually. Polling still
      //                   continues briefly in case they completed payment.
      //   - 'dismiss'   — App brought to background and back. Re-poll.
      if (result.type === 'success' || result.type === 'cancel') {
        polling.refetchNow();
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = extractDepositError(err);
      setLocalError(message);
      dispatch(depositFailed({ message }));
      // Keep them on the entry pane so they can correct & retry without a
      // visual jump — the error is rendered inline below the input.
      setPane('entry');
    } finally {
      submittingRef.current = false;
    }
  }, [
    validation.ok,
    stakeKoboString,
    dispatch,
    initMutation,
    polling,
  ]);

  const onQuickPick = useCallback((naira: number) => {
    Haptics.selectionAsync();
    setStakeNairaText(String(naira));
    setLocalError(null);
  }, []);

  const onCancelProcessing = useCallback(() => {
    Haptics.selectionAsync();
    dispatch(depositCancelled());
    setPane('cancelled');
  }, [dispatch]);

  const startOver = useCallback(() => {
    Haptics.selectionAsync();
    setStakeNairaText('');
    setLocalError(null);
    initMutation.reset();
    dispatch(resetDepositFlow());
    setPane('entry');
  }, [dispatch, initMutation]);

  const goDone = useCallback(() => {
    Haptics.selectionAsync();
    dispatch(resetDepositFlow());
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [dispatch, router]);

  // ── Render ───────────────────────────────────────────────────────────────
  const headerTitle = paneTitle(pane);
  const initError = initMutation.error
    ? extractDepositError(initMutation.error)
    : null;
  const inlineError = localError ?? initError ?? validation.reason;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityState={{ disabled: pane === 'processing' }}
          hitSlop={rs.size(12)}
          disabled={pane === 'processing'}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.pressed,
            pane === 'processing' && styles.backBtnDisabled,
          ]}
        >
          <Feather
            name="chevron-left"
            size={rs.font(24)}
            color={pane === 'processing' ? '#333333' : '#FFFFFF'}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          {pane === 'entry' && (
            <RNAnimated.View
              key="entry"
              style={styles.flex}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(180)}
            >
              <EntryPane
                stakeNairaText={stakeNairaText}
                setStakeNairaText={(t) => {
                  setStakeNairaText(t);
                  setLocalError(null);
                }}
                walletAvailableKobo={walletAvailableKobo}
                onQuickPick={onQuickPick}
                error={inlineError || null}
                isPending={initMutation.isPending || submittingRef.current}
                canContinue={validation.ok}
                onContinue={onContinue}
              />
            </RNAnimated.View>
          )}

          {pane === 'processing' && (
            <RNAnimated.View
              key="processing"
              style={styles.flex}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(180)}
            >
              <ProcessingPane
                amountKobo={depositState.amountKobo ?? '0'}
                attempts={polling.attempts}
                maxAttempts={polling.maxAttempts}
                timedOut={polling.timedOut}
                statusError={polling.isError ? 'Reconnecting…' : null}
                onCancel={onCancelProcessing}
              />
            </RNAnimated.View>
          )}

          {pane === 'success' && (
            <RNAnimated.View
              key="success"
              style={styles.flex}
              entering={FadeIn.duration(260)}
              exiting={FadeOut.duration(180)}
            >
              <ResultPane
                status="completed"
                amountKobo={depositState.amountKobo ?? '0'}
                message={null}
                primaryLabel="Done"
                onPrimary={goDone}
                secondaryLabel={null}
                onSecondary={null}
              />
            </RNAnimated.View>
          )}

          {pane === 'failed' && (
            <RNAnimated.View
              key="failed"
              style={styles.flex}
              entering={FadeIn.duration(260)}
              exiting={FadeOut.duration(180)}
            >
              <ResultPane
                status="failed"
                amountKobo={depositState.amountKobo ?? '0'}
                message={depositState.errorMessage}
                primaryLabel="Try again"
                onPrimary={startOver}
                secondaryLabel="Close"
                onSecondary={goDone}
              />
            </RNAnimated.View>
          )}

          {pane === 'cancelled' && (
            <RNAnimated.View
              key="cancelled"
              style={styles.flex}
              entering={FadeIn.duration(260)}
              exiting={FadeOut.duration(180)}
            >
              <ResultPane
                status="cancelled"
                amountKobo={depositState.amountKobo ?? '0'}
                message="You closed the payment before it was completed."
                primaryLabel="Try again"
                onPrimary={startOver}
                secondaryLabel="Close"
                onSecondary={goDone}
              />
            </RNAnimated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Panes ────────────────────────────────────────────────────────────────────

type EntryPaneProps = {
  stakeNairaText: string;
  setStakeNairaText: (v: string) => void;
  walletAvailableKobo: string | null;
  onQuickPick: (n: number) => void;
  error: string | null;
  isPending: boolean;
  canContinue: boolean;
  onContinue: () => void;
};

function EntryPane({
  stakeNairaText,
  setStakeNairaText,
  walletAvailableKobo,
  onQuickPick,
  error,
  isPending,
  canContinue,
  onContinue,
}: EntryPaneProps) {
  return (
    <View style={styles.paneRoot}>
      <View style={styles.balanceBlock}>
        <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
        <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
          ₦{formatKoboAsNaira(walletAvailableKobo)}
        </Text>
      </View>

      <Text style={styles.sectionEyebrow}>AMOUNT TO ADD</Text>
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
        {QUICK_NAIRA.map((n) => {
          const selected = stakeNairaText === String(n);
          return (
            <QuickAmountChip
              key={n}
              amount={n}
              selected={selected}
              hasSelection={QUICK_NAIRA.some((q) => stakeNairaText === String(q))}
              onPress={() => onQuickPick(n)}
            />
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={rs.font(14)} color="#FF5A5A" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.flex} />

      <PressableSpring
        onPress={onContinue}
        disabled={!canContinue || isPending}
        variant="primary"
        haptic="medium"
        accessibilityLabel="Continue to Stripe"
        accessibilityHint="Opens the Stripe checkout in a secure browser"
        style={{ opacity: !canContinue || isPending ? 0.4 : 1 }}
      >
        <View style={styles.submit}>
          <Text style={styles.submitText}>
            {isPending ? 'Preparing…' : 'Continue to Stripe'}
          </Text>
        </View>
      </PressableSpring>

      <Text style={styles.legal}>
        Secure payment powered by Stripe · Bank transfer or card
      </Text>
    </View>
  );
}

type ProcessingPaneProps = {
  amountKobo: string;
  attempts: number;
  maxAttempts: number;
  timedOut: boolean;
  statusError: string | null;
  onCancel: () => void;
};

function ProcessingPane({
  amountKobo,
  attempts,
  maxAttempts,
  timedOut,
  statusError,
  onCancel,
}: ProcessingPaneProps) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduced) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 700, easing: REasing.inOut(REasing.ease) }),
        withTiming(1, { duration: 700, easing: REasing.inOut(REasing.ease) })
      ),
      -1,
      false
    );
  }, [pulse, reduced]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.paneRoot, styles.centerPane]}>
      <RNAnimated.View
        style={[
          styles.iconCircle,
          { backgroundColor: '#1A1208' },
          pulseStyle,
        ]}
      >
        <Feather name="clock" size={rs.font(28)} color={ACCENT} />
      </RNAnimated.View>
      <Text style={styles.resultTitle}>
        {timedOut ? 'Still processing' : 'Waiting for payment'}
      </Text>
      <Text style={styles.resultSubtitle}>
        {timedOut
          ? `We haven't confirmed your ₦${formatKoboAsNaira(
              amountKobo
            )} deposit yet. It can take a minute longer — your wallet will update automatically when it lands.`
          : `Finish the payment in the browser. We'll credit ₦${formatKoboAsNaira(
              amountKobo
            )} to your wallet automatically.`}
      </Text>
      <View style={styles.noticeBox}>
        <Feather
          name="alert-triangle"
          size={rs.font(14)}
          color="#FFB266"
        />
        <Text style={styles.noticeText}>
          Don&apos;t close the app while we confirm your payment.
        </Text>
      </View>
      <Text style={styles.attemptsLine}>
        {statusError
          ? statusError
          : timedOut
            ? 'Pull-to-refresh from the wallet to recheck.'
            : `Checking… attempt ${Math.min(attempts + 1, maxAttempts)}/${maxAttempts}`}
      </Text>

      <View style={styles.flex} />

      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel this deposit"
        style={({ pressed }) => [
          styles.ghostBtn,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.ghostBtnText}>Cancel deposit</Text>
      </Pressable>
    </View>
  );
}

type ResultPaneProps = {
  status: 'completed' | 'failed' | 'cancelled';
  amountKobo: string;
  message: string | null;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string | null;
  onSecondary: (() => void) | null;
};

function ResultPane({
  status,
  amountKobo,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: ResultPaneProps) {
  const isSuccess = status === 'completed';
  const isFail = status === 'failed';

  const palette = isSuccess
    ? { bg: '#0F1F12', fg: Colors.status.win, variant: 'check' as const }
    : isFail
      ? { bg: '#1F0E0E', fg: Colors.status.loss, variant: 'x' as const }
      : { bg: '#1A1A1A', fg: Colors.text.secondary, variant: 'x' as const };

  const title = isSuccess
    ? 'Wallet topped up'
    : isFail
      ? 'Payment failed'
      : 'Payment cancelled';

  // Convert amountKobo to a naira number for the odometer. Kobo precision is
  // preserved server-side; the human reads the naira integer.
  const nairaValue = (() => {
    try {
      return Number(BigInt(amountKobo) / 100n);
    } catch {
      return 0;
    }
  })();
  const safeForRolling = Number.isSafeInteger(nairaValue);

  return (
    <View style={[styles.paneRoot, styles.centerPane]}>
      <View style={styles.successBadge}>
        {isSuccess ? (
          <View
            style={[
              styles.successGlow,
              { backgroundColor: Colors.status.win },
            ]}
          />
        ) : null}
        <CheckMarkDraw
          variant={palette.variant}
          color={palette.fg}
          background={palette.bg}
          size={rs.size(72)}
        />
      </View>

      <Text style={styles.resultTitle}>{title}</Text>

      {isSuccess ? (
        <View style={styles.successAmountRow}>
          <Text style={[styles.naira, styles.successNaira]}>+₦</Text>
          {safeForRolling ? (
            <RollingNumber
              value={nairaValue}
              format={(n) => n.toLocaleString('en-US')}
              digitHeight={rs.font(34) * 1.1}
              textStyle={styles.successAmount}
            />
          ) : (
            <Text style={styles.successAmount}>
              {formatKoboAsNaira(amountKobo)}
            </Text>
          )}
        </View>
      ) : null}

      <Text style={styles.resultSubtitle}>
        {isSuccess
          ? 'Money don land. Time to find market.'
          : (message ?? 'You can try again whenever you\u2019re ready.')}
      </Text>

      <View style={styles.flex} />

      <PressableSpring
        onPress={onPrimary}
        variant="primary"
        haptic="medium"
        accessibilityLabel={primaryLabel}
        style={styles.resultButtonStretch}
      >
        <View style={styles.submit}>
          <Text style={styles.submitText}>{primaryLabel}</Text>
        </View>
      </PressableSpring>

      {secondaryLabel && onSecondary ? (
        <PressableSpring
          onPress={onSecondary}
          variant="ghost"
          haptic="tap"
          accessibilityLabel={secondaryLabel}
          style={styles.resultButtonStretch}
        >
          <View style={styles.ghostBtn}>
            <Text style={styles.ghostBtnText}>{secondaryLabel}</Text>
          </View>
        </PressableSpring>
      ) : null}
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function paneTitle(pane: Pane): string {
  switch (pane) {
    case 'entry':
      return 'Add money';
    case 'processing':
      return 'Confirming payment';
    case 'success':
      return 'Deposit complete';
    case 'failed':
      return 'Deposit failed';
    case 'cancelled':
      return 'Deposit cancelled';
  }
}

// Compile-time exhaustiveness for DepositStatus → flow Pane mapping. Unused
// at runtime; the inline `if`s above cover it, but keeps types honest.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _statusMap: Record<DepositStatus, Pane> = {
  pending: 'processing',
  completed: 'success',
  failed: 'failed',
  expired: 'failed',
};

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: rs.size(12),
    paddingTop: rs.size(8),
    paddingBottom: rs.size(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: rs.size(40),
    height: rs.size(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnDisabled: {
    opacity: 0.4,
  },
  pressed: { opacity: 0.6 },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: rs.size(20),
    paddingBottom: rs.size(24),
  },
  paneRoot: {
    flex: 1,
    paddingTop: rs.size(8),
  },
  centerPane: {
    alignItems: 'center',
    paddingTop: rs.size(32),
  },

  // Entry pane
  balanceBlock: {
    marginTop: rs.size(8),
    backgroundColor: '#111111',
    borderRadius: rs.size(16),
    padding: rs.size(20),
  },
  balanceLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#666666',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    marginTop: rs.size(6),
    fontFamily: Fonts.bold,
    fontSize: rs.font(28),
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  sectionEyebrow: {
    marginTop: rs.size(24),
    marginBottom: rs.size(8),
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: '#666666',
    letterSpacing: 1.4,
  },
  inputBlock: {
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
  chipPressed: { opacity: 0.85 },
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
  resultButtonStretch: {
    alignSelf: 'stretch',
  },
  submit: {
    backgroundColor: ACCENT,
    paddingVertical: rs.size(16),
    borderRadius: rs.size(9999),
    alignItems: 'center',
    // Stretch to fill parent — centered panes use alignItems:'center' which
    // would otherwise shrink the pill to its text width and make it look
    // like a tiny chip.
    alignSelf: 'stretch',
  },
  submitText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },
  ghostBtn: {
    marginTop: rs.size(12),
    paddingVertical: rs.size(14),
    borderRadius: rs.size(9999),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
    alignSelf: 'stretch',
  },
  ghostBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#DDDDDD',
  },
  legal: {
    marginTop: rs.size(12),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#555555',
    textAlign: 'center',
  },

  // Result panes
  iconCircle: {
    width: rs.size(72),
    height: rs.size(72),
    borderRadius: rs.size(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadge: {
    width: rs.size(96),
    height: rs.size(96),
    alignItems: 'center',
    justifyContent: 'center',
  },
  successGlow: {
    position: 'absolute',
    width: rs.size(96),
    height: rs.size(96),
    borderRadius: rs.size(48),
    opacity: 0.18,
  },
  successAmountRow: {
    marginTop: rs.size(16),
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  successNaira: {
    color: Colors.status.win,
    marginRight: rs.size(2),
    fontSize: rs.font(28),
    lineHeight: rs.font(34) * 1.1,
    includeFontPadding: false,
  },
  successAmount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(34),
    color: Colors.status.win,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  resultTitle: {
    marginTop: rs.size(20),
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resultSubtitle: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: rs.size(12),
    lineHeight: rs.font(19),
  },
  noticeBox: {
    marginTop: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    backgroundColor: '#1A1208',
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(12),
  },
  noticeText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: '#FFB266',
  },
  attemptsLine: {
    marginTop: rs.size(12),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#555555',
    textAlign: 'center',
  },
});
