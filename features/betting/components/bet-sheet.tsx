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

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { outcomeColor } from '@/utils/market';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { useAppSelector } from '@/store';

import type { DetailOutcome, MarketDetail } from '@/hooks/useMarket';
import { usePlaceBet } from '@/features/betting/hooks/use-place-bet';
import type { DisplayMode } from '@/features/betting/api/betting-api';

type Props = {
  visible: boolean;
  market: MarketDetail | null;
  outcome: DetailOutcome | null;
  outcomeIndex: number;
  onClose: () => void;
};

// Quick-stake chips in naira. Filtered against the market's min/max at render.
const QUICK_NAIRA = [100, 500, 1000, 5000];

export function BetSheet({
  visible,
  market,
  outcome,
  outcomeIndex,
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

  const color = outcome ? outcomeColor(outcomeIndex) : '#FF6500';

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
  // so the multiplier (a JS number) keeps 4 decimals of precision.
  const estimatedPayoutKobo = useMemo(() => {
    if (!outcome || stakeKobo === null || stakeKobo <= 0n) return null;
    const micro = BigInt(Math.round(outcome.multiplier * 10_000));
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
                <Text style={styles.eyebrow}>STAKING ON</Text>
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
                    value={`${outcome.multiplier}x`}
                    valueColor={color}
                  />
                  <Sep />
                  <Stat label="STAKERS" value={String(outcome.bettorCount)} />
                </View>
              )}

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
                  selectionColor={color}
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
                <View style={styles.errorBox}>
                  <Feather
                    name="alert-circle"
                    size={rs.font(14)}
                    color="#FF5A5A"
                  />
                  <Text style={styles.errorText}>
                    {error?.message ?? validation.reason}
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
                    backgroundColor: color,
                    opacity:
                      !validation.ok || isPlacing ? 0.4 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={styles.submitText}>
                  {isPlacing ? 'Placing…' : 'Place stake'}
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
  multiplier: number;
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
        Live multiplier: {multiplier}x
      </Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Done"
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: color, opacity: pressed ? 0.85 : 1, marginTop: rs.size(20) },
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

  errorBox: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    backgroundColor: '#1A0A0A',
    borderRadius: rs.size(12),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(10),
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#FF8A8A',
  },

  submit: {
    marginTop: rs.size(20),
    height: rs.size(52),
    borderRadius: rs.size(26),
    alignItems: 'center',
    justifyContent: 'center',
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
