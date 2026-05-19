// lib/motion/timings.ts
// Four timing presets. Used for data-driven motion (number ticks, rail snaps,
// colour decays) where predictability beats physicality. See ANIMATIONS.md §1.2.
import { Easing, type WithTimingConfig } from 'react-native-reanimated';

export const time = {
  /** 120ms — dot pulses, hover-equivalents. */
  fast: {
    duration: 120,
    easing: Easing.out(Easing.quad),
  } satisfies WithTimingConfig,
  /** 220ms — opacity fades, cross-fades. */
  standard: {
    duration: 220,
    easing: Easing.bezier(0.2, 0.0, 0.0, 1),
  } satisfies WithTimingConfig,
  /** 360ms — data ticks, rail transitions. iOS easeOutExpo feel. */
  emphasis: {
    duration: 360,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  } satisfies WithTimingConfig,
  /** 600ms — colour washes, decay fades. */
  slow: {
    duration: 600,
    easing: Easing.inOut(Easing.cubic),
  } satisfies WithTimingConfig,
} as const;

export type TimingPreset = keyof typeof time;
