// features/realtime/hooks/use-user-stream.ts
// Subscribes to /me/stream — currently just wallet updates per BACKEND.md §3.
// Patches the redux auth slice in place (no /me refetch needed).
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { applyWallet } from '@/features/auth';
import { authKeys } from '@/features/auth/hooks/use-auth';
import { openSseStream } from '@/lib/api/sse';
import { useAppDispatch, useAppSelector } from '@/store';
import type { MeResponse } from '@/features/auth/api/auth-api';

type WalletUpdateEvent = {
  userId: string;
  availableKobo: string;
  lockedKobo: string;
};

export function useUserStream() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const conn = openSseStream('/me/stream', {
      on: {
        'wallet.update': ({ data }) => {
          const evt = data as WalletUpdateEvent | null;
          if (!evt) return;
          dispatch(
            applyWallet({
              availableKobo: evt.availableKobo,
              lockedKobo: evt.lockedKobo,
            })
          );
          // Mirror into the /me cache so a screen reading from React Query
          // sees the same balance.
          queryClient.setQueryData<MeResponse | undefined>(
            authKeys.me(),
            (prev) =>
              prev
                ? {
                    ...prev,
                    wallet: {
                      availableKobo: evt.availableKobo,
                      lockedKobo: evt.lockedKobo,
                    },
                  }
                : prev
          );
        },
      },
    });

    return () => conn.close();
  }, [isAuthenticated, accessToken, dispatch, queryClient]);
}
