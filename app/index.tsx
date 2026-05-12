// app/index.tsx
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/features/auth';
import { rs } from '@/utils/responsive';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop */
});

const SPLASH_DURATION_MS = 1400;

export default function SplashIndex() {
  const router = useRouter();
  const { isAuthenticated, refreshMe } = useAuth();

  useEffect(() => {
    let cancelled = false;

    SplashScreen.hideAsync().catch(() => {
      /* noop */
    });

    // Quietly refresh profile + wallet in the background while splash plays.
    if (isAuthenticated) {
      refreshMe();
    }

    const timer = setTimeout(() => {
      if (cancelled) return;
      router.replace(isAuthenticated ? '/(tabs)' : '/auth');
    }, SPLASH_DURATION_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router, isAuthenticated, refreshMe]);

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
