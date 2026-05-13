// features/withdrawals/hooks/use-banks.ts
//
// /banks is public, deterministic, and effectively immutable for a session
// (Nigerian bank list rarely changes). staleTime: Infinity guarantees that
// React Query never re-fetches it on remount or focus while the app is alive.
import { useQuery } from '@tanstack/react-query';

import { banksKeys } from '@/lib/api/query-keys';
import {
  withdrawalsApi,
  type Bank,
} from '@/features/withdrawals/api/withdrawals-api';

export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: banksKeys.list(),
    queryFn: () => withdrawalsApi.listBanks(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
