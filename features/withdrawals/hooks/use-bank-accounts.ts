// features/withdrawals/hooks/use-bank-accounts.ts
//
// Reads + writes for /me/bank-accounts. Mutations invalidate the list cache
// so the UI never shows stale account state.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { bankAccountsKeys } from '@/lib/api/query-keys';
import {
  withdrawalsApi,
  type AddBankAccountPayload,
  type AddBankAccountResult,
  type BankAccount,
} from '@/features/withdrawals/api/withdrawals-api';

export function useBankAccounts(options?: { enabled?: boolean }) {
  return useQuery<BankAccount[]>({
    queryKey: bankAccountsKeys.list(),
    queryFn: () => withdrawalsApi.listBankAccounts(),
    staleTime: 300_000, // 5 min
    gcTime: 30 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useAddBankAccount() {
  const qc = useQueryClient();
  return useMutation<AddBankAccountResult, Error, AddBankAccountPayload>({
    mutationFn: (vars) => withdrawalsApi.addBankAccount(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankAccountsKeys.list() });
    },
  });
}

export function useSetDefaultBankAccount() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => withdrawalsApi.setDefaultBankAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankAccountsKeys.list() });
    },
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => withdrawalsApi.deleteBankAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bankAccountsKeys.list() });
    },
  });
}
