// constants/fonts.ts
export const Fonts = {
  display: 'Caveat_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontToken = keyof typeof Fonts;
