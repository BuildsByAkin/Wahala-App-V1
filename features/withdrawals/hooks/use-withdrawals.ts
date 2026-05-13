// features/withdrawals/hooks/use-withdrawals.ts
//
// Three concerns wired together:
//   - useInitiateWithdrawal: mutation. Caller wipes PIN immediately after.
//   - useWithdrawalStatus:   bounded poll (3s × max 10 attempts) used only on
//                            the processing pane. Polling halts on any
//                            terminal status or when `enabled` flips false.
//   - useMyWithdrawals:      list, mirrored into Redux for cold-start render.
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_ATTEMPTS = 10;

type StatusOpts = {
  paymentTransactionId: string | undefined;
  enabled?: boolean;
  // Notified when the poll budget is exhausted — caller can flip to "pending"
  // result UI without ever marking the txn as failed.
  onTimeout?: () => void;
};

/**
 * Poll a single withdrawal until it reaches a terminal state OR until we've
 * burned through the attempt budget. The `attempts` counter is held inside
 * the React Query cache via `meta` so it survives refetches without leaking
 * via component refs.
 */
export function useWithdrawalStatus({
  paymentTransactionId,
  enabled = true,
  onTimeout,
}: StatusOpts) {
  const qc = useQueryClient();

  const query = useQuery<Withdrawal & { __attempts?: number }>({
    queryKey: withdrawalKeys.status(paymentTransactionId),
    queryFn: async () => {
      const result = await withdrawalsApi.getStatus(paymentTransactionId!);
      const prev = qc.getQueryData<{ __attempts?: number }>(
        withdrawalKeys.status(paymentTransactionId)
      );
      const attempts = (prev?.__attempts ?? 0) + 1;
      return { ...result, __attempts: attempts };
    },
    enabled: enabled && !!paymentTransactionId,
    staleTime: 0,
    gcTime: 30_000,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return POLL_INTERVAL_MS;
      if (data.status !== 'pending') return false;
      if ((data.__attempts ?? 0) >= POLL_MAX_ATTEMPTS) return false;
      return POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Surface timeout to the caller so the UI can advance to a "pending" result.
  useEffect(() => {
    if (!enabled) return;
    const data = query.data;
    if (
      data &&
      data.status === 'pending' &&
      (data.__attempts ?? 0) >= POLL_MAX_ATTEMPTS
    ) {
      onTimeout?.();
    }
  }, [enabled, query.data, onTimeout]);

  return query;
}

export function useMyWithdrawals(options?: { enabled?: boolean }) {
  const dispatch = useAppDispatch();

  const query = useQuery<Withdrawal[]>({
    queryKey: withdrawalKeys.list(),
    queryFn: () => withdrawalsApi.listMine(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
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
