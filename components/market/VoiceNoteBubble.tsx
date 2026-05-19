// components/market/VoiceNoteBubble.tsx
// UI-only voice-note bubble for the gist. Bundle 3 ships the visual layer;
// the audio playback backend lands later. Tap → toggles a fake playback
// progress; the waveform bars pulse while playing.
//
// REDESIGN_v2.md §4.4: voice-note comments are the WhatsApp-native input
// that Polymarket cannot ship.
import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { haptic } from '@/lib/motion/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  url: string;
  durationMs: number;
  tint?: string;
}

const BARS = 18;

function seededHeights(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(0.3 + ((h % 1000) / 1000) * 0.7);
  }
  return out;
}

const Bar: React.FC<{ height: number; playing: boolean; color: string; index: number }> = ({
  height,
  playing,
  color,
  index,
}) => {
  const reduced = useReducedMotion();
  const sv = useSharedValue(height);

  useEffect(() => {
    cancelAnimation(sv);
    if (!playing || reduced) {
      sv.value = withTiming(height, { duration: 180 });
      return;
    }
    const phase = 320 + (index % 5) * 60;
    sv.value = withRepeat(
      withTiming(Math.min(1, height + 0.25), {
        duration: phase,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [playing, height, reduced, sv, index]);

  const style = useAnimatedStyle(() => ({
    height: rs.size(20) * sv.value,
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
};

export const VoiceNoteBubble: React.FC<Props> = ({ url, durationMs, tint }) => {
  const [playing, setPlaying] = React.useState(false);
  const color = tint ?? Colors.brand;
  const heights = useMemo(() => seededHeights(url), [url]);

  const toggle = () => {
    haptic.tap();
    setPlaying((p) => !p);
  };

  // Auto-stop after duration when "playing".
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setPlaying(false), durationMs);
    return () => clearTimeout(t);
  }, [playing, durationMs]);

  const seconds = Math.max(1, Math.round(durationMs / 1000));

  return (
    <View style={[styles.bubble, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice note' : 'Play voice note'}
        style={[styles.playBtn, { backgroundColor: color }]}
      >
        <Feather
          name={playing ? 'pause' : 'play'}
          size={rs.font(13)}
          color={Colors.text.onAction}
        />
      </Pressable>
      <View style={styles.waveform}>
        {heights.map((h, i) => (
          <Bar key={i} index={i} height={h} playing={playing} color={color} />
        ))}
      </View>
      <Text style={[styles.duration, { color }]}>{seconds}s</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
    paddingVertical: rs.size(8),
    paddingHorizontal: rs.size(10),
    borderRadius: rs.size(999),
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  playBtn: {
    width: rs.size(28),
    height: rs.size(28),
    borderRadius: rs.size(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(3),
    height: rs.size(22),
  },
  bar: {
    width: rs.size(2.5),
    borderRadius: rs.size(2),
  },
  duration: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    letterSpacing: 0.3,
    marginLeft: rs.size(4),
  },
});
