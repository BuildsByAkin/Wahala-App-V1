// components/market/LiveAudioRoom.tsx
// 60dp band → tap → expands to a 280dp half-sheet. UI-only stub; the
// WebRTC/audio backend is Phase-2. Speakers are rendered as avatar chips
// with an animated waveform; listener count is static.
//
// REDESIGN_v2.md §4.3 Pillar 4 + ANIMATIONS.md §3.B.5 `RoomEnter`.
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { springs } from '@/lib/motion/springs';
import { haptic } from '@/lib/motion/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface RoomSpeaker {
  id: string;
  initial: string;
  color: string;
  /** Optional "speaking now" indicator. */
  speaking?: boolean;
}

interface Props {
  active: boolean;
  listenerCount: number;
  speakers: RoomSpeaker[];
  /** Override the band tint (defaults to brand). */
  tint?: string;
}

const COLLAPSED = 60;
const EXPANDED = 280;

const SpeakingDots: React.FC<{ color: string }> = ({ color }) => {
  const reduced = useReducedMotion();
  const a = useSharedValue(0.4);
  const b = useSharedValue(0.4);
  const c = useSharedValue(0.4);

  useEffect(() => {
    cancelAnimation(a);
    cancelAnimation(b);
    cancelAnimation(c);
    if (reduced) {
      a.value = 0.7;
      b.value = 0.7;
      c.value = 0.7;
      return;
    }
    const loop = (sv: typeof a, delay: number) => {
      sv.value = withRepeat(
        withTiming(1, { duration: 480 + delay, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    };
    loop(a, 0);
    loop(b, 80);
    loop(c, 160);
  }, [reduced, a, b, c]);

  const sa = useAnimatedStyle(() => ({ opacity: a.value }));
  const sb = useAnimatedStyle(() => ({ opacity: b.value }));
  const sc = useAnimatedStyle(() => ({ opacity: c.value }));

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, sa]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, sb]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, sc]} />
    </View>
  );
};

export const LiveAudioRoom: React.FC<Props> = ({
  active,
  listenerCount,
  speakers,
  tint,
}) => {
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = React.useState(false);
  const height = useSharedValue(COLLAPSED);
  const color = tint ?? Colors.brand;

  useEffect(() => {
    cancelAnimation(height);
    const target = expanded ? EXPANDED : COLLAPSED;
    if (reduced) {
      height.value = withTiming(rs.size(target), { duration: 180 });
    } else {
      height.value = withSpring(rs.size(target), springs.bouncy);
    }
  }, [expanded, reduced, height]);

  const hostStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  if (!active) return null;

  const toggle = () => {
    haptic.medium();
    setExpanded((p) => !p);
  };

  return (
    <Animated.View style={[styles.host, { borderColor: `${color}55` }, hostStyle]}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse live audio room' : 'Open live audio room'}
        style={styles.band}
      >
        <View style={[styles.livePill, { backgroundColor: `${color}26`, borderColor: `${color}66` }]}>
          <View style={[styles.liveDot, { backgroundColor: color }]} />
          <Text style={[styles.liveText, { color }]}>LIVE</Text>
        </View>
        <SpeakingDots color={color} />
        <Text style={styles.listenerText} numberOfLines={1}>
          {listenerCount.toLocaleString('en-NG')} listening
        </Text>
        <View style={styles.bandSpacer} />
        <Feather
          name={expanded ? 'chevron-down' : 'chevron-up'}
          size={rs.font(16)}
          color={color}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.bodyTitle}>Speakers</Text>
          <View style={styles.speakerGrid}>
            {speakers.map((s, i) => (
              <Animated.View
                key={s.id}
                style={styles.speakerCell}
                entering={reduced ? undefined : undefined}
              >
                <View style={[styles.speakerAvatar, { backgroundColor: s.color }]}>
                  <Text style={styles.speakerInitial}>{s.initial}</Text>
                </View>
                {s.speaking ? (
                  <View style={[styles.speakingRing, { borderColor: color }]} />
                ) : null}
                <Text style={styles.speakerName} numberOfLines={1}>
                  {s.initial}#{i + 1}
                </Text>
              </Animated.View>
            ))}
          </View>
          <Pressable
            onPress={() => {
              haptic.medium();
            }}
            accessibilityRole="button"
            accessibilityLabel="Raise hand to speak"
            style={[styles.cta, { backgroundColor: color }]}
          >
            <Feather name="mic" size={rs.font(13)} color={Colors.text.onAction} />
            <Text style={styles.ctaText}>Raise hand</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    marginHorizontal: rs.size(16),
    borderRadius: rs.size(18),
    borderWidth: 1,
    backgroundColor: Colors.surface['02'],
    overflow: 'hidden',
  },
  band: {
    height: rs.size(COLLAPSED),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
    paddingHorizontal: rs.size(14),
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    paddingHorizontal: rs.size(8),
    paddingVertical: rs.size(4),
    borderRadius: rs.size(999),
    borderWidth: 1,
  },
  liveDot: {
    width: rs.size(6),
    height: rs.size(6),
    borderRadius: rs.size(3),
  },
  liveText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(10),
    letterSpacing: 1.4,
  },
  dots: {
    flexDirection: 'row',
    gap: rs.size(3),
  },
  dot: {
    width: rs.size(4),
    height: rs.size(4),
    borderRadius: rs.size(2),
  },
  listenerText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
  },
  bandSpacer: { flex: 1 },
  body: {
    paddingHorizontal: rs.size(14),
    paddingTop: rs.size(8),
    paddingBottom: rs.size(14),
    gap: rs.size(12),
  },
  bodyTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 1.4,
    color: Colors.text.tertiary,
  },
  speakerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs.size(12),
  },
  speakerCell: {
    width: rs.size(56),
    alignItems: 'center',
    gap: rs.size(4),
  },
  speakerAvatar: {
    width: rs.size(44),
    height: rs.size(44),
    borderRadius: rs.size(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakingRing: {
    position: 'absolute',
    top: -rs.size(2),
    width: rs.size(48),
    height: rs.size(48),
    borderRadius: rs.size(24),
    borderWidth: 2,
  },
  speakerInitial: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: Colors.text.primary,
  },
  speakerName: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(10),
    color: Colors.text.tertiary,
    maxWidth: rs.size(56),
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(6),
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(999),
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: Colors.text.onAction,
    letterSpacing: 0.3,
  },
});
