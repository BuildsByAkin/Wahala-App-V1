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
  list: () => [...depositKeys.all, 'list'] as const,
  status: (sessionId: string | undefined) =>
    [...depositKeys.all, 'status', sessionId] as const,
};

export const banksKeys = {
  all: ['banks'] as const,
  list: () => [...banksKeys.all, 'list'] as const,
};

export const bankAccountsKeys = {
  all: ['bank-accounts'] as const,
  list: () => [...bankAccountsKeys.all, 'list'] as const,
};

export const kycKeys = {
  all: ['kyc'] as const,
  bvn: () => [...kycKeys.all, 'bvn'] as const,
};

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  // Page size is the only parameter that splits the cache; offset is part of
  // the infinite-query cursor, not the key.
  list: (params: { limit: number }) =>
    [...leaderboardKeys.all, 'list', params] as const,
};

export const withdrawalKeys = {
  all: ['withdrawals'] as const,
  list: () => [...withdrawalKeys.all, 'list'] as const,
  status: (id: string | undefined) =>
    [...withdrawalKeys.all, 'status', id] as const,
};
