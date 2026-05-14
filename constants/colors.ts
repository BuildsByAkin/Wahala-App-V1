// constants/colors.ts
//
// Token system:
//   • brand        — ACTION color. CTAs, confirm buttons, focused inputs,
//                    inline Stake pill, input caret. Never used as side identity
//                    or as resolved/locked state.
//   • surface/border/text/status — semantic neutrals + lifecycle states.
//
// Side identity colors (for binary markets) live in `utils/market.ts` under
// `BINARY_COLOR_SCHEMES`. They are deliberately less-loaded pairs — never
// green/red — so the chrome reads as identity, not moral judgment.
export const Colors = {
  // Action accent. Reserve strictly for actions.
  brand: '#FF6500',

  // Legacy flat tokens — kept for back-compat with existing callers.
  background: '#0A0A0A',
  card: '#1A1A1A',
  input: '#252525',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
  black: '#000000',

  // Semantic surfaces.
  surface: {
    base: '#0A0A0A',
    elevated: '#111111',
    muted: '#151515',
    sunken: '#080808',
  },
  border: {
    hairline: '#161616',
    subtle: '#1F1F1F',
    strong: '#2A2A2A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#888888',
    tertiary: '#555555',
    disabled: '#333333',
    onAction: '#0A0A0A',
  },
  // Lifecycle / resolution states. Desaturated on purpose — these communicate
  // historical fact, not "good vs bad".
  status: {
    locked: '#9CA3AF',
    resolved: '#9CA3AF',
    win: '#7DD3A0',
    loss: '#D88A8A',
  },
} as const;

export type ColorToken = keyof typeof Colors;
