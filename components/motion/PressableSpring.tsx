// components/motion/PressableSpring.tsx
// Universal tappable. ButtonPress motion baked in: scale 1→0.96 on press,
// opacity dip, and an optional shadow lift for primary variants. Pairs the
// visual with a configurable haptic so every CTA in the app feels uniform.
//
// Design rule: every interactive surface in the redesigned app consumes this
// instead of a bare Pressable. Code review should reject ad-hoc `onPress`
// without a corresponding press animation.
import React, { forwardRef, useCallback } from 'react';
import {
  Platform,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptic, type HapticToken } from '@/lib/motion/haptics';
import { springs } from '@/lib/motion/springs';
import { time } from '@/lib/motion/timings';

export type PressableSpringVariant = 'primary' | 'secondary' | 'ghost';

export interface PressableSpringProps
  extends Omit<PressableProps, 'style' | 'onPressIn' | 'onPressOut'> {
  /** Visual treatment. Primary CTAs additionally lift a soft shadow on press. */
  variant?: PressableSpringVariant;
  /** Haptic to fire on press-in. Defaults to `tap`. Pass `null` to disable. */
  haptic?: HapticToken | null;
  /** Style applied to the outer animated wrapper. */
  style?: StyleProp<ViewStyle>;
  /** Convenience pass-through. */
  children?: React.ReactNode;
}

export const PressableSpring = forwardRef<React.ComponentRef<typeof Pressable>, PressableSpringProps>(
  function PressableSpringInner(
    {
      variant = 'secondary',
      haptic: hapticToken = 'tap',
      style,
      disabled,
      onPress,
      children,
      accessibilityRole = 'button',
      ...rest
    },
    ref
  ) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const shadow = useSharedValue(0);
    const reduced = useReducedMotion();

    const handlePressIn = useCallback(
      (_e: GestureResponderEvent) => {
        if (disabled) return;
        if (hapticToken) haptic[hapticToken]();
        if (reduced) {
          opacity.value = withTiming(0.85, time.fast);
          return;
        }
        scale.value = withSpring(0.96, springs.snappy);
        opacity.value = withSpring(0.85, springs.snappy);
        if (variant === 'primary') {
          shadow.value = withSpring(0.18, springs.snappy);
        }
      },
      [disabled, hapticToken, opacity, reduced, scale, shadow, variant]
    );

    const handlePressOut = useCallback(() => {
      if (reduced) {
        opacity.value = withTiming(1, time.fast);
        return;
      }
      scale.value = withSpring(1, springs.snappy);
      opacity.value = withSpring(1, springs.snappy);
      shadow.value = withSpring(0, springs.snappy);
    }, [opacity, reduced, scale, shadow]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      // Subtle iOS shadow lift on primary CTAs; Android-only callers get an
      // elevation bump via a static styled child. We don't try to animate
      // RN elevation cross-platform.
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            shadowOpacity: shadow.value,
          }
        : {}),
    }));

    return (
      <Animated.View style={[animatedStyle, style]}>
        <Pressable
          ref={ref}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole={accessibilityRole}
          accessibilityState={{ disabled: !!disabled }}
          {...rest}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }
);
