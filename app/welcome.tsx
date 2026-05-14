// app/welcome.tsx
//
// One-time welcome screen. Shown exactly once after first signup, gated by
// `auth.hasSeenWelcome` (persisted via redux-persist). Either CTA flips the
// flag *before* navigating away — that way a hard-kill in the middle of the
// route transition still won't re-show this screen on next launch.
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { setHasSeenWelcome } from '@/features/auth';
import { useAppDispatch } from '@/store';
import { rs } from '@/utils/responsive';

type Feature = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
};

const FEATURES: readonly Feature[] = [
  {
    icon: 'trending-up',
    title: 'Pick your side',
    body: 'Bet on markets across BBNaija, football, politics and more',
  },
  {
    icon: 'users',
    title: 'Join the argument',
    body: 'Comment and flex your predictions with other users',
  },
  {
    icon: 'dollar-sign',
    title: 'Win real naira',
    body: 'Winners split the pool. The more you stake, the more you win',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  // Centralise the "mark seen" step. Both CTAs hit this before navigating so
  // we never end up in a state where the user dismissed the screen but the
  // flag didn't persist.
  const markSeen = useCallback(() => {
    dispatch(setHasSeenWelcome(true));
  }, [dispatch]);

  const handleDeposit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    markSeen();
    // Tabs first, then push deposit on top — this guarantees the tab bar is
    // mounted underneath the deposit modal/screen, so dismissing it lands
    // the user on the home tab instead of an empty stack.
    router.replace('/(tabs)');
    router.push('/wallet/deposit' as never);
  }, [markSeen, router]);

  const handleBrowse = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    markSeen();
    router.replace('/(tabs)');
  }, [markSeen, router]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text allowFontScaling={false} style={styles.logoLetter}>
            W
          </Text>
        </View>

        <Text allowFontScaling={false} style={styles.brand}>
          Wahala
        </Text>

        <Text allowFontScaling={false} style={styles.heading}>
          Welcome to the gist
        </Text>

        <Text allowFontScaling={false} style={styles.tagline}>
          {'Predict what go happen. Stake your naira.\nIf you right, you chop the pool.\nSimple as that.'}
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon} size={rs.size(18)} color={Colors.black} />
              </View>
              <View style={styles.featureCopy}>
                <Text allowFontScaling={false} style={styles.featureTitle}>
                  {f.title}
                </Text>
                <Text allowFontScaling={false} style={styles.featureBody}>
                  {f.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + rs.size(24) },
        ]}
      >
        <Pressable
          onPress={handleDeposit}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Deposit and start betting"
        >
          <Text allowFontScaling={false} style={styles.primaryButtonText}>
            Deposit & Start Betting
          </Text>
        </Pressable>

        <Pressable
          onPress={handleBrowse}
          hitSlop={10}
          style={styles.secondaryButton}
          accessibilityRole="button"
          accessibilityLabel="Browse markets first"
        >
          <Text allowFontScaling={false} style={styles.secondaryButtonText}>
            Browse markets first
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs.size(20),
  },
  // Matches the auth/signup logo treatment — orange circle with the white "W".
  logoCircle: {
    width: rs.size(64),
    height: rs.size(64),
    borderRadius: rs.size(64) / 2,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: Colors.black,
    fontFamily: Fonts.display,
    fontSize: rs.font(28),
    includeFontPadding: false,
  },
  brand: {
    marginTop: rs.size(24),
    color: Colors.brand,
    fontFamily: Fonts.display,
    fontSize: rs.font(40),
    includeFontPadding: false,
  },
  heading: {
    marginTop: rs.size(32),
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    textAlign: 'center',
    includeFontPadding: false,
  },
  tagline: {
    marginTop: rs.size(12),
    paddingHorizontal: rs.size(32),
    color: '#888888',
    fontFamily: Fonts.regular,
    fontSize: rs.font(15),
    lineHeight: rs.font(24),
    textAlign: 'center',
    includeFontPadding: false,
  },
  features: {
    marginTop: rs.size(40),
    alignSelf: 'stretch',
  },
  featureRow: {
    paddingHorizontal: rs.size(32),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs.size(20),
  },
  featureIcon: {
    width: rs.size(36),
    height: rs.size(36),
    borderRadius: rs.size(36) / 2,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    marginLeft: rs.size(14),
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    includeFontPadding: false,
  },
  featureBody: {
    marginTop: rs.size(2),
    color: '#666666',
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    includeFontPadding: false,
  },
  // Pinned to the bottom safe-area inset + 24, per spec. We don't use
  // `position: absolute` because flexbox + safe-area inset gives the same
  // visual result without the gotchas around scroll/keyboard.
  footer: {
    paddingHorizontal: rs.size(20),
  },
  primaryButton: {
    height: rs.size(56),
    backgroundColor: Colors.brand,
    borderRadius: rs.size(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: Colors.black,
    fontFamily: Fonts.bold,
    fontSize: rs.font(16),
    includeFontPadding: false,
  },
  secondaryButton: {
    marginTop: rs.size(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs.size(8),
  },
  secondaryButtonText: {
    color: '#555555',
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    includeFontPadding: false,
  },
});
