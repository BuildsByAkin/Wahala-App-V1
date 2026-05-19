// lib/motion/springs.ts
// Three spring presets, no more. Inline spring configs are forbidden — every
// `withSpring` call in the app must consume one of these. See ANIMATIONS.md §1.1.
import type { WithSpringConfig } from 'react-native-reanimated';

export const springs = {
  /** Buttons, pills, chips, taps. Tight, no overshoot. */
  snappy: {
    damping: 18,
    stiffness: 320,
    mass: 0.7,
    overshootClamping: false,
  } satisfies WithSpringConfig,
  /** Sheets, modals, success moments. Visible overshoot, playful. */
  bouncy: {
    damping: 12,
    stiffness: 180,
    mass: 0.9,
    overshootClamping: false,
  } satisfies WithSpringConfig,
  /** Card mount, rail breathe, hero band. Slow, settled, "premium". */
  gentle: {
    damping: 22,
    stiffness: 140,
    mass: 1.0,
    overshootClamping: false,
  } satisfies WithSpringConfig,
} as const;

export type SpringPreset = keyof typeof springs;
