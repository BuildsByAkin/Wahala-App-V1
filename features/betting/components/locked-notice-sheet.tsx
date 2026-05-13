// features/betting/components/locked-notice-sheet.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { formatKoboAsNaira } from '@/lib/utils/money';

type Props = {
  visible: boolean;
  // Outcome the user is already locked into.
  lockedOutcomeLabel: string | null;
  lockedOutcomeColor: string;
  lockedStakeKobo: string | null;
  // The outcome the user just tried to tap (for the gentle "you tapped X" line).
  attemptedOutcomeLabel: string | null;
  onAddToLocked: () => void;
  onClose: () => void;
};

export function LockedNoticeSheet({
  visible,
  lockedOutcomeLabel,
  lockedOutcomeColor,
  lockedStakeKobo,
  attemptedOutcomeLabel,
  onAddToLocked,
  onClose,
}: Props) {
  const translateY = useRef(new Animated.Value(360)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.selectionAsync();
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
      translateY.setValue(360);
      backdropOpacity.setValue(0);
    }
  }, [visible, translateY, backdropOpacity]);

  if (!lockedOutcomeLabel) return null;

  const stakeText = lockedStakeKobo
    ? `₦${formatKoboAsNaira(lockedStakeKobo)}`
    : null;

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

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View style={styles.handle} />

          <View
            style={[
              styles.iconWrap,
              { backgroundColor: `${lockedOutcomeColor}1F` },
            ]}
          >
            <Feather
              name="lock"
              size={rs.font(22)}
              color={lockedOutcomeColor}
            />
          </View>

          <Text style={styles.title}>You&apos;re already in</Text>

          <Text style={styles.body}>
            You staked{' '}
            {stakeText ? (
              <Text style={styles.bodyStrong}>{stakeText}</Text>
            ) : null}{' '}
            on{' '}
            <Text style={[styles.bodyStrong, { color: lockedOutcomeColor }]}>
              {lockedOutcomeLabel}
            </Text>
            . You can only add to that bet — one side per market.
          </Text>

          {attemptedOutcomeLabel &&
          attemptedOutcomeLabel !== lockedOutcomeLabel ? (
            <View style={styles.attemptRow}>
              <Feather
                name="info"
                size={rs.font(12)}
                color="#888888"
              />
              <Text style={styles.attemptText} numberOfLines={2}>
                Tapped{' '}
                <Text style={styles.attemptStrong}>
                  {attemptedOutcomeLabel}
                </Text>
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAddToLocked();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add to your stake on ${lockedOutcomeLabel}`}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: lockedOutcomeColor,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name="plus"
              size={rs.font(16)}
              color="#0A0A0A"
            />
            <Text style={styles.primaryBtnText}>
              Add to {lockedOutcomeLabel}
            </Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.secondaryBtnText}>Got it</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: rs.size(28),
    borderTopRightRadius: rs.size(28),
    paddingHorizontal: rs.size(24),
    paddingTop: rs.size(10),
    paddingBottom: rs.size(32),
    alignItems: 'center',
  },
  handle: {
    width: rs.size(40),
    height: rs.size(5),
    borderRadius: rs.size(3),
    backgroundColor: '#2A2A2A',
    marginBottom: rs.size(20),
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
    color: '#FFFFFF',
    textAlign: 'center',
  },
  body: {
    marginTop: rs.size(10),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    lineHeight: rs.font(20),
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: rs.size(8),
  },
  bodyStrong: {
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
  },
  attemptRow: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    backgroundColor: '#181818',
    borderRadius: rs.size(999),
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(6),
    maxWidth: '90%',
  },
  attemptText: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#888888',
    flexShrink: 1,
  },
  attemptStrong: {
    fontFamily: Fonts.semibold,
    color: '#BBBBBB',
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
    color: '#0A0A0A',
    letterSpacing: 0.3,
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
    color: '#666666',
  },
});
