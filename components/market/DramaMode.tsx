// components/market/DramaMode.tsx
// Wrapper that takes over the viewport when `now > closesAt - 1h`.
// Renders:
//   • a 96sp `CountdownClock` (heart-beat in final minute, T-10 flash),
//   • a slot for the LIVE audio room (passed in via `audioRoomSlot`),
//   • a "live takes" slot (passed in via `livePostsSlot`),
//   • the existing camp-split header is hidden via `coverChildren`.
//
// The screen-level cross-fade is owned here: when `isDrama` becomes true
// the overlay fades in over 600ms; when it becomes false it fades back to
// reveal the standard layout.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { rs } from '@/utils/responsive';
import { CountdownClock } from './CountdownClock';

interface DramaModeProps {
  active: boolean;
  secondsLeft: number;
  glowColor: string;
  /** Live audio room band — Bundle 3 plugs LiveAudioRoom here. */
  audioRoomSlot?: React.ReactNode;
  /** Live take stream (e.g. the public gist). */
  livePostsSlot?: React.ReactNode;
}

export const DramaMode: React.FC<DramaModeProps> = ({
  active,
  secondsLeft,
  glowColor,
  audioRoomSlot,
  livePostsSlot,
}) => {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(active ? 1 : 0, {
      duration: reduced ? 120 : 600,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [active, reduced, opacity]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!active && opacity.value === 0) return null;

  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      style={[styles.host, wrapStyle]}
    >
      <View style={styles.banner}>
        <Text style={[styles.bannerText, { color: glowColor }]}>
          🔴 DRAMA MODE · FINAL HOUR
        </Text>
      </View>

      <CountdownClock
        secondsLeft={secondsLeft}
        glowColor={glowColor}
        size="hero"
        enableHaptics
      />

      {audioRoomSlot ? <View style={styles.slot}>{audioRoomSlot}</View> : null}

      {livePostsSlot ? <View style={styles.feed}>{livePostsSlot}</View> : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: Colors.surface['00'],
    paddingHorizontal: rs.size(16),
    paddingTop: rs.size(16),
  },
  banner: {
    alignSelf: 'center',
    paddingHorizontal: rs.size(12),
    paddingVertical: rs.size(6),
    borderRadius: rs.size(999),
    backgroundColor: Colors.surface['02'],
    borderWidth: 1,
    borderColor: Colors.border.s02,
    marginBottom: rs.size(12),
  },
  bannerText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 1.6,
  },
  slot: {
    marginTop: rs.size(16),
  },
  feed: {
    flex: 1,
    marginTop: rs.size(16),
  },
});
