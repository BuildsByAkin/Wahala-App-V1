// lib/motion/haptics.ts
// Typed wrappers around `expo-haptics`. Seven tokens, mapped 1:1 to the
// matrix in ANIMATIONS.md §1.3. Always fire-and-forget — haptics must never
// block a React render or animation, and a denied permission must not crash.
import * as Haptics from 'expo-haptics';

export type HapticToken =
  | 'tap'
  | 'soft'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warn'
  | 'error';

/** Fire a haptic. Best-effort — swallows errors and rejected permissions. */
export function fire(token: HapticToken): void {
  try {
    switch (token) {
      case 'tap':
        void Haptics.selectionAsync().catch(() => {});
        return;
      case 'soft':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return;
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        return;
      case 'heavy':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        return;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {}
        );
        return;
      case 'warn':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {}
        );
        return;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
          () => {}
        );
        return;
    }
  } catch {
    // Some platforms (e.g. older Android emulators) reject the call entirely.
  }
}

export const haptic = {
  tap: () => fire('tap'),
  soft: () => fire('soft'),
  medium: () => fire('medium'),
  heavy: () => fire('heavy'),
  success: () => fire('success'),
  warn: () => fire('warn'),
  error: () => fire('error'),
};
