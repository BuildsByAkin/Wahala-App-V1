// hooks/useToast.tsx
// Global toast system. A single provider lives at the root of the app; any
// component can call `useToast().show(...)` to enqueue a non-modal pill.
// See ANIMATIONS.md §3.A.7.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptic } from '@/lib/motion/haptics';
import { springs } from '@/lib/motion/springs';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';

export type ToastKind = 'success' | 'warn' | 'error' | 'info';

interface ToastPayload {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

interface ToastContextValue {
  show: (opts: { kind?: ToastKind; title: string; body?: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_META: Record<ToastKind, { icon: keyof typeof Feather.glyphMap; color: string; border: string }> = {
  success: { icon: 'check-circle', color: Colors.status.win, border: Colors.status.win },
  warn: { icon: 'alert-triangle', color: '#FBBF24', border: '#FBBF24' },
  error: { icon: 'x-circle', color: Colors.status.loss, border: Colors.status.loss },
  info: { icon: 'info', color: Colors.brand, border: Colors.brand },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const translateY = useSharedValue(-rs.size(80));
  const opacity = useSharedValue(0);

  const dismiss = useCallback(() => {
    setToast(null);
  }, []);

  const show = useCallback<ToastContextValue['show']>(
    ({ kind = 'info', title, body }) => {
      idRef.current += 1;
      setToast({ id: idRef.current, kind, title, body });
      switch (kind) {
        case 'success':
          haptic.success();
          break;
        case 'warn':
          haptic.warn();
          break;
        case 'error':
          haptic.error();
          break;
        default:
          haptic.soft();
      }
    },
    []
  );

  useEffect(() => {
    if (!toast) {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      translateY.value = withTiming(-rs.size(80), time.standard);
      opacity.value = withTiming(0, time.standard);
      return;
    }
    const targetY = insets.top + rs.size(12);
    if (reduced) {
      translateY.value = withTiming(targetY, time.fast);
      opacity.value = withTiming(1, time.fast);
    } else {
      translateY.value = withSpring(targetY, springs.bouncy);
      opacity.value = withTiming(1, time.standard);
    }
    // Auto-dismiss after 2400ms.
    translateY.value = withDelay(
      2400,
      withTiming(-rs.size(80), time.standard, (finished) => {
        if (finished) runOnJS(dismiss)();
      })
    );
    opacity.value = withDelay(2400, withTiming(0, time.standard));
  }, [toast, reduced, insets.top, translateY, opacity, dismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View style={[styles.host, animatedStyle]} pointerEvents="box-none">
          <Pressable
            onPress={dismiss}
            style={[
              styles.pill,
              { borderColor: KIND_META[toast.kind].border + '66' },
            ]}
            accessibilityRole="alert"
            accessibilityLabel={`${toast.title}${toast.body ? `, ${toast.body}` : ''}`}
          >
            <Feather
              name={KIND_META[toast.kind].icon}
              size={rs.font(16)}
              color={KIND_META[toast.kind].color}
            />
            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={1}>
                {toast.title}
              </Text>
              {toast.body ? (
                <Text style={styles.body} numberOfLines={2}>
                  {toast.body}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe fallback when called outside a provider — avoids crashing in
    // isolated component tests / storybook scenarios.
    return { show: () => {} };
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(10),
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(14),
    backgroundColor: Colors.surface['03'],
    borderWidth: 1,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    flexShrink: 1,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(13),
    color: Colors.text.primary,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: Colors.text.secondary,
    marginTop: rs.size(2),
  },
});
