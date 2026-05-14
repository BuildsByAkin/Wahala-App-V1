// features/deposits/hooks/use-deposit.ts
//
// Two-phase Stripe deposit flow:
//
//   1. useInitiateDeposit — POST /deposits/initiate, returns { checkoutUrl,
//      sessionId }. The caller opens checkoutUrl in expo-web-browser's
//      AuthSession sheet so the Stripe redirect (wahala://deposit/success)
//      auto-closes the sheet.
//
//   2. useDepositStatusPolling — GET /deposits/:sessionId on a bounded
//      setInterval (POLL_INTERVAL_MS × POLL_MAX_ATTEMPTS). Polling is a
//      simple interval (not recursive refetch) so cleanup on unmount is
//      trivially correct. The response is cached via TanStack Query so the
//      rest of the app (and other panes) can read the same data.
//
// On a `completed` status the hook invalidates ['me'] so the wallet balance
// refreshes everywhere, plus the deposits list key for any future list view.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authKeys } from '@/features/auth';
import { extractApiError } from '@/lib/api/axios';
import { depositKeys } from '@/lib/api/query-keys';
import {
  depositsApi,
  isTerminalDepositStatus,
  type DepositStatusResponse,
  type InitiateDepositPayload,
  type InitiateDepositResult,
} from '@/features/deposits/api/deposits-api';

export const POLL_INTERVAL_MS = 2_000;
export const POLL_MAX_ATTEMPTS = 10;

export function useInitiateDeposit() {
  return useMutation<InitiateDepositResult, Error, InitiateDepositPayload>({
    mutationFn: (vars) => depositsApi.initiate(vars),
  });
}

type PollOpts = {
  sessionId: string | undefined;
  enabled?: boolean;
  // Fired the first time we see a terminal status come back from the server.
  onTerminal?: (status: DepositStatusResponse) => void;
  // Fired when the bounded poll budget is exhausted without a terminal status.
  onTimeout?: () => void;
};

/**
 * Bounded polling for a single Stripe Checkout session.
 *
 * Implementation notes:
 *  - The query is cached in TanStack Query at depositKeys.status(sessionId)
 *    with staleTime: 0 so any consumer always reads fresh data.
 *  - Polling itself runs through a plain setInterval that we clean up on
 *    unmount, dependency change, terminal status, or budget exhaustion.
 *    This satisfies the spec's "simple interval with cleanup, not recursive"
 *    requirement and removes any chance of a leaked refetch loop.
 */
export function useDepositStatusPolling({
  sessionId,
  enabled = true,
  onTerminal,
  onTimeout,
}: PollOpts) {
  const queryClient = useQueryClient();
  const attemptsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedTerminalRef = useRef(false);
  const firedTimeoutRef = useRef(false);

  // Latest callbacks pinned in refs so the polling effect doesn't re-arm on
  // every parent re-render.
  const onTerminalRef = useRef(onTerminal);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTerminalRef.current = onTerminal;
  }, [onTerminal]);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const [attempts, setAttempts] = useState(0);

  const query = useQuery<DepositStatusResponse>({
    queryKey: depositKeys.status(sessionId),
    queryFn: () => depositsApi.getStatus(sessionId!),
    enabled: !!sessionId && enabled,
    staleTime: 0,
    gcTime: 60_000,
    // We drive polling ourselves — no refetchInterval.
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // React to terminal status from any source (manual refetch, initial fetch,
  // interval tick) and invalidate downstream caches.
  useEffect(() => {
    const data = query.data;
    if (!data) return;
    if (!isTerminalDepositStatus(data.status)) return;
    if (firedTerminalRef.current) return;
    firedTerminalRef.current = true;
    if (data.status === 'completed') {
      // Refresh wallet balance and any deposits list anywhere in the app.
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      queryClient.invalidateQueries({ queryKey: depositKeys.list() });
    }
    onTerminalRef.current?.(data);
  }, [query.data, queryClient]);

  // Reset internal poll bookkeeping whenever the sessionId changes.
  useEffect(() => {
    attemptsRef.current = 0;
    firedTerminalRef.current = false;
    firedTimeoutRef.current = false;
    setAttempts(0);
  }, [sessionId]);

  // The interval. Each tick increments the attempt counter and fires
  // refetch() — the response flows into the React Query cache normally.
  useEffect(() => {
    if (!enabled || !sessionId) return;
    const current = query.data;
    if (current && isTerminalDepositStatus(current.status)) return;

    intervalRef.current = setInterval(() => {
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      if (attemptsRef.current > POLL_MAX_ATTEMPTS) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (!firedTimeoutRef.current) {
          firedTimeoutRef.current = true;
          onTimeoutRef.current?.();
        }
        return;
      }
      void query.refetch();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // We intentionally re-arm the interval only when the inputs that should
    // start/stop polling change. `query.refetch` is stable per session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId, query.data?.status]);

  // Force an immediate refetch on demand — useful when returning from the
  // browser sheet so the user doesn't wait a full tick.
  const refetchNow = useCallback(() => {
    if (!sessionId) return;
    void query.refetch();
  }, [sessionId, query]);

  return {
    data: query.data,
    isError: query.isError,
    error: query.error,
    attempts,
    maxAttempts: POLL_MAX_ATTEMPTS,
    timedOut: attempts > POLL_MAX_ATTEMPTS,
    refetchNow,
  };
}

export function extractDepositError(err: unknown): string {
  return extractApiError(err).message;
}
