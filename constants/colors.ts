// constants/colors.ts
//
// Token system (post-redesign):
//   • brand        — ACTION color (CTAs, primary buttons, focused inputs).
//                    Never identity, never resolved/locked.
//   • category.*   — IDENTITY palette. Each category has a `primary`, a
//                    `soft` (8% alpha over base), and a `glow` (20% alpha
//                    radial). Politics is brand-orange, but is still used
//                    as identity here — orange-as-action vs orange-as-identity
//                    is disambiguated by usage (button vs accent bar).
//   • surface/00..03 — 3-tier elevation: page < feed < hero < sheet.
//   • text/border/status — semantic neutrals + lifecycle states.
//
// Legacy flat tokens (`background`, `card`, etc.) are kept so existing
// callers continue to compile while screens migrate to the namespaced API.
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

  // Semantic surfaces. New 4-tier elevation (00 = deepest page bg).
  surface: {
    // 4-tier system.
    '00': '#070707',
    '01': '#121212',
    '02': '#161616',
    '03': '#1A1A1A',
    // Legacy aliases kept until callers migrate.
    base: '#0A0A0A',
    elevated: '#111111',
    muted: '#151515',
    sunken: '#080808',
  },
  border: {
    hairline: '#161616',
    subtle: '#1F1F1F',
    strong: '#2A2A2A',
    // New tier-paired hairlines.
    s01: '#1C1C1C',
    s02: '#262626',
    s03: '#2C2C2C',
    bevel: '#FFFFFF08',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#888888',
    tertiary: '#555555',
    disabled: '#333333',
    onAction: '#0A0A0A',
  },
  // Lifecycle / resolution states. Desaturated on purpose.
  status: {
    locked: '#9CA3AF',
    resolved: '#9CA3AF',
    win: '#7DD3A0',
    loss: '#D88A8A',
  },
  // Category IDENTITY palette. `soft` = primary @ 1A (~10%), `glow` = @ 33 (~20%).
  category: {
    politics: { primary: '#FF6500', soft: '#FF65001A', glow: '#FF650033' },
    sports: { primary: '#3B82F6', soft: '#3B82F61A', glow: '#3B82F633' },
    crypto: { primary: '#10E0A0', soft: '#10E0A01A', glow: '#10E0A033' },
    culture: { primary: '#E879F9', soft: '#E879F91A', glow: '#E879F933' },
    weather: { primary: '#7DD3FC', soft: '#7DD3FC1A', glow: '#7DD3FC33' },
    news: { primary: '#FBBF24', soft: '#FBBF241A', glow: '#FBBF2433' },
    gist: { primary: '#A78BFA', soft: '#A78BFA1A', glow: '#A78BFA33' },
  },
} as const;

export type ColorToken = keyof typeof Colors;
export type CategoryKey = keyof typeof Colors.category;

const CATEGORY_ALIASES: Record<string, CategoryKey> = {
  politics: 'politics',
  political: 'politics',
  govt: 'politics',
  government: 'politics',
  sports: 'sports',
  sport: 'sports',
  football: 'sports',
  soccer: 'sports',
  crypto: 'crypto',
  web3: 'crypto',
  defi: 'crypto',
  culture: 'culture',
  entertainment: 'culture',
  music: 'culture',
  pop: 'culture',
  weather: 'weather',
  climate: 'weather',
  news: 'news',
  breaking: 'news',
  gist: 'gist',
  other: 'gist',
};

export function resolveCategoryKey(category: string | null | undefined): CategoryKey {
  if (!category) return 'gist';
  const k = category.toLowerCase().trim();
  return CATEGORY_ALIASES[k] ?? 'gist';
}

export function getCategoryAccent(category: string | null | undefined) {
  return Colors.category[resolveCategoryKey(category)];
}
