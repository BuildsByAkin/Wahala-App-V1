// features/withdrawals/components/withdrawal-sheet.tsx
//
// Multi-step bottom sheet for the withdrawal flow. One Modal, six panes:
//   amount → account → bvn (conditional) → pin → processing → result
//
// Step shape is computed by `buildSteps()` from the live amount and the
// cached BVN flag — `bvn` is inserted only when the amount crosses the
// ₦10,000 threshold AND the user is not yet verified. PIN and BVN digits
// live in component state ONLY and are wiped immediately after their
// respective API calls.
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
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { authKeys } from '@/features/auth';
import { useAuth } from '@/features/auth';
import { withdrawalKeys } from '@/lib/api/query-keys';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  BVN_REQUIRED_THRESHOLD_KOBO,
  WITHDRAWAL_MAX_KOBO,
  WITHDRAWAL_MIN_KOBO,
  nairaTextToKobo,
} from '@/features/withdrawals/api/withdrawals-api';
import { useBvnStatus } from '@/features/withdrawals/hooks/use-bvn';
import {
  extractWithdrawalError,
  useInitiateWithdrawal,
  useWithdrawalStatus,
} from '@/features/withdrawals/hooks/use-withdrawals';
import { setSelectedBankAccountId } from '@/features/withdrawals/store/withdrawal-slice';
import { sheetStyles } from './sheet-styles';
import { AmountPane } from './panes/amount-pane';
import { AccountPane } from './panes/account-pane';
import { BvnPane } from './panes/bvn-pane';
import { PinPane } from './panes/pin-pane';
import { ProcessingPane } from './panes/processing-pane';
import { ResultPane } from './panes/result-pane';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export type Step =
  | 'amount'
  | 'account'
  | 'bvn'
  | 'pin'
  | 'processing'
  | 'result';

function buildSteps(amountKobo: bigint | null, bvnVerified: boolean): Step[] {
  const needsBvn =
    amountKobo !== null &&
    amountKobo > BVN_REQUIRED_THRESHOLD_KOBO &&
    !bvnVerified;
  return needsBvn
    ? ['amount', 'account', 'bvn', 'pin', 'processing', 'result']
    : ['amount', 'account', 'pin', 'processing', 'result'];
}

export function WithdrawalSheet({ visible, onClose }: Props) {
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { walletAvailableKobo } = useAuth();
  const bvnVerifiedRedux = useAppSelector((s) => s.withdrawal.bvnVerified);
  const selectedBankAccountId = useAppSelector(
    (s) => s.withdrawal.selectedBankAccountId
  );

  // Network — BVN status is fetched here so the flow shape is correct from
  // the very first render. The hook mirrors `verified` into Redux.
  useBvnStatus({ enabled: visible });

  const initiateMutation = useInitiateWithdrawal();

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('amount');
  const [amountText, setAmountText] = useState('');
  const [paymentTransactionId, setPaymentTransactionId] = useState<
    string | undefined
  >();
  // Result-pane data captured from the initiate response, plus any timeout flag.
  const [estFeeKobo, setEstFeeKobo] = useState<string | null>(null);
  const [resultOverride, setResultOverride] = useState<
    'pending-timeout' | null
  >(null);

  const amountKobo = useMemo(() => nairaTextToKobo(amountText), [amountText]);
  const steps = useMemo(
    () => buildSteps(amountKobo, bvnVerifiedRedux),
    [amountKobo, bvnVerifiedRedux]
  );

  // ── Polling ─────────────────────────────────────────────────────────────
  const statusQuery = useWithdrawalStatus({
    paymentTransactionId,
    enabled: step === 'processing',
    onTimeout: () => {
      setResultOverride('pending-timeout');
      setStep('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
  });

  // Auto-advance from processing → result when a terminal state arrives.
  useEffect(() => {
    if (step !== 'processing') return;
    const s = statusQuery.data?.status;
    if (s === 'success' || s === 'failed' || s === 'abandoned') {
      Haptics.notificationAsync(
        s === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      setStep('result');
    }
  }, [step, statusQuery.data?.status]);

  // ── Lifecycle ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      // Fresh sheet — wipe everything.
      setStep('amount');
      setAmountText('');
      setPaymentTransactionId(undefined);
      setEstFeeKobo(null);
      setResultOverride(null);
      initiateMutation.reset();
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

  // ── Validation ──────────────────────────────────────────────────────────
  const amountValidation = useMemo(() => {
    if (amountKobo === null || amountKobo <= 0n) return { ok: false, reason: '' };
    if (amountKobo < WITHDRAWAL_MIN_KOBO) {
      return { ok: false, reason: 'Minimum withdrawal is ₦100' };
    }
    if (amountKobo > WITHDRAWAL_MAX_KOBO) {
      return { ok: false, reason: 'Maximum withdrawal is ₦500,000' };
    }
    if (
      walletAvailableKobo &&
      (() => {
        try {
          return amountKobo > BigInt(walletAvailableKobo);
        } catch {
          return false;
        }
      })()
    ) {
      return { ok: false, reason: 'Amount exceeds available balance' };
    }
    return { ok: true, reason: '' };
  }, [amountKobo, walletAvailableKobo]);

  // ── Step transitions ────────────────────────────────────────────────────
  const goNextFrom = (current: Step) => {
    const idx = steps.indexOf(current);
    const next = steps[idx + 1];
    if (next) setStep(next);
  };

  const handleAmountContinue = () => {
    if (!amountValidation.ok) return;
    Haptics.selectionAsync();
    goNextFrom('amount');
  };

  const handleAccountSelected = (id: string) => {
    Haptics.selectionAsync();
    dispatch(setSelectedBankAccountId(id));
    goNextFrom('account');
  };

  const handleBvnVerified = () => {
    // bvnVerified flag is mirrored into Redux by useVerifyBvn; advance.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goNextFrom('bvn');
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedBankAccountId || amountKobo === null) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await initiateMutation.mutateAsync({
        bankAccountId: selectedBankAccountId,
        amountKobo: amountKobo.toString(),
        pin,
      });
      // SECURITY: pin is wiped at the call site (PinPane) immediately after
      // this resolves, regardless of outcome. Do not retain it here.
      setEstFeeKobo(result.estimatedFeeKobo);
      if (result.status === 'failed') {
        setPaymentTransactionId(result.paymentTransactionId);
        // Pre-seed the status query so the result pane can read failureReason.
        queryClient.setQueryData(
          withdrawalKeys.status(result.paymentTransactionId),
          {
            id: result.paymentTransactionId,
            reference: '',
            status: 'failed' as const,
            amountKobo: amountKobo.toString(),
            feeKobo: result.estimatedFeeKobo,
            netAmountKobo: result.estimatedNetKobo,
            failureReason: result.failureReason ?? null,
            bankAccountId: selectedBankAccountId,
            createdAt: new Date().toISOString(),
            completedAt: null,
            __attempts: 0,
          }
        );
        setStep('result');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setPaymentTransactionId(result.paymentTransactionId);
        setStep('processing');
      }
    } catch {
      // Mutation error surfaces in PinPane via initiateMutation.error.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleResultDismiss = () => {
    // Refresh wallet + history then dismiss the entire sheet.
    queryClient.invalidateQueries({ queryKey: authKeys.me() });
    queryClient.invalidateQueries({ queryKey: withdrawalKeys.list() });
    onClose();
  };

  // Disable the swipe-down dismiss while polling — instructions on the spec.
  const lockClose = step === 'processing';
  const handleClose = () => {
    if (lockClose) return;
    onClose();
  };

  // ── Step indicator (visual only — hidden on processing/result) ──────────
  const visibleSteps = steps.filter(
    (s): s is Exclude<Step, 'processing' | 'result'> =>
      s !== 'processing' && s !== 'result'
  );
  const currentVisibleIdx =
    step === 'processing' || step === 'result'
      ? -1
      : visibleSteps.indexOf(step);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={sheetStyles.root}>
        <Animated.View
          style={[sheetStyles.backdrop, { opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            disabled={lockClose}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={sheetStyles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[sheetStyles.sheet, { transform: [{ translateY }] }]}
          >
            <View style={sheetStyles.handle} />

            {currentVisibleIdx >= 0 && (
              <View style={sheetStyles.stepRow}>
                {visibleSteps.map((s, i) => (
                  <View
                    key={s}
                    style={[
                      sheetStyles.stepDot,
                      i <= currentVisibleIdx && sheetStyles.stepDotActive,
                    ]}
                  />
                ))}
              </View>
            )}

            {step === 'amount' && (
              <AmountPane
                value={amountText}
                onChangeValue={setAmountText}
                walletAvailableKobo={walletAvailableKobo}
                validation={amountValidation}
                onContinue={handleAmountContinue}
              />
            )}

            {step === 'account' && (
              <AccountPane
                selectedId={selectedBankAccountId}
                onSelect={handleAccountSelected}
                onCancel={() => setStep('amount')}
              />
            )}

            {step === 'bvn' && (
              <BvnPane
                onVerified={handleBvnVerified}
                onBack={() => setStep('account')}
              />
            )}

            {step === 'pin' && (
              <PinPane
                amountKobo={amountKobo!.toString()}
                bankAccountId={selectedBankAccountId!}
                isSubmitting={initiateMutation.isPending}
                error={
                  initiateMutation.error
                    ? extractWithdrawalError(initiateMutation.error)
                    : null
                }
                onSubmit={handlePinSubmit}
                onBack={() => setStep('account')}
              />
            )}

            {step === 'processing' && (
              <ProcessingPane
                amountKobo={amountKobo?.toString() ?? '0'}
                statusError={
                  statusQuery.isError
                    ? "Couldn't reach the server. Retrying…"
                    : null
                }
              />
            )}

            {step === 'result' && (
              <ResultPane
                status={
                  resultOverride === 'pending-timeout'
                    ? 'pending'
                    : (statusQuery.data?.status ?? 'pending')
                }
                amountKobo={
                  statusQuery.data?.amountKobo ??
                  amountKobo?.toString() ??
                  '0'
                }
                feeKobo={statusQuery.data?.feeKobo ?? estFeeKobo ?? '0'}
                failureReason={statusQuery.data?.failureReason ?? null}
                onDismiss={handleResultDismiss}
                onRetry={() => {
                  setResultOverride(null);
                  setStep('amount');
                  setPaymentTransactionId(undefined);
                  initiateMutation.reset();
                }}
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Re-export Colors to silence unused-import warnings if you wire deeper hooks.
void Colors;
void Fonts;
void rs;
