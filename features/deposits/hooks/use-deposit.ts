// features/deposits/hooks/use-deposit.ts
//
// Two-phase flow:
//   1. `useInitializeDeposit` mutation → POST /deposits/initialize → returns
//      a Paystack authorization URL + reference. The component opens the URL
//      in an in-app browser.
//   2. `useDepositStatus` query → polls GET /deposits/:reference every 2.5s
//      while the status is `pending`. Stops automatically on `success` /
//      `failed`. On `success` we invalidate /me so the wallet refreshes.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authKeys } from '@/features/auth';
import { extractApiError } from '@/lib/api/axios';
import { depositKeys } from '@/lib/api/query-keys';
import {
  depositsApi,
  type DepositStatusResponse,
  type InitializeDepositPayload,
  type InitializeDepositResult,
} from '@/features/deposits/api/deposits-api';

export function useInitializeDeposit() {
  return useMutation<InitializeDepositResult, Error, InitializeDepositPayload>({
    mutationFn: (vars) => depositsApi.initialize(vars),
  });
}

type StatusOpts = {
  reference: string | undefined;
  // Caller controls whether polling is active (e.g. only after the browser
  // has been opened, or while the sheet is visible).
  enabled?: boolean;
  pollIntervalMs?: number;
};

export function useDepositStatus({
  reference,
  enabled = true,
  pollIntervalMs = 2500,
}: StatusOpts) {
  const queryClient = useQueryClient();

  return useQuery<DepositStatusResponse>({
    queryKey: depositKeys.status(reference),
    queryFn: async () => {
      const result = await depositsApi.getStatus(reference!);
      // Webhook on the backend has already credited the wallet by the time
      // we see `success` — refresh /me so the rest of the app picks it up.
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: authKeys.me() });
      }
      return result;
    },
    enabled: enabled && !!reference,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return pollIntervalMs;
      return data.status === 'pending' ? pollIntervalMs : false;
    },
    // Polling is the source of truth here — no stale window.
    staleTime: 0,
    gcTime: 60_000,
    retry: 2,
  });
}

export function extractDepositError(err: unknown): string {
  return extractApiError(err).message;
}
