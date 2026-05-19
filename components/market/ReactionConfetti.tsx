// components/market/ReactionConfetti.tsx
// Tap a reaction button → the emoji floats up 220dp, opacity 1 → 0, over
// 1400ms. A handful of variations float on slightly randomized X offsets so
// repeated taps don't visually overlap.
//
// ANIMATIONS.md §B "reaction confetti" — Reanimated-only, no Lottie.
import React, { useImperativeHandle, useState, forwardRef, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { haptic } from '@/lib/motion/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ALLOWED_REACTIONS } from '@/constants/reactions';

// BACKEND.md §10 — the picker MUST stay within the server's allowlist.
const EMOJI_SET: readonly string[] = ALLOWED_REACTIONS;

interface FloatingProps {
  emoji: string;
  driftX: number;
  onDone: () => void;
}

const Floating: React.FC<FloatingProps> = ({ emoji, driftX, onDone }) => {
  const reduced = useReducedMotion();
  const ty = useSharedValue(0);
  const op = useSharedValue(1);
  const tx = useSharedValue(0);

  React.useEffect(() => {
    const duration = reduced ? 600 : 1400;
    ty.value = withTiming(-rs.size(220), {
      duration,
      easing: Easing.out(Easing.cubic),
    });
    tx.value = withTiming(driftX, {
      duration,
      easing: Easing.inOut(Easing.sin),
    });
    op.value = withTiming(0, {
      duration,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [reduced, ty, tx, op, driftX, onDone]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }, { translateX: tx.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.floating, style]}>
      <Text style={styles.emojiBig}>{emoji}</Text>
    </Animated.View>
  );
};

export interface ReactionConfettiHandle {
  fire: (emoji?: string) => void;
}

interface ReactionConfettiProps {
  /** Optional tint for the pill background. */
  tint?: string;
  /**
   * Fired when the user taps one of the picker buttons. Plug
   * `useSendReaction(marketId).send` here so the tap also reaches the server.
   */
  onUserReact?: (emoji: string) => void;
}

export const ReactionConfetti = forwardRef<ReactionConfettiHandle, ReactionConfettiProps>(
  function ReactionConfettiInner({ tint, onUserReact }, ref) {
    const color = tint ?? Colors.brand;
    const [pieces, setPieces] = useState<{ id: string; emoji: string; driftX: number }[]>([]);

    const fire = useCallback((emoji?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const pick = emoji ?? EMOJI_SET[Math.floor(Math.random() * EMOJI_SET.length)];
      const driftX = (Math.random() - 0.5) * rs.size(40);
      haptic.soft();
      setPieces((prev) => [...prev, { id, emoji: pick, driftX }]);
    }, []);

    const handleUserTap = useCallback(
      (emoji: string) => {
        fire(emoji);
        onUserReact?.(emoji);
      },
      [fire, onUserReact]
    );

    useImperativeHandle(ref, () => ({ fire }), [fire]);

    const removeOne = useCallback((id: string) => {
      setPieces((prev) => prev.filter((p) => p.id !== id));
    }, []);

    return (
      <View style={styles.host} pointerEvents="box-none">
        {pieces.map((p) => (
          <Floating
            key={p.id}
            emoji={p.emoji}
            driftX={p.driftX}
            onDone={() => removeOne(p.id)}
          />
        ))}

        <View style={styles.row}>
          {EMOJI_SET.slice(0, 4).map((e) => (
            <Pressable
              key={e}
              onPress={() => handleUserTap(e)}
              accessibilityRole="button"
              accessibilityLabel={`React ${e}`}
              hitSlop={6}
              style={[styles.btn, { borderColor: `${color}44`, backgroundColor: `${color}11` }]}
            >
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  host: {
    paddingVertical: rs.size(6),
    paddingHorizontal: rs.size(20),
  },
  row: {
    flexDirection: 'row',
    // Spread the reaction buttons evenly across the row so the picker doesn't
    // sit lopsided to the left on wide screens.
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btn: {
    width: rs.size(36),
    height: rs.size(36),
    borderRadius: rs.size(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emoji: {
    fontSize: rs.font(16),
  },
  floating: {
    position: 'absolute',
    bottom: rs.size(36),
    left: '50%',
    marginLeft: -rs.size(24),
  },
  emojiBig: {
    fontSize: rs.font(48),
    fontFamily: Fonts.regular,
  },
});
