// features/betting/hooks/use-place-bet.ts
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { applyWallet, authKeys } from '@/features/auth';
import { useAppDispatch } from '@/store';
import { extractApiError } from '@/lib/api/axios';
import { betKeys, marketKeys } from '@/lib/api/query-keys';
import { markStanceTaken } from '@/lib/streak';
import {
  bettingApi,
  type PlaceBetPayload,
  type PlaceBetResult,
} from '@/features/betting/api/betting-api';
import { uuidv4 } from '@/features/betting/utils/uuid';

// Server-side error codes documented by the API. Surface them as a discriminated
// union so callers can branch without sniffing strings.
export type PlaceBetErrorCode =
  | 'insufficient_funds'
  | 'already_bet_on_different_outcome'
  | 'market_closed'
  | 'stake_too_low'
  | 'stake_too_high'
  | 'unauthorized'
  | 'unknown';

export type PlaceBetError = {
  code: PlaceBetErrorCode;
  message: string;
  status?: number;
};

function toPlaceBetError(err: unknown): PlaceBetError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as
      | { code?: string; message?: string; error?: string }
      | undefined;
    const rawCode = (data?.code ?? data?.error ?? '').toString();
    const message = extractApiError(err).message;

    if (status === 401) {
      return { code: 'unauthorized', message: 'Please sign in again.', status };
    }
    if (status === 409) {
      if (rawCode === 'insufficient_funds') {
        return {
          code: 'insufficient_funds',
          message: 'Not enough money in your wallet.',
          status,
        };
      }
      if (rawCode === 'already_bet_on_different_outcome') {
        return {
          code: 'already_bet_on_different_outcome',
          message: 'You already staked on another option in this market.',
          status,
        };
      }
      if (rawCode === 'market_closed') {
        return {
          code: 'market_closed',
          message: 'This market is no longer accepting bets.',
          status,
        };
      }
    }
    if (status === 400) {
      // The backend may send a code or just a message.
      if (rawCode === 'stake_too_low') {
        return { code: 'stake_too_low', message, status };
      }
      if (rawCode === 'stake_too_high') {
        return { code: 'stake_too_high', message, status };
      }
      const m = message.toLowerCase();
      if (m.includes('min')) return { code: 'stake_too_low', message, status };
      if (m.includes('max')) return { code: 'stake_too_high', message, status };
    }
    return { code: 'unknown', message, status };
  }
  return {
    code: 'unknown',
    message: err instanceof Error ? err.message : 'Something went wrong.',
  };
}

type PlaceBetVariables = Omit<PlaceBetPayload, 'clientBetId'> & {
  // Optional override; the hook generates one per mutation if omitted.
  clientBetId?: string;
};

export function usePlaceBet(opts?: { marketSlug?: string }) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const mutation = useMutation<PlaceBetResult, PlaceBetError, PlaceBetVariables>({
    mutationFn: async (vars) => {
      const clientBetId = vars.clientBetId ?? uuidv4();
      try {
        return await bettingApi.placeBet({ ...vars, clientBetId });
      } catch (err) {
        throw toPlaceBetError(err);
      }
    },
    onSuccess: (result) => {
      // Snap the wallet to the server's authoritative balance immediately —
      // no need to refetch /me just for this.
      dispatch(applyWallet(result.wallet));

      // Bundle 6 — Daily Wahala streak. Idempotent within the day.
      // Skip if the server reports this was a duplicate of an earlier bet.
      if (!result.alreadyPlaced) {
        void markStanceTaken();
      }

      // Refresh affected caches. We invalidate at the top of each namespace so
      // every paginated/filtered variant gets refreshed in one call.
      if (opts?.marketSlug) {
        queryClient.invalidateQueries({
          queryKey: marketKeys.detail(opts.marketSlug),
        });
      }
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
      queryClient.invalidateQueries({ queryKey: betKeys.all });
      // Keep /me in sync at next foreground / explicit refresh — wallet is
      // already updated locally, so we don't force a refetch here.
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });

  const reset = useCallback(() => mutation.reset(), [mutation]);

  return {
    placeBet: mutation.mutateAsync,
    isPlacing: mutation.isPending,
    error: mutation.error ?? null,
    result: mutation.data ?? null,
    reset,
  };
}

