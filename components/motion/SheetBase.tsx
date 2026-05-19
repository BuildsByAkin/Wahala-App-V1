// components/motion/SheetBase.tsx
// Bottom-sheet primitive with the `SheetPresent` motion baked in:
//   • Backdrop fades 0 → 0.6 over `time.standard`.
//   • Sheet body translates from screenH → finalY via `spring/bouncy`.
//   • Optional `originY` (e.g. the pixel-Y of the tapped button) gives the
//     sheet a small `0.94 → 1` scale-from feel so it appears to grow from
//     the press point.
//
// Existing screens (StakeSheet / LockedNoticeSheet / CommentComposerSheet)
// continue to work; Bundle 2 migrates them onto this primitive.
import React, { useEffect } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptic } from '@/lib/motion/haptics';
import { springs } from '@/lib/motion/springs';
import { time } from '@/lib/motion/timings';
import { rs } from '@/utils/responsive';

const SCREEN_H = Dimensions.get('window').height;

export interface SheetBaseProps {
  visible: boolean;
  onClose: () => void;
  /** Optional originY for the grow-from-button effect. */
  originY?: number;
  /** Pass children directly; sheet provides padding + rounded top corners. */
  children: React.ReactNode;
  /** Inner padding override. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Avoid keyboard automatically (iOS). */
  avoidKeyboard?: boolean;
  /** Suppress haptic on open. */
  silentOpen?: boolean;
}

export const SheetBase: React.FC<SheetBaseProps> = ({
  visible,
  onClose,
  originY,
  children,
  contentStyle,
  avoidKeyboard = true,
  silentOpen,
}) => {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = React.useState(visible);

  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);
  const scale = useSharedValue(originY !== undefined ? 0.94 : 1);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (!silentOpen) haptic.soft();
      if (reduced) {
        translateY.value = withTiming(0, time.fast);
        backdrop.value = withTiming(0.6, time.fast);
        scale.value = withTiming(1, time.fast);
      } else {
        translateY.value = withSpring(0, springs.bouncy);
        backdrop.value = withTiming(0.6, time.standard);
        scale.value = withSpring(1, springs.bouncy);
      }
    } else {
      // Dismiss reverse — no bounce.
      backdrop.value = withTiming(0, { duration: 180 });
      translateY.value = withSpring(
        SCREEN_H,
        springs.snappy,
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
      scale.value = withTiming(originY !== undefined ? 0.94 : 1, time.standard);
    }
  }, [visible, reduced, originY, silentOpen, translateY, backdrop, scale]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' && avoidKeyboard ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, sheetStyle]}>
            <SafeAreaView edges={['bottom']} style={styles.safe}>
              <View style={styles.grabber} />
              <View style={[styles.content, contentStyle]}>{children}</View>
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface['03'],
    borderTopLeftRadius: rs.size(24),
    borderTopRightRadius: rs.size(24),
    borderTopWidth: 1,
    borderColor: Colors.border.s03,
  },
  safe: {
    paddingTop: rs.size(8),
  },
  grabber: {
    alignSelf: 'center',
    width: rs.size(38),
    height: rs.size(4),
    borderRadius: rs.size(2),
    backgroundColor: Colors.border.strong,
    marginBottom: rs.size(8),
  },
  content: {
    paddingHorizontal: rs.size(20),
    paddingBottom: rs.size(16),
  },
});
