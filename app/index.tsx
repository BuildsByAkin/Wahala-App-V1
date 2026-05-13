// app/index.tsx
// Branded splash. We keep it on screen for a short *minimum* duration purely
// for aesthetics (avoids a jarring single-frame flash on warm starts), but the
// real gate is `auth.hydrated` — we redirect the instant rehydration is done,
// or after MIN_SPLASH_MS, whichever is later. No /me call here; the home
// screen owns that via `useMe`.
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAppSelector } from '@/store';
import { rs } from '@/utils/responsive';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop */
});

const MIN_SPLASH_MS = 600;

export default function SplashIndex() {
  const router = useRouter();
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const mountedAt = useRef(Date.now());
  const navigated = useRef(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      /* noop */
    });
  }, []);

  useEffect(() => {
    if (!hydrated || navigated.current) return;
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    const t = setTimeout(() => {
      navigated.current = true;
      router.replace(isAuthenticated ? '/(tabs)' : '/auth');
    }, wait);
    return () => clearTimeout(t);
  }, [hydrated, isAuthenticated, router]);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Text
        accessibilityRole="header"
        allowFontScaling={false}
        style={styles.wordmark}
      >
        Wahala
      </Text>
      <Text allowFontScaling={false} style={styles.tagline}>
        predict. stake. win.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: Fonts.display,
    color: Colors.black,
    fontSize: rs.font(70),
    lineHeight: rs.font(100),
    letterSpacing: -0.5,
    paddingHorizontal: rs.size(20),
  },
  tagline: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    color: Colors.black,
    opacity: 0.4,
    fontSize: rs.font(12),
  },
});
