// features/categories/hooks/use-categories.ts
// 24h cached fetch of the category taxonomy. The hook exposes a `lookup`
// helper that returns the server's colour triplet for a given category id,
// falling back to the local palette (`getCategoryAccent`) when the network
// is down or the id is unknown.
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { categoryKeys } from '@/lib/api/query-keys';
import { categoriesApi, type Category } from '@/features/categories/api/categories-api';
import { getCategoryAccent } from '@/constants/colors';

export function useCategories() {
  const query = useQuery({
    queryKey: categoryKeys.list(),
    queryFn: categoriesApi.list,
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });

  const lookup = useCallback(
    (id: string | undefined | null): Category => {
      const found = query.data?.find((c) => c.id === id);
      if (found) return found;
      // Fallback to the local palette so screens never render the unbranded
      // grey state — even when offline or when the backend hasn't seeded the
      // categories table yet.
      const accent = getCategoryAccent(id ?? '') as {
        primary: string;
        soft: string;
        glow?: string;
      };
      return {
        id: id ?? 'gist',
        label: (id ?? 'gist').toUpperCase(),
        primaryColor: accent.primary,
        softColor: accent.soft,
        glowColor: accent.glow ?? accent.primary,
      };
    },
    [query.data]
  );

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    lookup,
  };
}
