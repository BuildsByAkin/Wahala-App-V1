// constants/typography.ts
// Display ramp introduced in the v1 redesign. Body sizes still flow through
// `rs.font(n)` in callers; the constants here are *named* sizes intended for
// the display ramp (hero numbers, portfolio P&L, deposit amount input).
import { rs } from '@/utils/responsive';

export const Type = {
  // Display ramp (44–56sp, tracked tighter so big numbers feel weighted).
  display: {
    xl: { fontSize: rs.font(56), letterSpacing: -1.5 },
    lg: { fontSize: rs.font(48), letterSpacing: -1.2 },
    md: { fontSize: rs.font(44), letterSpacing: -1.0 },
  },
  // Headline (page titles, section heros).
  headline: {
    lg: { fontSize: rs.font(28), letterSpacing: -0.4 },
    md: { fontSize: rs.font(22), letterSpacing: -0.3 },
    sm: { fontSize: rs.font(18), letterSpacing: -0.2 },
  },
  // Body.
  body: {
    lg: { fontSize: rs.font(16), letterSpacing: 0 },
    md: { fontSize: rs.font(14), letterSpacing: 0 },
    sm: { fontSize: rs.font(13), letterSpacing: 0 },
  },
  // Caption / micro.
  caption: {
    md: { fontSize: rs.font(12), letterSpacing: 0.1 },
    sm: { fontSize: rs.font(11), letterSpacing: 0.2 },
    xs: { fontSize: rs.font(10), letterSpacing: 0.6 },
  },
} as const;
