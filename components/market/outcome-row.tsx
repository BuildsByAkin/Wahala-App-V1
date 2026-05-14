// components/market/outcome-row.tsx
// Compact row variant for n-ary markets (>2 outcomes). Same state matrix as
// ChoiceCard, just laid out horizontally so a long list of options remains
// scannable without per-row card real estate.
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsCompactNaira } from '@/lib/utils/money';
import type { DetailOutcome } from '@/hooks/useMarket';
import { DiagonalHairlines } from './diagonal-hairlines';
import type { ChoiceCardMode } from './choice-card';

type Props = {
  outcome: DetailOutcome;
  color: string;
  mode: ChoiceCardMode;
  poolExists: boolean;
  myStakeKobo: string | null;
  onPress: (outcome: DetailOutcome) => void;
};

function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export function OutcomeRow({
  outcome,
  color,
  mode,
  poolExists,
  myStakeKobo,
  onPress,
}: Props) {
  const press = useRef(new Animated.Value(1)).current;
  const isMine = !!myStakeKobo;
  const pressable = mode !== 'marketLocked';

  const handlePressIn = () => {
    if (!pressable) return;
    Animated.spring(press, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  const chrome =
    mode === 'won'
      ? { surface: Colors.surface.elevated, border: withAlpha(Colors.status.win, '66'), label: Colors.text.primary, dim: 1 }
      : mode === 'lost'
      ? { surface: Colors.surface.muted, border: Colors.border.hairline, label: Colors.text.tertiary, dim: 0.7 }
      : mode === 'marketLocked'
      ? { surface: Colors.surface.muted, border: Colors.border.hairline, label: Colors.text.secondary, dim: 1 }
      : mode === 'otherLocked'
      ? { surface: Colors.surface.muted, border: Colors.border.hairline, label: Colors.text.tertiary, dim: 0.55 }
      : isMine
      ? { surface: withAlpha(color, '14'), border: withAlpha(color, 'CC'), label: Colors.text.primary, dim: 1 }
      : { surface: Colors.surface.elevated, border: Colors.border.subtle, label: Colors.text.primary, dim: 1 };

  const renderChip = () => {
    if (mode === 'won') {
      return (
        <View style={[styles.chip, { backgroundColor: withAlpha(Colors.status.win, '26') }]}>
          <Text style={[styles.chipText, { color: Colors.status.win }]}>WON</Text>
        </View>
      );
    }
    if (mode === 'lost') return null;
    if (mode === 'marketLocked') return null;
    if (mode === 'otherLocked') {
      return (
        <View style={[styles.chip, { backgroundColor: Colors.surface.elevated }]}>
          <Feather name="lock" size={rs.font(11)} color={Colors.text.tertiary} />
        </View>
      );
    }
    if (isMine) {
      return (
        <View style={[styles.chip, { backgroundColor: withAlpha(color, '26') }]}>
          <Feather name="check" size={rs.font(11)} color={color} />
        </View>
      );
    }
    return (
      <View style={[styles.chip, { backgroundColor: Colors.brand }]}>
        <Text style={[styles.chipText, { color: Colors.text.onAction }]}>STAKE</Text>
      </View>
    );
  };

  return (
    <Pressable
      onPress={() => pressable && onPress(outcome)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!pressable}
      accessibilityRole="button"
      accessibilityState={{ disabled: !pressable, selected: isMine }}
      accessibilityLabel={
        mode === 'marketLocked'
          ? `${outcome.label} — market locked`
          : isMine
          ? `Add to your stake on ${outcome.label}`
          : `Stake on ${outcome.label}`
      }
    >
      <Animated.View
        style={[
          styles.row,
          {
            backgroundColor: chrome.surface,
            borderColor: chrome.border,
            opacity: chrome.dim,
            transform: [{ scale: press }],
          },
        ]}
      >
        {mode === 'marketLocked' ? (
          <DiagonalHairlines color={Colors.text.primary} opacity={0.05} step={9} borderRadius={rs.size(16)} />
        ) : null}
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.labelWrap}>
          <Text style={[styles.label, { color: chrome.label }]} numberOfLines={1}>
            {outcome.label}
          </Text>
          {isMine && myStakeKobo ? (
            <Text style={[styles.myStake, { color }]}>
              You&apos;re in · ₦{formatKoboAsCompactNaira(myStakeKobo)}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.percent, { color: chrome.label === Colors.text.primary ? Colors.text.secondary : chrome.label }]}>
          {poolExists ? `${outcome.sharePercent}%` : '—'}
        </Text>
        {renderChip()}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: rs.size(60),
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(12),
    borderRadius: rs.size(16),
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(12),
    overflow: 'hidden',
  },
  dot: {
    width: rs.size(8),
    height: rs.size(8),
    borderRadius: rs.size(4),
  },
  labelWrap: { flex: 1 },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
  },
  myStake: {
    marginTop: rs.size(2),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    letterSpacing: 0.2,
  },
  percent: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
  },
  chip: {
    minWidth: rs.size(28),
    height: rs.size(28),
    paddingHorizontal: rs.size(10),
    borderRadius: rs.size(999),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(4),
  },
  chipText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 1,
  },
});
