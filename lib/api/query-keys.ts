// lib/api/query-keys.ts
// Central query-key factories. Co-locating them avoids the classic bug where
// one caller writes ['markets'] and another writes ['market', 'list'] and the
// cache never lines up. Invalidations and `setQueryData` calls should ALWAYS
// go through these helpers — never raw arrays.

export const marketKeys = {
  all: ['markets'] as const,
  list: () => [...marketKeys.all, 'list'] as const,
  detail: (slug: string | undefined) =>
    [...marketKeys.all, 'detail', slug] as const,
};

export const commentKeys = {
  all: ['comments'] as const,
  list: (marketId: string | undefined) =>
    [...commentKeys.all, 'list', marketId] as const,
};

export const betKeys = {
  all: ['bets'] as const,
  myBets: (filters: { status?: string; limit?: number; offset?: number }) =>
    [...betKeys.all, 'mine', filters] as const,
  mySummary: () => [...betKeys.all, 'mine', 'summary'] as const,
};

export const depositKeys = {
  all: ['deposits'] as const,
  status: (reference: string | undefined) =>
    [...depositKeys.all, 'status', reference] as const,
};
