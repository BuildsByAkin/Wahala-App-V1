// app/daily-wahala/preview.tsx
// Daily Wahala — "Tomorrow's preview" teaser. (Bundle 6 / v2 Pillar 1.)
//
// Shows the *next* curated Wahala the user will see, with a countdown to
// the moment the daily push fires (~7pm WAT). The market is chosen from
// the open-markets feed by `closesAt` proximity until the backend exposes
// `is_daily_wahala` + a scheduled-preview endpoint.
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { Colors, getCategoryAccent } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { useDailyWahala } from '@/features/daily-wahala';
import { useMarkets } from '@/hooks/useMarkets';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { rs } from '@/utils/responsive';

// Daily push target — 7pm in the device's local timezone. We use device-local
// because the backend isn't yet feeding us a server-scheduled timestamp.
const DAILY_HOUR_LOCAL = 19;

function nextDailyDropMs(now: Date = new Date()): number {
  const target = new Date(now);
  target.setHours(DAILY_HOUR_LOCAL, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Dropping now…';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export default function PreviewScreen() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { markets, isLoading } = useMarkets();
  // BACKEND.md §4 — when the server has a `tomorrowPreview` we use it as
  // the source of truth; otherwise we fall back to the next-best featured
  // open market so the screen never goes blank on a cold backend.
  const { data: daily } = useDailyWahala();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Server-curated tomorrow takes priority. Synthesize a Market-shaped
  // partial so the downstream rendering doesn't need a separate code path.
  const serverPreview = useMemo(() => {
    const p = daily?.tomorrowPreview;
    if (!p) return null;
    return {
      question: p.question,
      category: p.category,
      imageUrl: null as string | null,
      scheduledFor: p.scheduledFor,
    };
  }, [daily?.tomorrowPreview]);

  const fallbackPreview = useMemo(() => {
    const openish = markets.filter(
      (m) => m.status === 'open' || m.status === 'scheduled'
    );
    if (openish.length === 0) return null;
    const sorted = [...openish].sort((a, b) => {
      const aFeat = a.featured ? 0 : 1;
      const bFeat = b.featured ? 0 : 1;
      if (aFeat !== bFeat) return aFeat - bFeat;
      return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime();
    });
    const s = sorted[0];
    if (!s) return null;
    return {
      question: s.question,
      category: s.category,
      imageUrl: s.imageUrl,
      scheduledFor: null as string | null,
    };
  }, [markets]);

  const preview = serverPreview ?? fallbackPreview;

  // Prefer the server-scheduled drop timestamp (BACKEND.md §4) so all devices
  // count down to the same moment. Falls back to the device-local 7pm.
  const countdownMs = useMemo(() => {
    if (daily?.dailyWahalaAt) {
      const t = new Date(daily.dailyWahalaAt).getTime();
      return t - now;
    }
    return nextDailyDropMs(new Date(now)) - now;
  }, [daily?.dailyWahalaAt, now]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const accent = getCategoryAccent(preview?.category).primary;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <PressableSpring
          variant="ghost"
          haptic="tap"
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Close"
          style={styles.topBtn}
        >
          <Feather name="x" size={rs.size(22)} color={Colors.text.primary} />
        </PressableSpring>
        <Text style={styles.topTitle}>Tomorrow&apos;s Wahala</Text>
        <View style={styles.topBtn} />
      </View>

      <Animated.View
        style={styles.body}
        entering={reduced ? undefined : FadeInUp.duration(260)}
      >
        <Text style={[styles.kicker, { color: accent }]}>UP NEXT</Text>
        <Text style={styles.countdownLabel}>Drops in</Text>
        <Text style={styles.countdown}>{formatCountdown(countdownMs)}</Text>

        {preview ? (
          <View
            style={[
              styles.card,
              { backgroundColor: '#0E0E0E', borderColor: `${accent}55` },
            ]}
          >
            {preview.imageUrl ? (
              <Image
                source={{ uri: preview.imageUrl }}
                style={styles.cardImage}
                contentFit="cover"
                transition={0}
              />
            ) : null}
            <View style={[styles.cardGradient, { backgroundColor: `${accent}1A` }]} />

            <View style={styles.cardInner}>
              <Text style={[styles.categoryChip, { color: accent, borderColor: `${accent}66` }]}>
                {preview.category.toUpperCase()}
              </Text>
              <Text style={styles.question} numberOfLines={5}>
                {preview.question}
              </Text>
              <Text style={styles.teaser}>
                Get ready. Pick your camp the moment it goes live.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Curator dey cook 🍲</Text>
            <Text style={styles.placeholderBody}>
              Tomorrow&apos;s Wahala drops at {DAILY_HOUR_LOCAL}:00. Come back then.
            </Text>
          </View>
        )}
      </Animated.View>

      <View style={styles.footer}>
        <PressableSpring
          variant="primary"
          haptic="medium"
          onPress={() => router.replace('/(tabs)' as never)}
          style={[styles.primaryBtn, { backgroundColor: Colors.brand }]}
          accessibilityLabel="Back to home"
        >
          <Text style={styles.primaryBtnLabel}>Take me home</Text>
        </PressableSpring>
        <Text style={styles.footerHint}>
          E go alert you the moment the next Wahala drop.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface['00'],
  },
  topBar: {
    height: rs.size(48),
    paddingHorizontal: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBtn: {
    width: rs.size(40),
    height: rs.size(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.primary,
  },
  body: {
    flex: 1,
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(8),
    alignItems: 'center',
  },
  kicker: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    letterSpacing: 1.5,
  },
  countdownLabel: {
    marginTop: rs.size(20),
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
    letterSpacing: 1,
  },
  countdown: {
    marginTop: rs.size(4),
    fontFamily: Fonts.bold,
    fontSize: rs.font(48),
    letterSpacing: -1.2,
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  card: {
    width: '100%',
    marginTop: rs.size(28),
    borderRadius: rs.size(24),
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: rs.size(260),
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardInner: {
    padding: rs.size(20),
    gap: rs.size(12),
  },
  categoryChip: {
    alignSelf: 'flex-start',
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 1.4,
    paddingHorizontal: rs.size(10),
    paddingVertical: rs.size(4),
    borderRadius: rs.size(999),
    borderWidth: 1,
  },
  question: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    color: Colors.text.primary,
    lineHeight: rs.font(28),
    letterSpacing: -0.4,
  },
  teaser: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.text.secondary,
    marginTop: rs.size(4),
  },
  placeholder: {
    marginTop: rs.size(36),
    alignItems: 'center',
    gap: rs.size(6),
  },
  placeholderTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(18),
    color: Colors.text.primary,
  },
  placeholderBody: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: rs.size(20),
    paddingBottom: rs.size(20),
    gap: rs.size(10),
  },
  primaryBtn: {
    height: rs.size(52),
    borderRadius: rs.size(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.onAction,
    letterSpacing: 0.2,
  },
  footerHint: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
