// components/market/CampSplitHeader.tsx
// Replaces v1's dual SidePanel layout. Two halves joined at a vertical seam.
// Each half = camp colour wash, count, ₦ staked, avatar stack, Plant flag CTA.
//
// REDESIGN_v2.md §4.3 mock:
//   ┌────────────────┬────────────────┐
//   │  🟢 YES CAMP   │  🟣 NO CAMP    │
//   │  3,214 people  │  5,182 people  │
//   │  ₦1.2m staked  │  ₦890k staked  │
//   │  ◯ ◯ ◯ ◯ +12   │  ◯ ◯ ◯ ◯ +27   │
//   │ [ Plant flag ] │ [ Plant flag ] │
//   └────────────────┴────────────────┘
//
// State variants per panel:
//   • idle      — full color, "Plant flag" CTA visible.
//   • selected  — the side the user has staked. CTA → "Add to stake".
//   • locked    — the other side; CTA disabled, "Locked elsewhere" copy.
//   • frozen    — market closed / locked / resolved; CTAs hidden, dim wash.
//   • won/lost  — resolved variants (green badge / dim).
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { AvatarStack, type AvatarStackEntry } from '@/components/home/AvatarStack';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { TickFlash } from '@/components/motion/TickFlash';
import { formatPoolKobo } from '@/utils/market';

export type CampPanelState =
  | 'idle'
  | 'selected'
  | 'locked'
  | 'frozen'
  | 'won'
  | 'lost';

export interface CampHalfProps {
  /** Camp short label (`YES` / `NO` / outcome label). */
  label: string;
  /** Full outcome label for the eyebrow. */
  longLabel?: string;
  /** Multiplier (e.g. 1.62 → "1.6x"). */
  multiplier: number | null;
  /** Total stakers in this camp. */
  bettorCount: number;
  /** Total kobo staked. */
  totalStakedKobo: string;
  /** Percent share — drives no rail here, but read by screen reader. */
  sharePercent: number;
  /** Camp tribal colour. */
  color: string;
  /** Visual state. */
  state: CampPanelState;
  /** User-visible avatars (deterministic if no API data). */
  avatars: AvatarStackEntry[];
  /** Tap → opens stake sheet or roster sheet. */
  onPress: () => void;
  /** Long-press → opens camp roster sheet (optional). */
  onLongPress?: () => void;
}

const CampHalf = forwardRef<View, CampHalfProps & { align: 'left' | 'right' }>(
  function CampHalfInner(
    {
      label,
      longLabel,
      multiplier,
      bettorCount,
      totalStakedKobo,
      sharePercent,
      color,
      state,
      avatars,
      onPress,
      onLongPress,
      align,
    },
    ref
  ) {
    const isFrozen = state === 'frozen' || state === 'lost';
    const isWinner = state === 'won';
    const isMine = state === 'selected';
    const isLocked = state === 'locked';

    const wash = isFrozen ? `${Colors.status.locked}14` : `${color}1A`;
    const stroke = isFrozen ? Colors.border.s02 : `${color}55`;
    const heading = isFrozen ? Colors.status.locked : color;

    const ctaLabel = isMine
      ? 'Add to stake'
      : isLocked
      ? 'Locked elsewhere'
      : isFrozen
      ? 'Awaiting resolve'
      : isWinner
      ? 'Won'
      : `Plant flag · ${label}`;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.half,
          align === 'right' && styles.halfRight,
          { backgroundColor: wash, borderColor: stroke },
          isFrozen && styles.halfFrozen,
        ]}
        accessibilityLabel={`${label} camp · ${bettorCount} people · ${sharePercent}% share`}
      >
        <View style={styles.headerRow}>
          <Text
            style={[styles.eyebrow, { color: heading }]}
            numberOfLines={1}
          >
            {isWinner ? '✓ ' : ''}
            {label.toUpperCase()} CAMP
          </Text>
          {multiplier !== null && !isFrozen ? (
            <View style={[styles.multPill, { borderColor: `${color}55` }]}>
              <Text style={[styles.multText, { color }]}>{multiplier.toFixed(2)}x</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.numericRow}>
          <TickFlash
            value={bettorCount}
            format={(n) => n.toLocaleString('en-NG')}
            style={styles.bigNumeric}
          />
          <Text style={styles.numericLabel}>people</Text>
        </View>

        <Text style={styles.stakedRow} numberOfLines={1}>
          <Text style={[styles.stakedAmount, { color }]}>
            ₦{formatPoolKobo(totalStakedKobo).replace('₦', '')}
          </Text>
          <Text style={styles.stakedSuffix}> staked</Text>
        </Text>

        <View style={styles.avatarRow}>
          <AvatarStack entries={avatars} total={bettorCount} max={4} />
        </View>

        {longLabel ? (
          <Text style={styles.outcomeFootnote} numberOfLines={1}>
            {longLabel}
          </Text>
        ) : null}

        <PressableSpring
          variant={isMine || (!isFrozen && !isLocked) ? 'primary' : 'ghost'}
          haptic={isLocked || isFrozen ? null : 'medium'}
          onPress={onPress}
          onLongPress={onLongPress}
          disabled={isFrozen}
          style={[
            styles.cta,
            isFrozen
              ? { backgroundColor: Colors.surface['02'], borderColor: Colors.border.s02 }
              : isLocked
              ? { backgroundColor: Colors.surface['02'], borderColor: Colors.border.s02 }
              : { backgroundColor: color, borderColor: color },
          ]}
          accessibilityLabel={ctaLabel}
        >
          {isMine ? (
            <Feather name="plus" size={rs.font(13)} color={Colors.text.onAction} />
          ) : isLocked ? (
            <Feather name="lock" size={rs.font(12)} color={Colors.text.tertiary} />
          ) : null}
          <Text
            style={[
              styles.ctaText,
              {
                color:
                  isLocked || isFrozen
                    ? Colors.text.tertiary
                    : Colors.text.onAction,
              },
            ]}
            numberOfLines={1}
          >
            {ctaLabel}
          </Text>
        </PressableSpring>
      </View>
    );
  }
);

export interface CampSplitHeaderProps {
  leading: CampHalfProps;
  trailing: CampHalfProps;
  /** Refs returned so screen can measure for `originY` on stake-sheet. */
  leadingRef?: React.RefObject<View | null>;
  trailingRef?: React.RefObject<View | null>;
}

export const CampSplitHeader: React.FC<CampSplitHeaderProps> = ({
  leading,
  trailing,
  leadingRef,
  trailingRef,
}) => {
  return (
  <View style={styles.row}>
    <CampHalf {...leading} ref={leadingRef as React.RefObject<View>} align="left" />
    <View style={styles.seam} />
    <CampHalf {...trailing} ref={trailingRef as React.RefObject<View>} align="right" />
  </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: rs.size(16),
  },
  half: {
    flex: 1,
    borderWidth: 1,
    borderTopLeftRadius: rs.size(18),
    borderBottomLeftRadius: rs.size(18),
    paddingHorizontal: rs.size(14),
    paddingTop: rs.size(14),
    paddingBottom: rs.size(12),
    gap: rs.size(6),
  },
  halfRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: rs.size(18),
    borderBottomRightRadius: rs.size(18),
  },
  halfFrozen: {
    opacity: 0.7,
  },
  seam: {
    width: 1,
    backgroundColor: Colors.border.s02,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  multPill: {
    paddingHorizontal: rs.size(6),
    paddingVertical: rs.size(2),
    borderRadius: rs.size(6),
    borderWidth: 1,
  },
  multText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 0.3,
  },
  numericRow: {
    marginTop: rs.size(4),
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rs.size(6),
  },
  bigNumeric: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(26),
    color: Colors.text.primary,
    letterSpacing: -0.6,
  },
  numericLabel: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
    paddingBottom: rs.size(3),
  },
  stakedRow: {
    marginTop: rs.size(2),
  },
  stakedAmount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
  },
  stakedSuffix: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
  avatarRow: {
    marginTop: rs.size(4),
    minHeight: rs.size(24),
  },
  outcomeFootnote: {
    marginTop: rs.size(2),
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
  },
  cta: {
    marginTop: rs.size(10),
    minHeight: rs.size(40),
    borderRadius: rs.size(999),
    borderWidth: 1,
    paddingHorizontal: rs.size(10),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: rs.size(6),
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
