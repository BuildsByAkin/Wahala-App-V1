// features/betting/components/locked-notice-sheet.tsx
// Refactored onto the system `SheetBase` primitive (Bundle 2).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';
import { SheetBase } from '@/components/motion/SheetBase';
import { PressableSpring } from '@/components/motion/PressableSpring';

type Props = {
  visible: boolean;
  lockedOutcomeLabel: string | null;
  lockedOutcomeColor: string;
  lockedStakeKobo: string | null;
  attemptedOutcomeLabel: string | null;
  // BACKEND.md §7 — Switch-camp affordance. When `canSwitch` and a target
  // colour are supplied we render a secondary "Switch to {attemptedLabel}"
  // CTA that defects every active stake on the locked outcome.
  canSwitch?: boolean;
  attemptedOutcomeColor?: string;
  isSwitching?: boolean;
  switchFeeLabel?: string | null;
  onSwitchToAttempted?: () => void;
  onAddToLocked: () => void;
  onClose: () => void;
};

export function LockedNoticeSheet({
  visible,
  lockedOutcomeLabel,
  lockedOutcomeColor,
  lockedStakeKobo,
  attemptedOutcomeLabel,
  canSwitch = false,
  attemptedOutcomeColor,
  isSwitching = false,
  switchFeeLabel = null,
  onSwitchToAttempted,
  onAddToLocked,
  onClose,
}: Props) {
  if (!lockedOutcomeLabel) return null;

  const stakeText = lockedStakeKobo ? `₦${formatKoboAsNaira(lockedStakeKobo)}` : null;

  return (
    <SheetBase visible={visible} onClose={onClose}>
      <View style={styles.inner}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: `${lockedOutcomeColor}1F` },
          ]}
        >
          <Feather name="lock" size={rs.font(22)} color={lockedOutcomeColor} />
        </View>

        <Text style={styles.title}>You&apos;re already in</Text>

        <Text style={styles.body}>
          You staked{' '}
          {stakeText ? <Text style={styles.bodyStrong}>{stakeText}</Text> : null}{' '}
          on{' '}
          <Text style={[styles.bodyStrong, { color: lockedOutcomeColor }]}>
            {lockedOutcomeLabel}
          </Text>
          . You can only add to that bet — one side per market.
        </Text>

        {attemptedOutcomeLabel && attemptedOutcomeLabel !== lockedOutcomeLabel ? (
          <View style={styles.attemptRow}>
            <Feather name="info" size={rs.font(12)} color={Colors.text.secondary} />
            <Text style={styles.attemptText} numberOfLines={2}>
              Tapped{' '}
              <Text style={styles.attemptStrong}>{attemptedOutcomeLabel}</Text>
            </Text>
          </View>
        ) : null}

        <PressableSpring
          variant="primary"
          haptic="soft"
          onPress={onAddToLocked}
          accessibilityLabel={`Add to your stake on ${lockedOutcomeLabel}`}
          style={[styles.primaryBtn, { backgroundColor: lockedOutcomeColor }]}
        >
          <Feather name="plus" size={rs.font(16)} color={Colors.text.onAction} />
          <Text style={styles.primaryBtnText}>Add to {lockedOutcomeLabel}</Text>
        </PressableSpring>

        {/* Switch-camp / defection CTA intentionally removed — product
            decision: one side per market, no hedging and no switching. The
            `canSwitch` / `onSwitchToAttempted` props are kept on the API
            for now to avoid breaking callers, but they no longer render. */}

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.secondaryBtnText}>Got it</Text>
        </Pressable>
      </View>
    </SheetBase>
  );
}

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    paddingBottom: rs.size(16),
  },
  iconWrap: {
    width: rs.size(56),
    height: rs.size(56),
    borderRadius: rs.size(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rs.size(4),
  },
  title: {
    marginTop: rs.size(16),
    fontFamily: Fonts.bold,
    fontSize: rs.font(20),
    color: Colors.text.primary,
    textAlign: 'center',
  },
  body: {
    marginTop: rs.size(10),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    lineHeight: rs.font(20),
    color: Colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: rs.size(8),
  },
  bodyStrong: {
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
  },
  attemptRow: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    backgroundColor: Colors.surface['02'],
    borderRadius: rs.size(999),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(6),
    maxWidth: '90%',
  },
  attemptText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
    flexShrink: 1,
  },
  attemptStrong: {
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
  },
  primaryBtn: {
    marginTop: rs.size(24),
    height: rs.size(52),
    borderRadius: rs.size(26),
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
  },
  primaryBtnText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.onAction,
    letterSpacing: 0.3,
  },
  switchBtn: {
    marginTop: rs.size(10),
    height: rs.size(48),
    borderRadius: rs.size(24),
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs.size(6),
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  switchBtnText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    letterSpacing: 0.2,
  },
  switchBtnFee: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    marginLeft: rs.size(4),
  },
  secondaryBtn: {
    marginTop: rs.size(8),
    height: rs.size(44),
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: Colors.text.tertiary,
  },
});
