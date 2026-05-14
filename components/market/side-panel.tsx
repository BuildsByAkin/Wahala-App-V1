import React from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

export type PanelState = 'idle' | 'selected' | 'unselected' | 'locked' | 'won' | 'lost' | 'frozen';

type Props = {
  side: 'YES' | 'NO';
  label: string;
  percent: number;
  multiplier: number | null;
  color: string;
  state: PanelState;
  isMine: boolean;
  poolExists: boolean;
  isLeading: boolean;
  ctaLabel: string;
  onPress: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  enterDelay?: number;
};

function withAlpha(hex: string, alphaHex: string) {
  return `${hex}${alphaHex}`;
}

export function SidePanel({
  side,
  label,
  percent,
  multiplier,
  color,
  state,
  isMine,
  poolExists,
  isLeading,
  ctaLabel,
  onPress,
  onLayout,
}: Props) {
  const interactive = state === 'idle' || state === 'selected' || state === 'unselected';

  const surface =
    state === 'selected'
      ? withAlpha(color, '24')
      : state === 'won'
      ? withAlpha(Colors.status.win, '1A')
      : state === 'lost' || state === 'locked' || state === 'frozen'
      ? Colors.surface.muted
      : isMine
      ? withAlpha(color, '18')
      : Colors.surface.elevated;

  const border =
    state === 'selected'
      ? color
      : state === 'won'
      ? withAlpha(Colors.status.win, '88')
      : isMine
      ? withAlpha(color, 'AA')
      : isLeading
      ? withAlpha(color, '55')
      : Colors.border.subtle;

  const showCta = interactive;
  const cardOpacity = state === 'unselected' ? 0.65 : state === 'lost' ? 0.6 : 1;

  return (
    <View
      onLayout={onLayout}
      style={[styles.wrap, { opacity: cardOpacity }]}
    >
      <Pressable
        onPress={interactive ? onPress : undefined}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityState={{ disabled: !interactive, selected: state === 'selected' }}
        accessibilityLabel={`${side} side, ${label}, ${percent}% market share`}
        accessibilityHint={interactive ? `Open stake sheet to back ${label}` : undefined}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: surface,
            borderColor: border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.sideTag, { backgroundColor: withAlpha(color, '26') }]}>
            <Text style={[styles.sideTagText, { color }]}>{side}</Text>
          </View>
          {isMine ? (
            <View style={[styles.mineBadge, { backgroundColor: withAlpha(color, '22') }]}>
              <Feather name="check" size={rs.font(10)} color={color} />
              <Text style={[styles.mineBadgeText, { color }]}>IN</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>

        <View style={styles.percentRow}>
          {poolExists ? (
            <Text style={[styles.percent, { color: Colors.text.primary }]}>
              {Math.round(percent)}%
            </Text>
          ) : (
            <Text style={[styles.percent, { color: Colors.text.tertiary }]}>—</Text>
          )}
          <Text style={styles.payout}>
            {multiplier !== null ? `${multiplier}x payout` : 'No pool yet'}
          </Text>
        </View>

        {state === 'won' ? (
          <View style={[styles.statusChip, { backgroundColor: withAlpha(Colors.status.win, '26') }]}>
            <Text style={[styles.statusChipText, { color: Colors.status.win }]}>WON</Text>
          </View>
        ) : state === 'lost' ? (
          <View style={[styles.statusChip, { backgroundColor: Colors.surface.elevated }]}>
            <Text style={[styles.statusChipText, { color: Colors.status.loss }]}>LOST</Text>
          </View>
        ) : state === 'locked' ? (
          <View style={[styles.statusChip, { backgroundColor: Colors.surface.elevated }]}>
            <Feather name="lock" size={rs.font(11)} color={Colors.text.tertiary} />
            <Text style={[styles.statusChipText, { color: Colors.text.tertiary }]}>LOCKED</Text>
          </View>
        ) : state === 'frozen' ? (
          <View style={[styles.statusChip, { backgroundColor: Colors.surface.elevated }]}>
            <Feather name="lock" size={rs.font(11)} color={Colors.text.tertiary} />
            <Text style={[styles.statusChipText, { color: Colors.text.tertiary }]}>FROZEN</Text>
          </View>
        ) : showCta ? (
          <View style={styles.ctaRow}>
            <View
              style={[
                styles.cta,
                state === 'selected'
                  ? { backgroundColor: Colors.brand }
                  : { backgroundColor: withAlpha(Colors.brand, '1A'), borderWidth: 1, borderColor: withAlpha(Colors.brand, '55') },
              ]}
            >
              <Text
                style={[
                  styles.ctaText,
                  {
                    color: state === 'selected' ? Colors.text.onAction : Colors.brand,
                  },
                ]}
              >
                {ctaLabel}
              </Text>
              <Feather
                name="arrow-up-right"
                size={rs.font(13)}
                color={state === 'selected' ? Colors.text.onAction : Colors.brand}
              />
            </View>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  card: {
    minHeight: rs.size(184),
    borderRadius: rs.size(22),
    borderWidth: 1,
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(16),
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  mineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(3),
    borderRadius: rs.size(999),
  },
  mineBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 1,
  },
  label: {
    marginTop: rs.size(10),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: Colors.text.secondary,
    lineHeight: rs.font(18),
  },
  percentRow: {
    marginTop: rs.size(4),
  },
  percent: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(34),
    lineHeight: rs.font(38),
    letterSpacing: -0.5,
  },
  payout: {
    marginTop: rs.size(2),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    letterSpacing: 0.3,
  },
  statusChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(4),
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(6),
    borderRadius: rs.size(999),
    marginTop: rs.size(12),
  },
  statusChipText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 1,
  },
  ctaRow: {
    marginTop: rs.size(12),
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(999),
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 0.6,
  },
});
