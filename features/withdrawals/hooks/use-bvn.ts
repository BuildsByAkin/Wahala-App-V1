// features/withdrawals/hooks/use-bvn.ts
//
// BVN status query + verify mutation. Once verified the flag is sticky, so a
// long staleTime is safe. We mirror `verified` into Redux so flow shape can be
// decided synchronously without hitting the network.
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { kycKeys } from '@/lib/api/query-keys';
import { useAppDispatch } from '@/store';
import {
  withdrawalsApi,
  type BvnStatus,
  type VerifyBvnResult,
} from '@/features/withdrawals/api/withdrawals-api';
import { setBvnVerified } from '@/features/withdrawals/store/withdrawal-slice';

export function useBvnStatus(options?: { enabled?: boolean }) {
  const dispatch = useAppDispatch();

  const query = useQuery<BvnStatus>({
    queryKey: kycKeys.bvn(),
    queryFn: () => withdrawalsApi.getBvnStatus(),
    staleTime: 600_000, // 10 min — once verified it stays verified
    gcTime: 60 * 60_000,
    enabled: options?.enabled ?? true,
  });

  // Mirror into Redux for synchronous flow-shape decisions.
  useEffect(() => {
    if (query.data) {
      dispatch(setBvnVerified(query.data.verified));
    }
  }, [query.data, dispatch]);

  return query;
}

export function useVerifyBvn() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();

  // NOTE: `bvn` is a sensitive 11-digit value. It is passed in, used to make
  // the request, and then released to GC by the caller — it must never end up
  // in any cached query data, log, or analytic event.
  return useMutation<VerifyBvnResult, Error, string>({
    mutationFn: (bvn) => withdrawalsApi.verifyBvn(bvn),
    onSuccess: (res) => {
      if (res.verified) {
        dispatch(setBvnVerified(true));
        qc.invalidateQueries({ queryKey: kycKeys.bvn() });
      }
    },
  });
}
