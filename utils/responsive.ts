// utils/responsive.ts
// Token-driven responsive helpers backed by:
//   - react-native-size-matters (moderateScale for sizes/fonts)
//   - react-native-responsive-screen (viewport-percentage helpers)
//
// `rs` is the canonical API consumed across the app — every numeric layout
// value flows through here so the UI stays consistent on iPhone SE → iPad mini
// → Galaxy Fold. Prefer `rs.size` for spacing/radii, `rs.font` for type, and
// `rs.wp / rs.hp` for explicitly viewport-relative sizing (modals, sheets).
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from 'react-native-responsive-screen';

// Slightly damped factor for fonts so tablets don't blow up display type.
const FONT_FACTOR = 0.4;
// Default factor for spacing/sizing — matches the role spec's 0.3–0.5 band.
const SIZE_FACTOR = 0.5;

export const rs = {
  /** Scale spacing, radii, icon sizes, and any other layout dimension. */
  size: (n: number, factor: number = SIZE_FACTOR) => moderateScale(n, factor),
  /** Scale type ramp. Damped so tablets don't oversize. */
  font: (n: number, factor: number = FONT_FACTOR) => moderateScale(n, factor),
  /** Pure horizontal scale — use only when the value must track width 1:1. */
  scale,
  /** Pure vertical scale — use sparingly (heights, vertical paddings). */
  verticalScale,
  /** Viewport-width percentage (0–100). */
  wp: (pct: number) => widthPercentageToDP(`${pct}%`),
  /** Viewport-height percentage (0–100). */
  hp: (pct: number) => heightPercentageToDP(`${pct}%`),
};

// Re-exports so feature code can also import the raw helpers when ergonomic.
export { moderateScale, scale, verticalScale };
export {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
