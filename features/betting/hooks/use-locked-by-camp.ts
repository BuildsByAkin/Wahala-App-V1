// features/betting/hooks/use-locked-by-camp.ts
import { useQuery } from '@tanstack/react-query';

import { useAppSelector } from '@/store';
import { betKeys } from '@/lib/api/query-keys';
import { walletLockedApi } from '@/features/betting/api/wallet-locked-api';

export function useLockedByCamp(options: { enabled?: boolean } = {}) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: betKeys.lockedByCamp(),
    queryFn: walletLockedApi.byCamp,
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });

  return {
    totalLockedKobo: query.data?.totalLockedKobo ?? '0',
    camps: query.data?.camps ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
