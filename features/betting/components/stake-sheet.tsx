import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
  color: string;
  sideTag: 'YES' | 'NO' | string;
  myStakeKoboOnOutcome?: string | null;
  originY?: number;
  onClose: () => void;
};

const QUICK_NAIRA = [100, 500, 1000, 5000];
const SCREEN_H = Dimensions.get('window').height;

function withAlpha(hex: string, alphaHex: string) {
  return `${hex}${alphaHex}`;
}

export function StakeSheet({
  visible,
  market,
  outcome,
  color,
  sideTag,
  myStakeKoboOnOutcome,
  originY,
  onClose,
}: Props) {
  const walletAvailableKobo = useAppSelector((s) => s.auth.walletAvailableKobo);
  const { placeBet, isPlacing, error, result, reset } = usePlaceBet({
    marketSlug: market?.slug,
  });

  const [stakeNairaText, setStakeNairaText] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('username');
  const [mounted, setMounted] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setStakeNairaText('');
      setDisplayMode('username');
      reset();
      progress.setValue(0);
      Animated.spring(progress, {
        toValue: 1,
        damping: 24,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, outcome?.id]);

  const originFromBottom = useMemo(() => {
    if (originY == null) return rs.size(120);
    return Math.max(rs.size(40), SCREEN_H - originY);
  }, [originY]);

  const minKobo = useMemo(() => safeBigInt(market?.minStakeKobo), [market]);
  const maxKobo = useMemo(() => safeBigInt(market?.maxStakeKobo), [market]);
  const walletKobo = useMemo(
    () => safeBigInt(walletAvailableKobo),
    [walletAvailableKobo]
  );
  const stakeKobo = useMemo(() => nairaTextToKobo(stakeNairaText), [stakeNairaText]);

  const validation = useMemo(() => {
    if (!market || !outcome) return { ok: false, reason: '' };
    if (stakeKobo === null || stakeKobo <= 0n) return { ok: false, reason: '' };
    if (minKobo !== null && stakeKobo < minKobo) {
      return { ok: false, reason: `Minimum stake is ₦${formatKoboAsNaira(minKobo.toString())}` };
    }
    if (maxKobo !== null && stakeKobo > maxKobo) {
      return { ok: false, reason: `Maximum stake is ₦${formatKoboAsNaira(maxKobo.toString())}` };
    }
    if (walletKobo !== null && stakeKobo > walletKobo) {
      return { ok: false, reason: 'Not enough money in your wallet' };
    }
    return { ok: true, reason: '' };
  }, [market, outcome, stakeKobo, minKobo, maxKobo, walletKobo]);

  const existingStakeKobo = useMemo(
    () => safeBigInt(myStakeKoboOnOutcome ?? null),
    [myStakeKoboOnOutcome]
  );
  const isAddingToStake = existingStakeKobo !== null && existingStakeKobo > 0n;

  const estimatedPayoutKobo = useMemo(() => {
    if (!outcome || stakeKobo === null || stakeKobo <= 0n) return null;
    const totalStake =
      existingStakeKobo !== null && existingStakeKobo > 0n
        ? stakeKobo + existingStakeKobo
        : stakeKobo;
    const m = outcome.multiplier;
    if (m === null || !Number.isFinite(m) || m <= 0) return totalStake;
    const micro = BigInt(Math.round(m * 10_000));
    if (micro <= 0n) return totalStake;
    return (totalStake * micro) / 10_000n;
  }, [outcome, stakeKobo, existingStakeKobo]);

  const estimatedPayoutNaira = useMemo(() => {
    if (!estimatedPayoutKobo) return 0;
    const naira = Number(estimatedPayoutKobo / 100n);
    return Number.isFinite(naira) ? naira : 0;
  }, [estimatedPayoutKobo]);

  const showSuccess = !!result && !error;

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

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });
  const sheetTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [originFromBottom, 0],
  });
  const sheetScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const sheetOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.7, 1],
  });

  if (!mounted && !visible) return null;

  return (
    <Modal
      visible={mounted}
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
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: Colors.surface.elevated,
                borderColor: withAlpha(color, '33'),
                opacity: sheetOpacity,
                transform: [{ translateY: sheetTranslate }, { scale: sheetScale }],
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[styles.tintGlow, { backgroundColor: color }]}
            />
            <View style={styles.handle} />

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close stake sheet"
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <Feather name="x" size={rs.font(18)} color={Colors.text.secondary} />
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
                  <View style={[styles.sideTag, { backgroundColor: withAlpha(color, '26') }]}>
                    <Text style={[styles.sideTagText, { color }]}>{sideTag}</Text>
                  </View>
                  <Text style={styles.eyebrow}>
                    {isAddingToStake ? 'ADDING TO' : 'STAKING ON'}
                  </Text>
                </View>
                <Text style={styles.outcomeLabel} numberOfLines={2}>
                  {outcome?.label ?? ''}
                </Text>

                {outcome ? (
                  <View
                    style={[
                      styles.statsRow,
                      { backgroundColor: withAlpha(color, '12'), borderColor: withAlpha(color, '22') },
                    ]}
                  >
                    <Stat label="SHARE" value={`${outcome.sharePercent}%`} />
                    <Sep />
                    <Stat
                      label="PAYOUT"
                      value={outcome.multiplier !== null ? `${outcome.multiplier}x` : '—'}
                      valueColor={color}
                    />
                    <Sep />
                    <Stat label="STAKERS" value={String(outcome.bettorCount)} />
                  </View>
                ) : null}

                {isAddingToStake && existingStakeKobo !== null ? (
                  <View
                    style={[
                      styles.existingBanner,
                      { backgroundColor: withAlpha(color, '14'), borderColor: withAlpha(color, '40') },
                    ]}
                  >
                    <View style={[styles.existingBadge, { backgroundColor: withAlpha(color, '26') }]}>
                      <Feather name="check" size={rs.font(12)} color={color} />
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

                <View style={[styles.inputBlock, { borderColor: withAlpha(color, '22') }]}>
                  <Text style={styles.naira}>₦</Text>
                  <TextInput
                    value={stakeNairaText}
                    onChangeText={(t) => setStakeNairaText(sanitizeNairaInput(t))}
                    placeholder="0"
                    placeholderTextColor={Colors.text.disabled}
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
                      onPress={() => {
                        Haptics.selectionAsync();
                        setStakeNairaText(String(n));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Quick stake ${n} naira`}
                      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                    >
                      <Text style={styles.chipText}>₦{n.toLocaleString()}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.payoutRow}>
                  <View>
                    <Text style={styles.payoutLabel}>
                      {isAddingToStake ? 'If you win (total)' : 'If you win'}
                    </Text>
                    <View style={styles.payoutValueWrap}>
                      <Text style={[styles.payoutValue, { color }]}>
                        ₦{Math.round(estimatedPayoutNaira).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDisplayMode((m) => (m === 'username' ? 'anonymous' : 'username'));
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
                      color={displayMode === 'anonymous' ? Colors.brand : Colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.anonToggleText,
                        displayMode === 'anonymous' && { color: Colors.brand },
                      ]}
                    >
                      {displayMode === 'anonymous' ? 'Anonymous' : 'Public'}
                    </Text>
                  </Pressable>
                </View>

                {(error || validation.reason) && (
                  <View style={styles.noticeBox}>
                    <Feather name="info" size={rs.font(14)} color="#FFB066" />
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
                      opacity: !validation.ok || isPlacing ? 0.4 : pressed ? 0.9 : 1,
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

function Stat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
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
      <View style={[styles.successIcon, { backgroundColor: withAlpha(color, '26') }]}>
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
  return raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
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
    backgroundColor: '#000',
  },
  sheet: {
    borderTopLeftRadius: rs.size(28),
    borderTopRightRadius: rs.size(28),
    borderTopWidth: 1,
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(10),
    paddingBottom: rs.size(28),
    overflow: 'hidden',
  },
  tintGlow: {
    position: 'absolute',
    top: -rs.size(80),
    left: -rs.size(40),
    right: -rs.size(40),
    height: rs.size(160),
    opacity: 0.08,
    borderBottomLeftRadius: rs.size(120),
    borderBottomRightRadius: rs.size(120),
  },
  handle: {
    alignSelf: 'center',
    width: rs.size(40),
    height: rs.size(5),
    borderRadius: rs.size(3),
    backgroundColor: Colors.border.strong,
    marginBottom: rs.size(20),
  },
  closeBtn: {
    position: 'absolute',
    top: rs.size(14),
    right: rs.size(14),
    width: rs.size(32),
    height: rs.size(32),
    borderRadius: rs.size(16),
    backgroundColor: Colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
  },
  sideTag: {
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(4),
    borderRadius: rs.size(999),
  },
  sideTagText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 1.4,
  },
  eyebrow: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    letterSpacing: 1.4,
  },
  outcomeLabel: {
    marginTop: rs.size(10),
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    color: Colors.text.primary,
    lineHeight: rs.font(28),
  },
  statsRow: {
    marginTop: rs.size(18),
    borderRadius: rs.size(14),
    paddingVertical: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(17),
    color: Colors.text.primary,
  },
  statLabel: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    letterSpacing: 0.8,
  },
  statSep: { width: 1, height: rs.size(26), backgroundColor: Colors.border.subtle },
  walletRow: {
    marginTop: rs.size(18),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
    letterSpacing: 0.4,
  },
  walletValue: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: Colors.text.secondary,
  },
  inputBlock: {
    marginTop: rs.size(10),
    backgroundColor: Colors.surface.muted,
    borderRadius: rs.size(16),
    paddingHorizontal: rs.size(18),
    paddingVertical: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  naira: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(26),
    color: Colors.text.tertiary,
    marginRight: rs.size(8),
  },
  input: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: rs.font(30),
    color: Colors.text.primary,
    padding: 0,
  },
  chipsRow: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    gap: rs.size(8),
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.surface.muted,
    borderRadius: rs.size(999),
    paddingVertical: rs.size(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  chipPressed: { backgroundColor: Colors.border.subtle },
  chipText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
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
    color: Colors.text.tertiary,
    letterSpacing: 0.6,
  },
  payoutValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: rs.size(2),
  },
  payoutValue: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
  },
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    backgroundColor: Colors.surface.muted,
    borderRadius: rs.size(999),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(8),
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  anonToggleOn: {
    backgroundColor: '#1F140A',
    borderColor: '#3A2410',
  },
  anonToggleText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
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
    color: Colors.text.primary,
    letterSpacing: 0.4,
  },
  existingValue: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
  },
  existingValueStrong: { fontFamily: Fonts.bold },
  submit: {
    marginTop: rs.size(20),
    height: rs.size(52),
    borderRadius: rs.size(26),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  successDoneBtn: {
    alignSelf: 'stretch',
    marginTop: rs.size(24),
    paddingHorizontal: rs.size(32),
  },
  submitText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.onAction,
    letterSpacing: 0.3,
  },
  successWrap: { alignItems: 'center', paddingVertical: rs.size(8) },
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
    color: Colors.text.primary,
  },
  successBody: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: rs.size(20),
  },
  successOutcome: { fontFamily: Fonts.semibold },
  successMultiplier: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
});
