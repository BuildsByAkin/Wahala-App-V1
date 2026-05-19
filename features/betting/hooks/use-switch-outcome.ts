// features/betting/hooks/use-switch-outcome.ts
//
// BACKEND.md §7 — defect to another camp. On success we:
//   1. Snap the wallet to the server-authoritative balance.
//   2. Invalidate /me/bets so the stance reflects the new camp.
//   3. Invalidate the affected market detail + locked-by-camp aggregate.
// The server emits a stance.changed event on the market stream which
// useMarketStream will splice into the activity tape — no need to wire
// that from here.
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { applyWallet, authKeys } from '@/features/auth';
import { useAppDispatch } from '@/store';
import { extractApiError } from '@/lib/api/axios';
import { betKeys, campChatKeys, marketKeys } from '@/lib/api/query-keys';
import { bettingApi } from '@/features/betting/api/betting-api';

export type SwitchOutcomeError = {
  code: 'market_closed' | 'unauthorized' | 'invalid_target' | 'unknown';
  message: string;
  status?: number;
};

function toErr(err: unknown): SwitchOutcomeError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as { code?: string } | undefined;
    const message = extractApiError(err).message;
    if (status === 401) return { code: 'unauthorized', message, status };
    if (status === 409 && data?.code === 'market_closed') {
      return { code: 'market_closed', message, status };
    }
    if (status === 400) return { code: 'invalid_target', message, status };
    return { code: 'unknown', message, status };
  }
  return {
    code: 'unknown',
    message: err instanceof Error ? err.message : 'Something went wrong.',
  };
}

export function useSwitchOutcome(opts?: { marketSlug?: string }) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const mutation = useMutation({
    mutationFn: async (vars: {
      betId: string;
      targetOutcomeId: string;
      /** Optional — used to drop the now-inaccessible camp-chat cache. */
      marketId?: string;
      previousOutcomeId?: string;
    }) => {
      try {
        return await bettingApi.switchOutcome({
          betId: vars.betId,
          targetOutcomeId: vars.targetOutcomeId,
        });
      } catch (e) {
        throw toErr(e);
      }
    },
    onSuccess: (res, vars) => {
      dispatch(applyWallet(res.wallet));
      queryClient.invalidateQueries({ queryKey: betKeys.all });
      if (opts?.marketSlug) {
        queryClient.invalidateQueries({
          queryKey: marketKeys.detail(opts.marketSlug),
        });
      }
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      // The user can no longer read the old camp's chat — drop it so a
      // future re-entry refetches fresh, and avoid leaking stale messages.
      if (vars.marketId && vars.previousOutcomeId) {
        queryClient.removeQueries({
          queryKey: campChatKeys.list(vars.marketId, vars.previousOutcomeId),
        });
      }
    },
  });

  const reset = useCallback(() => mutation.reset(), [mutation]);

  return {
    switchOutcome: mutation.mutateAsync,
    isSwitching: mutation.isPending,
    error: mutation.error as SwitchOutcomeError | null,
    feeKobo: mutation.data?.feeKobo ?? null,
    reset,
  };
}
