// constants/colors.ts
export const Colors = {
  brand: '#FF6500',
  background: '#0A0A0A',
  card: '#1A1A1A',
  input: '#252525',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
  black: '#000000',
} as const;

export type ColorToken = keyof typeof Colors;
