// components/home/ArenaFullCard.tsx
// Full-screen "arena ticket" card used by the vertical-swipe arena feed
// (v2 §4.2). Image is the background with a 70% dark gradient, the question
// is 32sp display, two camp doors fill the bottom 50/50.
//   - Double-tap → plant flag on leading camp + 96dp camp-coloured flag emoji
//   - Swipe right → open detail
//   - Swipe up → next card (handled by parent pager)
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Colors, getCategoryAccent } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { PressableSpring } from '@/components/motion/PressableSpring';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptic } from '@/lib/motion/haptics';
import { springs } from '@/lib/motion/springs';
import { rs } from '@/utils/responsive';
import { type Market } from '@/utils/market';

interface ArenaFullCardProps {
  market: Market;
  height: number;
}

export const ArenaFullCard: React.FC<ArenaFullCardProps> = ({ market, height }) => {
  const router = useRouter();
  const reduced = useReducedMotion();
  // Prefer the server-denormalized categoryMeta (BACKEND.md §1).
  const accent =
    market.categoryMeta?.primaryColor ?? getCategoryAccent(market.category).primary;

  const ranked = useMemo(() => {
    return [...market.outcomes].sort((a, b) => {
      try {
        return BigInt(b.totalStakedKobo) > BigInt(a.totalStakedKobo) ? 1 : -1;
      } catch {
        return 0;
      }
    });
  }, [market.outcomes]);

  const leader = ranked[0];
  const trailer = ranked[1];

  const [flagAt, setFlagAt] = useState<{ x: number; y: number } | null>(null);
  const flagScale = useSharedValue(0);
  const flagOpacity = useSharedValue(0);
  const leaderScale = useSharedValue(1);

  const fireFlag = useCallback(
    (x: number, y: number) => {
      setFlagAt({ x, y });
      haptic.medium();
      if (reduced) {
        flagOpacity.value = 1;
        flagScale.value = 1;
        flagOpacity.value = withTiming(0, { duration: 600 });
        return;
      }
      flagScale.value = 0;
      flagOpacity.value = 1;
      flagScale.value = withSequence(
        withSpring(1.2, springs.bouncy),
        withSpring(1, springs.snappy)
      );
      flagOpacity.value = withTiming(0, { duration: 900 });
      leaderScale.value = withSequence(
        withSpring(1.06, springs.bouncy),
        withSpring(1, springs.snappy)
      );
    },
    [flagOpacity, flagScale, leaderScale, reduced]
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .onEnd((e) => {
          runOnJS(fireFlag)(e.x, e.y);
        }),
    [fireFlag]
  );

  const swipeRight = useMemo(
    () =>
      Gesture.Fling()
        .direction(1) // FlingDirection.RIGHT
        .onEnd(() => {
          runOnJS(router.push)(`/market/${market.slug}` as never);
        }),
    [router, market.slug]
  );

  const gestures = useMemo(
    () => Gesture.Exclusive(doubleTap, swipeRight),
    [doubleTap, swipeRight]
  );

  const flagStyle = useAnimatedStyle(() => ({
    opacity: flagOpacity.value,
    transform: [{ scale: flagScale.value }],
  }));
  const leaderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: leaderScale.value }],
  }));

  return (
    <GestureHandlerRootView style={{ height }}>
      <GestureDetector gesture={gestures}>
        <View style={[styles.host, { height }]}>
          {market.imageUrl ? (
            <Image
              source={{ uri: market.imageUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={200}
              accessibilityLabel={`Background: ${market.question}`}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: `${accent}33` },
              ]}
            />
          )}
          {/* Gradient mask */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="darken" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity={0.2} />
                  <Stop offset="0.55" stopColor="#000000" stopOpacity={0.55} />
                  <Stop offset="1" stopColor="#000000" stopOpacity={0.85} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width="100%" height="100%" fill="url(#darken)" />
            </Svg>
          </View>

          <View style={styles.content}>
            <View style={styles.topMeta}>
              <Text style={[styles.kicker, { color: accent }]}>
                {market.category.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.question} numberOfLines={4}>
              {market.question}
            </Text>

            <View style={styles.doors}>
              <Animated.View style={[styles.doorWrap, leaderStyle]}>
                <PressableSpring
                  variant="primary"
                  haptic="medium"
                  onPress={() => {
                    router.push(`/market/${market.slug}` as never);
                  }}
                  style={[
                    styles.door,
                    { backgroundColor: `${accent}33`, borderColor: `${accent}99` },
                  ]}
                  accessibilityLabel={`Join ${leader?.label ?? 'YES'} camp`}
                >
                  <Text style={[styles.doorLabel, { color: accent }]} numberOfLines={1}>
                    JOIN {leader?.label.toUpperCase() ?? 'YES'}
                  </Text>
                  <Text style={styles.doorCount}>
                    {Math.max(1, Math.floor(market.bettorCount * 0.55)).toLocaleString('en-NG')}
                  </Text>
                </PressableSpring>
              </Animated.View>
              <PressableSpring
                variant="primary"
                haptic="medium"
                onPress={() => router.push(`/market/${market.slug}` as never)}
                style={[
                  styles.door,
                  {
                    backgroundColor: `${Colors.category.gist.primary}33`,
                    borderColor: `${Colors.category.gist.primary}99`,
                  },
                ]}
                accessibilityLabel={`Join ${trailer?.label ?? 'NO'} camp`}
              >
                <Text
                  style={[styles.doorLabel, { color: Colors.category.gist.primary }]}
                  numberOfLines={1}
                >
                  JOIN {trailer?.label.toUpperCase() ?? 'NO'}
                </Text>
                <Text style={styles.doorCount}>
                  {Math.max(1, Math.floor(market.bettorCount * 0.45)).toLocaleString('en-NG')}
                </Text>
              </PressableSpring>
            </View>

            <Text style={styles.hint}>
              Double-tap to plant flag · Swipe right for details
            </Text>
          </View>

          {flagAt ? (
            <Animated.Text
              style={[
                styles.flag,
                { color: accent, left: flagAt.x - rs.size(48), top: flagAt.y - rs.size(48) },
                flagStyle,
              ]}
              pointerEvents="none"
            >
              🚩
            </Animated.Text>
          ) : null}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  host: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.surface['00'],
  },
  content: {
    flex: 1,
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(24),
    paddingBottom: rs.size(28),
    justifyContent: 'space-between',
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kicker: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 1.4,
  },
  question: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(28),
    color: Colors.text.primary,
    letterSpacing: -0.6,
    lineHeight: rs.font(36),
  },
  doors: {
    flexDirection: 'row',
    gap: rs.size(10),
  },
  doorWrap: {
    flex: 1,
  },
  door: {
    flex: 1,
    paddingVertical: rs.size(18),
    paddingHorizontal: rs.size(14),
    borderRadius: rs.size(16),
    borderWidth: 1,
    alignItems: 'center',
    gap: rs.size(6),
  },
  doorLabel: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(14),
    letterSpacing: 0.6,
  },
  doorCount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    color: Colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(11),
    color: '#CFCFCF',
    textAlign: 'center',
    opacity: 0.85,
  },
  flag: {
    position: 'absolute',
    fontSize: rs.font(96),
  },
});
