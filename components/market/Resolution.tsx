// components/market/Resolution.tsx
// Win / loss reveal overlay. Win uses a Reanimated-powered confetti fall in
// the camp colour (Lottie deferred — see HANDOFF.md Bundle 3 dependencies).
// Loss dims to surface/00 and slides a single-line copy in.
//
// ANIMATIONS.md §3.B.3.
import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import { haptic } from '@/lib/motion/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type ResolutionVariant =
  | { kind: 'win'; campColor: string; payoutLabel: string }
  | { kind: 'loss'; stakeLabel: string };

interface Props {
  visible: boolean;
  variant: ResolutionVariant;
  onDismiss: () => void;
}

const CONFETTI_COUNT = 28;

interface Piece {
  id: number;
  x: number;
  delay: number;
  rotate: number;
  duration: number;
  color: string;
}

function makePieces(color: string): Piece[] {
  const arr: Piece[] = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    arr.push({
      id: i,
      x: (i / CONFETTI_COUNT) * 100 + (Math.random() - 0.5) * 4,
      delay: Math.random() * 280,
      rotate: Math.random() * 720 - 360,
      duration: 1400 + Math.random() * 500,
      color: i % 3 === 0 ? Colors.text.primary : color,
    });
  }
  return arr;
}

const ConfettiPiece: React.FC<{ piece: Piece; reduced: boolean }> = ({ piece, reduced }) => {
  const ty = useSharedValue(-rs.size(40));
  const op = useSharedValue(0);
  const rot = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      op.value = 1;
      ty.value = rs.size(360);
      return;
    }
    op.value = withDelay(piece.delay, withTiming(1, { duration: 80 }));
    ty.value = withDelay(
      piece.delay,
      withTiming(rs.size(480), {
        duration: piece.duration,
        easing: Easing.in(Easing.quad),
      })
    );
    rot.value = withDelay(
      piece.delay,
      withTiming(piece.rotate, { duration: piece.duration, easing: Easing.linear })
    );
  }, [reduced, ty, op, rot, piece]);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        { left: `${piece.x}%`, backgroundColor: piece.color },
        style,
      ]}
    />
  );
};

export const Resolution: React.FC<Props> = ({ visible, variant, onDismiss }) => {
  const reduced = useReducedMotion();
  const op = useSharedValue(0);
  const slide = useSharedValue(40);
  const dim = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(op);
    cancelAnimation(slide);
    cancelAnimation(dim);
    if (visible) {
      if (variant.kind === 'win') {
        haptic.success();
      }
      op.value = withTiming(1, { duration: reduced ? 120 : 320 });
      slide.value = withTiming(0, { duration: reduced ? 120 : 360, easing: Easing.out(Easing.cubic) });
      dim.value = withTiming(1, { duration: 400 });
    } else {
      op.value = withTiming(0, { duration: 220 });
      slide.value = withTiming(40, { duration: 220 });
      dim.value = withTiming(0, { duration: 220 });
    }
  }, [visible, variant.kind, reduced, op, slide, dim]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: op.value }));
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value }],
  }));
  const dimStyle = useAnimatedStyle(() => ({
    opacity: dim.value * 0.85,
  }));

  const pieces = useMemo(
    () => (variant.kind === 'win' ? makePieces(variant.campColor) : []),
    [variant]
  );

  if (!visible) return null;

  if (variant.kind === 'win') {
    return (
      <Animated.View style={[styles.host, overlayStyle]} pointerEvents="box-none">
        <Animated.View style={[styles.dimBg, dimStyle]} pointerEvents="none" />
        {pieces.map((p) => (
          <ConfettiPiece key={p.id} piece={p} reduced={reduced} />
        ))}
        <Animated.View style={[styles.winCard, { borderColor: variant.campColor }, slideStyle]}>
          <Text style={[styles.winEmoji]}>🏁</Text>
          <Text style={[styles.winTitle, { color: variant.campColor }]}>You called it</Text>
          <Text style={styles.winAmount}>{variant.payoutLabel}</Text>
          <Pressable
            onPress={onDismiss}
            style={[styles.dismiss, { backgroundColor: variant.campColor }]}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Text style={styles.dismissText}>Take it in</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.host, overlayStyle]} pointerEvents="box-none">
      <Animated.View style={[styles.dimBg, dimStyle]} pointerEvents="none" />
      <Animated.View style={[styles.lossCard, slideStyle]}>
        <Text style={styles.lossText}>Camp lost. {variant.stakeLabel} down.</Text>
        <Text style={styles.lossSubtle}>Next Wahala loads soon.</Text>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={styles.lossDismiss}
        >
          <Text style={styles.lossDismissText}>OK</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  dimBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface['00'],
  },
  piece: {
    position: 'absolute',
    top: -rs.size(20),
    width: rs.size(6),
    height: rs.size(10),
    borderRadius: rs.size(1.5),
  },
  winCard: {
    paddingHorizontal: rs.size(28),
    paddingVertical: rs.size(24),
    borderRadius: rs.size(20),
    borderWidth: 1,
    backgroundColor: Colors.surface['03'],
    alignItems: 'center',
    gap: rs.size(6),
    minWidth: rs.size(240),
  },
  winEmoji: { fontSize: rs.font(36) },
  winTitle: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(16),
    letterSpacing: 0.4,
  },
  winAmount: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(30),
    color: Colors.text.primary,
    letterSpacing: -0.6,
    marginTop: rs.size(2),
  },
  dismiss: {
    marginTop: rs.size(14),
    paddingHorizontal: rs.size(18),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(999),
  },
  dismissText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: Colors.text.onAction,
    letterSpacing: 0.3,
  },
  lossCard: {
    paddingHorizontal: rs.size(24),
    paddingVertical: rs.size(20),
    backgroundColor: Colors.surface['02'],
    borderRadius: rs.size(16),
    borderWidth: 1,
    borderColor: Colors.border.s02,
    alignItems: 'center',
    gap: rs.size(4),
  },
  lossText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: Colors.text.primary,
  },
  lossSubtle: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.tertiary,
  },
  lossDismiss: {
    marginTop: rs.size(10),
    paddingHorizontal: rs.size(18),
    paddingVertical: rs.size(8),
    borderRadius: rs.size(999),
    borderWidth: 1,
    borderColor: Colors.border.s02,
  },
  lossDismissText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
  },
});
