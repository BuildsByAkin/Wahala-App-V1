// features/betting/components/bet-sheet.tsx
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
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { outcomeColor } from '@/utils/market';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { useAppSelector } from '@/store';

import type { DetailOutcome, MarketDetail } from '@/hooks/useMarket';
import {
  usePlaceBet,
  type PlaceBetErrorCode,
} from '@/features/betting/hooks/use-place-bet';
import type { DisplayMode } from '@/features/betting/api/betting-api';

type Props = {
  visible: boolean;
  market: MarketDetail | null;
  outcome: DetailOutcome | null;
  outcomeIndex: number;
  // Side identity color for this outcome on this market. The caller resolves
  // it (binary scheme vs n-ary palette) so the sheet matches the card the
  // user just tapped. Falls back to OUTCOME_PALETTE if omitted.
  outcomeColor?: string;
  // Total amount the user has already staked on THIS outcome (kobo string),
  // null/undefined if they haven't bet on it yet. When > 0 we render an
  // "Adding to your stake" banner and switch the CTA copy to "Add to stake".
  myStakeKoboOnOutcome?: string | null;
  onClose: () => void;
};

// Quick-stake chips in naira. Filtered against the market's min/max at render.
const QUICK_NAIRA = [100, 500, 1000, 5000];

export function BetSheet({
  visible,
  market,
  outcome,
  outcomeIndex,
  outcomeColor: outcomeColorProp,
  myStakeKoboOnOutcome,
  onClose,
}: Props) {
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const walletAvailableKobo = useAppSelector(
    (s) => s.auth.walletAvailableKobo
  );

  const { placeBet, isPlacing, error, result, reset } = usePlaceBet({
    marketSlug: market?.slug,
  });

  const [stakeNairaText, setStakeNairaText] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('username');

  // Reset local state every time the sheet (re)opens for a fresh outcome.
  useEffect(() => {
    if (visible) {
      setStakeNairaText('');
      setDisplayMode('username');
      reset();
    }
    // We intentionally exclude `reset` so reopening doesn't loop on identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, outcome?.id]);

  // Slide-up + backdrop fade.
  useEffect(() => {
    if (visible) {
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
  }, [visible, translateY, backdropOpacity]);

  // Side identity color (cobalt, rose, etc.) — chrome only.
  // Brand orange (Colors.brand) is reserved for ACTIONS (CTA, caret, focus).
  const color = outcomeColorProp ?? (outcome ? outcomeColor(outcomeIndex) : Colors.brand);

  const minKobo = useMemo(() => safeBigInt(market?.minStakeKobo), [market]);
  const maxKobo = useMemo(() => safeBigInt(market?.maxStakeKobo), [market]);
  const walletKobo = useMemo(
    () => safeBigInt(walletAvailableKobo),
    [walletAvailableKobo]
  );

  const stakeKobo = useMemo(() => nairaTextToKobo(stakeNairaText), [
    stakeNairaText,
  ]);

  const validation = useMemo(() => {
    if (!market || !outcome) return { ok: false, reason: '' as string };
    if (stakeKobo === null) {
      return { ok: false, reason: '' };
    }
    if (stakeKobo <= 0n) {
      return { ok: false, reason: '' };
    }
    if (minKobo !== null && stakeKobo < minKobo) {
      return {
        ok: false,
        reason: `Minimum stake is ₦${formatKoboAsNaira(minKobo.toString())}`,
      };
    }
    if (maxKobo !== null && stakeKobo > maxKobo) {
      return {
        ok: false,
        reason: `Maximum stake is ₦${formatKoboAsNaira(maxKobo.toString())}`,
      };
    }
    if (walletKobo !== null && stakeKobo > walletKobo) {
      return { ok: false, reason: 'Not enough money in your wallet' };
    }
    return { ok: true, reason: '' };
  }, [market, outcome, stakeKobo, minKobo, maxKobo, walletKobo]);

  // Estimated payout = stake * live multiplier. For preview only — server is
  // authoritative once the market resolves. We do bigint math via micro-units
  // so the multiplier (a JS number) keeps 4 decimals of precision. The API
  // returns `multiplier: null` for a zero-pool outcome — in that case we just
  // echo the stake as the floor estimate.
  const estimatedPayoutKobo = useMemo(() => {
    if (!outcome || stakeKobo === null || stakeKobo <= 0n) return null;
    const m = outcome.multiplier;
    if (m === null || !Number.isFinite(m) || m <= 0) return stakeKobo;
    const micro = BigInt(Math.round(m * 10_000));
    if (micro <= 0n) return stakeKobo;
    return (stakeKobo * micro) / 10_000n;
  }, [outcome, stakeKobo]);

  const submit = async () => {
    if (!market || !outcome || !validation.ok || stakeKobo === null) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await placeBet({
        marketId: market.id,
        outcomeId: outcome.id,
        stakeKobo: stakeKobo.toString(),
        displayMode,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleQuickPick = (naira: number) => {
    Haptics.selectionAsync();
    setStakeNairaText(String(naira));
  };

  const showSuccess = !!result && !error;

  const existingStakeKobo = useMemo(
    () => safeBigInt(myStakeKoboOnOutcome ?? null),
    [myStakeKoboOnOutcome]
  );
  const isAddingToStake =
    existingStakeKobo !== null && existingStakeKobo > 0n;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
          pointerEvents="box-none"
        >
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          {/* Always-visible close button — backdrop tap also closes, but a
              keyboard or focused input can occlude it on small devices, so we
              also surface an explicit affordance in the top-right. */}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="x" size={rs.font(18)} color="#888888" />
          </Pressable>

          {showSuccess ? (
            <SuccessView
              color={color}
              outcomeLabel={outcome?.label ?? ''}
              stakeKobo={stakeKobo?.toString() ?? '0'}
              multiplier={result.outcome.multiplier}
              alreadyPlaced={result.alreadyPlaced}
              onClose={onClose}
            />
          ) : (
            <>
              <View style={styles.headerRow}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.eyebrow}>
                  {isAddingToStake ? 'ADDING TO' : 'STAKING ON'}
                </Text>
              </View>
              <Text style={styles.outcomeLabel} numberOfLines={2}>
                {outcome?.label ?? ''}
              </Text>

              {outcome && (
                <View style={styles.statsRow}>
                  <Stat label="SHARE" value={`${outcome.sharePercent}%`} />
                  <Sep />
                  <Stat
                    label="PAYOUT"
                    value={
                      outcome.multiplier !== null
                        ? `${outcome.multiplier}x`
                        : '—'
                    }
                    valueColor={color}
                  />
                  <Sep />
                  <Stat label="STAKERS" value={String(outcome.bettorCount)} />
                </View>
              )}

              {isAddingToStake && existingStakeKobo !== null ? (
                <View
                  style={[
                    styles.existingBanner,
                    {
                      backgroundColor: `${color}14`,
                      borderColor: `${color}40`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.existingBadge,
                      { backgroundColor: `${color}26` },
                    ]}
                  >
                    <Feather
                      name="check"
                      size={rs.font(12)}
                      color={color}
                    />
                  </View>
                  <View style={styles.existingTextWrap}>
                    <Text style={styles.existingLabel}>You&apos;re already in</Text>
                    <Text style={styles.existingValue}>
                      Current stake ·{' '}
                      <Text style={[styles.existingValueStrong, { color }]}>
                        ₦{formatKoboAsNaira(existingStakeKobo.toString())}
                      </Text>
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.walletRow}>
                <Text style={styles.walletLabel}>Available</Text>
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
                  accessibilityLabel="Stake amount in naira"
                  selectionColor={Colors.brand}
                />
              </View>

              <View style={styles.chipsRow}>
                {QUICK_NAIRA.filter((n) => {
                  const k = BigInt(n) * 100n;
                  if (minKobo !== null && k < minKobo) return false;
                  if (maxKobo !== null && k > maxKobo) return false;
                  return true;
                }).map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => handleQuickPick(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`Quick stake ${n} naira`}
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

              <View style={styles.payoutRow}>
                <View>
                  <Text style={styles.payoutLabel}>If you win</Text>
                  <Text style={[styles.payoutValue, { color }]}>
                    ₦
                    {estimatedPayoutKobo
                      ? formatKoboAsNaira(estimatedPayoutKobo.toString())
                      : '0'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDisplayMode((m) =>
                      m === 'username' ? 'anonymous' : 'username'
                    );
                  }}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: displayMode === 'anonymous' }}
                  accessibilityLabel="Toggle anonymous display"
                  style={({ pressed }) => [
                    styles.anonToggle,
                    displayMode === 'anonymous' && styles.anonToggleOn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather
                    name={displayMode === 'anonymous' ? 'eye-off' : 'eye'}
                    size={rs.font(13)}
                    color={displayMode === 'anonymous' ? '#FF6500' : '#666666'}
                  />
                  <Text
                    style={[
                      styles.anonToggleText,
                      displayMode === 'anonymous' && {
                        color: '#FF6500',
                      },
                    ]}
                  >
                    {displayMode === 'anonymous' ? 'Anonymous' : 'Public'}
                  </Text>
                </Pressable>
              </View>

              {(error || validation.reason) && (
                <View style={styles.noticeBox}>
                  <Feather
                    name="info"
                    size={rs.font(14)}
                    color="#FFB066"
                  />
                  <Text style={styles.noticeText}>
                    {error
                      ? friendlyErrorMessage(error.code, error.message)
                      : validation.reason}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={submit}
                disabled={!validation.ok || isPlacing}
                accessibilityRole="button"
                accessibilityLabel="Confirm stake"
                style={({ pressed }) => [
                  styles.submit,
                  {
                    backgroundColor: Colors.brand,
                    opacity:
                      !validation.ok || isPlacing ? 0.4 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={styles.submitText}>
                  {isPlacing
                    ? 'Placing…'
                    : isAddingToStake
                    ? 'Add to stake'
                    : 'Place stake'}
                </Text>
              </Pressable>
            </>
          )}
        </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Stat({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Sep() {
  return <View style={styles.statSep} />;
}

function SuccessView({
  color,
  outcomeLabel,
  stakeKobo,
  multiplier,
  alreadyPlaced,
  onClose,
}: {
  color: string;
  outcomeLabel: string;
  stakeKobo: string;
  multiplier: number | null;
  alreadyPlaced: boolean;
  onClose: () => void;
}) {
  return (
    <View style={styles.successWrap}>
      <View style={[styles.successIcon, { backgroundColor: `${color}26` }]}>
        <Feather name="check" size={rs.font(28)} color={color} />
      </View>
      <Text style={styles.successTitle}>
        {alreadyPlaced ? 'Already locked in' : 'Stake locked in'}
      </Text>
      <Text style={styles.successBody}>
        ₦{formatKoboAsNaira(stakeKobo)} on{' '}
        <Text style={[styles.successOutcome, { color }]}>{outcomeLabel}</Text>
      </Text>
      <Text style={styles.successMultiplier}>
        {multiplier !== null
          ? `Live multiplier: ${multiplier}x`
          : 'Live multiplier: — (waiting for liquidity)'}
      </Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Done"
        style={({ pressed }) => [
          styles.submit,
          styles.successDoneBtn,
          { backgroundColor: color, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.submitText}>Done</Text>
      </Pressable>
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function safeBigInt(v: string | null | undefined): bigint | null {
  if (!v) return null;
  try {
    return BigInt(v);
  } catch {
    return null;
  }
}

function friendlyErrorMessage(code: PlaceBetErrorCode, fallback: string): string {
  switch (code) {
    case 'already_bet_on_different_outcome':
      return "You're already in on another side here — you can only add to that bet.";
    case 'insufficient_funds':
      return 'Not enough money in your wallet. Top up to keep going.';
    case 'market_closed':
      return 'This market just closed — no more bets.';
    case 'stake_too_low':
      return 'That stake is below the minimum for this market.';
    case 'stake_too_high':
      return 'That stake is above the maximum for this market.';
    case 'unauthorized':
      return 'Please sign in again to place this bet.';
    default:
      return fallback;
  }
}

function sanitizeNairaInput(raw: string): string {
  // Digits only, strip leading zeros so "0500" → "500".
  const digits = raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
  return digits;
}

function nairaTextToKobo(text: string): bigint | null {
  if (!text) return null;
  try {
    return BigInt(text) * 100n;
  } catch {
    return null;
  }
}

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
  closeBtn: {
    position: 'absolute',
    top: rs.size(14),
    right: rs.size(14),
    width: rs.size(32),
    height: rs.size(32),
    borderRadius: rs.size(16),
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
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
  outcomeLabel: {
    marginTop: rs.size(8),
    fontFamily: Fonts.bold,
    fontSize: rs.font(24),
    color: '#FFFFFF',
    lineHeight: rs.font(30),
  },

  statsRow: {
    marginTop: rs.size(20),
    backgroundColor: '#181818',
    borderRadius: rs.size(14),
    paddingVertical: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: '#FFFFFF',
  },
  statLabel: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: '#555555',
    letterSpacing: 0.8,
  },
  statSep: {
    width: 1,
    height: rs.size(28),
    backgroundColor: '#222222',
  },

  walletRow: {
    marginTop: rs.size(18),
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
    color: '#BBBBBB',
  },

  inputBlock: {
    marginTop: rs.size(10),
    backgroundColor: '#0E0E0E',
    borderRadius: rs.size(16),
    paddingHorizontal: rs.size(18),
    paddingVertical: rs.size(18),
    flexDirection: 'row',
    alignItems: 'center',
  },
  naira: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(28),
    color: '#444444',
    marginRight: rs.size(8),
  },
  input: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: rs.font(32),
    color: '#FFFFFF',
    padding: 0,
  },

  chipsRow: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    gap: rs.size(8),
  },
  chip: {
    flex: 1,
    backgroundColor: '#181818',
    borderRadius: rs.size(999),
    paddingVertical: rs.size(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  chipPressed: { backgroundColor: '#1F1F1F' },
  chipText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: '#BBBBBB',
  },

  payoutRow: {
    marginTop: rs.size(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payoutLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#555555',
    letterSpacing: 0.6,
  },
  payoutValue: {
    marginTop: rs.size(2),
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
  },
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    backgroundColor: '#181818',
    borderRadius: rs.size(999),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(8),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  anonToggleOn: {
    backgroundColor: '#1F140A',
    borderColor: '#3A2410',
  },
  anonToggleText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: '#888888',
  },

  noticeBox: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    backgroundColor: '#1A1208',
    borderWidth: 1,
    borderColor: '#2A1F10',
    borderRadius: rs.size(12),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(10),
  },
  noticeText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    lineHeight: rs.font(17),
    color: '#E0B58A',
  },

  existingBanner: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
    borderRadius: rs.size(14),
    borderWidth: 1,
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(10),
  },
  existingBadge: {
    width: rs.size(24),
    height: rs.size(24),
    borderRadius: rs.size(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingTextWrap: { flex: 1 },
  existingLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  existingValue: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#999999',
  },
  existingValueStrong: {
    fontFamily: Fonts.bold,
  },

  submit: {
    marginTop: rs.size(20),
    height: rs.size(52),
    borderRadius: rs.size(26),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // Inside the centered SuccessView the submit button would otherwise shrink
  // to fit its text (because the parent has `alignItems: 'center'`). Force it
  // to span the sheet width so the pill matches the primary CTA elsewhere.
  successDoneBtn: {
    alignSelf: 'stretch',
    marginTop: rs.size(24),
    paddingHorizontal: rs.size(32),
  },
  submitText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },

  // Success state
  successWrap: {
    alignItems: 'center',
    paddingVertical: rs.size(8),
  },
  successIcon: {
    width: rs.size(64),
    height: rs.size(64),
    borderRadius: rs.size(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    marginTop: rs.size(16),
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: '#FFFFFF',
  },
  successBody: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#BBBBBB',
    textAlign: 'center',
    paddingHorizontal: rs.size(20),
  },
  successOutcome: {
    fontFamily: Fonts.semibold,
  },
  successMultiplier: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#666666',
  },
});
