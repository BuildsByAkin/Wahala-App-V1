// features/withdrawals/hooks/use-withdrawals.ts
//
// Three concerns wired together:
//   - useInitiateWithdrawal:       mutation. Caller wipes PIN immediately after.
//   - useWithdrawalStatusOnce:     ONE delayed GET /withdrawals/:id ~5s after
//                                  initiation. Withdrawals are now processed
//                                  manually within a 4-hour SLA, so polling
//                                  doesn't make sense — we just confirm the
//                                  txn was accepted (almost always `pending`)
//                                  and move to the result screen.
//   - useMyWithdrawals:            list, mirrored into Redux for cold-start render.
import { useEffect, useRef } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { extractApiError } from '@/lib/api/axios';
import { withdrawalKeys } from '@/lib/api/query-keys';
import { useAppDispatch } from '@/store';
import {
  withdrawalsApi,
  type InitiateWithdrawalPayload,
  type InitiateWithdrawalResult,
  type Withdrawal,
} from '@/features/withdrawals/api/withdrawals-api';
import { setWithdrawalHistory } from '@/features/withdrawals/store/withdrawal-slice';

export function useInitiateWithdrawal() {
  const qc = useQueryClient();

  return useMutation<
    InitiateWithdrawalResult,
    Error,
    InitiateWithdrawalPayload
  >({
    // The caller MUST clear the PIN from its local state inside `onSettled`
    // (or right after `mutateAsync`), regardless of outcome — see the sheet
    // component for the wipe.
    mutationFn: (vars) => withdrawalsApi.initiate(vars),
    onSuccess: () => {
      // Fresh list will include the new pending row.
      qc.invalidateQueries({ queryKey: withdrawalKeys.list() });
    },
  });
}

const STATUS_CHECK_DELAY_MS = 5_000;

type StatusOnceOpts = {
  paymentTransactionId: string | undefined;
  enabled: boolean;
  delayMs?: number;
  // Invoked once with the fetched record, or with `null` if the request
  // failed. Caller advances the UI to the result pane regardless of outcome.
  onSettled: (record: Withdrawal | null) => void;
};

/**
 * Fire EXACTLY ONE status check ~5s after initiation, then call `onSettled`.
 * No polling, no retries on a schedule — the txn lives in the backend's
 * manual-processing queue and resolves out-of-band over the next 4 hours.
 *
 * Cleans up its `setTimeout` and ignores late responses if the component
 * unmounts or `enabled` flips false before the request resolves.
 */
export function useWithdrawalStatusOnce({
  paymentTransactionId,
  enabled,
  delayMs = STATUS_CHECK_DELAY_MS,
  onSettled,
}: StatusOnceOpts) {
  const qc = useQueryClient();
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    if (!enabled || !paymentTransactionId) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await withdrawalsApi.getStatus(paymentTransactionId);
        if (cancelled) return;
        // Prime the cache so the result pane reads the same shape regardless
        // of whether data came from this check or a synchronous failure.
        qc.setQueryData(withdrawalKeys.status(paymentTransactionId), data);
        settledRef.current(data);
      } catch {
        if (cancelled) return;
        settledRef.current(null);
      }
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, paymentTransactionId, delayMs, qc]);
}

// How often to refetch the list while at least one withdrawal is still in a
// non-terminal state (pending | processing). Bounded by foreground only —
// the moment the app backgrounds, polling stops.
const PENDING_REFETCH_INTERVAL_MS = 30_000;

export function useMyWithdrawals(options?: { enabled?: boolean }) {
  const dispatch = useAppDispatch();

  const query = useQuery<Withdrawal[]>({
    queryKey: withdrawalKeys.list(),
    queryFn: () => withdrawalsApi.listMine(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
    // Quietly refresh every 30s ONLY when there is at least one row the admin
    // could still flip. Returns false (no interval) on first load (data
    // undefined) and the moment everything reaches a terminal state.
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data || data.length === 0) return false;
      const hasPending = data.some(
        (w) => w.status === 'pending' || w.status === 'processing'
      );
      return hasPending ? PENDING_REFETCH_INTERVAL_MS : false;
    },
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (query.data) {
      dispatch(setWithdrawalHistory(query.data));
    }
  }, [query.data, dispatch]);

  return query;
}

export function extractWithdrawalError(err: unknown): string {
  return extractApiError(err).message;
}
