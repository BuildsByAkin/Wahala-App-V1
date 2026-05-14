// components/market/choice-card.tsx
// Side-by-side choice cards for binary markets. The state matrix here is the
// fix for the bug surfaced by the redesign brief — selected, locked-other,
// market-locked, resolved-winner, and resolved-loser must all read distinctly.
//
//   default       → elevated surface, subtle border, no chip
//   isMine        → side-color tint + side-color border + "You're in" badge
//   otherLocked   → muted surface, hairline border, greyscale lock chip,
//                   reduced opacity (still tappable to surface the notice sheet)
//   marketLocked  → muted surface + diagonal hairlines watermark, frozen
//                   percent visible, no chip, not pressable
//   wonResolved   → elevated surface, status.win border, "WON" pill
//   lostResolved  → muted surface, hairline border, "LOST" pill, dimmed
//
// Brand orange ONLY appears as the inline "STAKE" pill on an open card the
// user has not yet staked on. Side identity color owns the chrome; brand
// owns the action.
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsCompactNaira } from '@/lib/utils/money';
import type { DetailOutcome } from '@/hooks/useMarket';
import { DiagonalHairlines } from './diagonal-hairlines';

export type ChoiceCardMode =
  | 'open'         // market is open, free to stake
  | 'otherLocked'  // user already staked on the OTHER side
  | 'marketLocked' // market lifecycle is locked
  | 'won'          // resolved, this side won
  | 'lost';        // resolved, this side lost

type Props = {
  outcome: DetailOutcome;
  color: string;
  mode: ChoiceCardMode;
  poolExists: boolean;
  // User's stake on THIS outcome (kobo string), null if none.
  myStakeKobo: string | null;
  onPress: (outcome: DetailOutcome) => void;
};

function withAlpha(hex: string, alphaHex: string): string {
  // Lightweight RGBA helper — keeps a single hex source of truth and lets us
  // tint chrome via tokens like `${color}14` without computing rgba in JS.
  return `${hex}${alphaHex}`;
}

export function ChoiceCard({
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
    Animated.spring(press, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(press, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  // Chrome cascades by mode. Comments above describe the intent of each branch.
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
    if (mode === 'lost') {
      return (
        <View style={[styles.chip, { backgroundColor: Colors.surface.elevated }]}>
          <Text style={[styles.chipText, { color: Colors.status.loss }]}>LOST</Text>
        </View>
      );
    }
    if (mode === 'marketLocked') return null;
    if (mode === 'otherLocked') {
      return (
        <View style={[styles.chip, styles.lockedChip]}>
          <Feather name="lock" size={rs.font(11)} color={Colors.text.tertiary} />
          <Text style={[styles.chipText, { color: Colors.text.tertiary }]}>LOCKED</Text>
        </View>
      );
    }
    if (isMine) {
      return (
        <View style={[styles.chip, { backgroundColor: withAlpha(color, '26') }]}>
          <Feather name="check" size={rs.font(11)} color={color} />
          <Text style={[styles.chipText, { color }]}>YOU&apos;RE IN</Text>
        </View>
      );
    }
    // Default open state — brand orange action pill.
    return (
      <View style={[styles.chip, styles.actionChip]}>
        <Text style={[styles.chipText, styles.actionChipText]}>STAKE</Text>
        <Feather name="arrow-right" size={rs.font(11)} color={Colors.text.onAction} />
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
          : mode === 'otherLocked'
          ? `${outcome.label} — locked because you already staked on the other side`
          : isMine
          ? `Add to your stake on ${outcome.label}`
          : `Stake on ${outcome.label}`
      }
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: chrome.surface,
            borderColor: chrome.border,
            opacity: chrome.dim,
            transform: [{ scale: press }],
          },
        ]}
      >
        {mode === 'marketLocked' ? (
          <DiagonalHairlines
            color={Colors.text.primary}
            opacity={0.05}
            step={9}
            borderRadius={rs.size(20)}
          />
        ) : null}

        <View style={styles.topRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.label, { color: chrome.label }]} numberOfLines={2}>
            {outcome.label}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.metaWrap}>
            <Text style={[styles.percent, { color: chrome.label === Colors.text.primary ? Colors.text.secondary : chrome.label }]}>
              {poolExists ? `${outcome.sharePercent}%` : '—'}
            </Text>
            {isMine && myStakeKobo ? (
              <Text style={[styles.myStake, { color }]} numberOfLines={1}>
                ₦{formatKoboAsCompactNaira(myStakeKobo)}
              </Text>
            ) : null}
          </View>
          {renderChip()}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  card: {
    minHeight: rs.size(112),
    borderRadius: rs.size(20),
    borderWidth: 1,
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(14),
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(8),
  },
  dot: {
    width: rs.size(8),
    height: rs.size(8),
    borderRadius: rs.size(4),
    marginTop: rs.size(7),
  },
  label: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    lineHeight: rs.font(22),
  },
  bottomRow: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs.size(8),
  },
  metaWrap: {
    flexShrink: 1,
  },
  percent: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    letterSpacing: 0.2,
  },
  myStake: {
    marginTop: rs.size(2),
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
    borderRadius: rs.size(999),
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(6),
  },
  actionChip: {
    backgroundColor: Colors.brand,
  },
  actionChipText: {
    color: Colors.text.onAction,
  },
  lockedChip: {
    backgroundColor: Colors.surface.elevated,
  },
  chipText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 1,
  },
});
