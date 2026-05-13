// features/auth/hooks/use-auth.ts
// Auth is split across two systems on purpose:
//   - TanStack Query owns the *network* (mutations for OTP/signup/login/updateMe
//     and the `useMe` query). This gives us request dedupe, retries, loading
//     state, and error handling without hand-rolling reducers per request.
//   - Redux owns the *materialized* session (token, userId, username, wallet)
//     so the rest of the app (axios interceptor, screens) can read sync values
//     and persist them via redux-persist + SecureStore.
//
// The `useAuth` hook is the single ergonomic entry point screens consume.
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  authApi,
  type MeResponse,
  type UpdateMePayload,
} from '@/features/auth/api/auth-api';
import {
  applyMe,
  logout,
  setAuthSession,
} from '@/features/auth/store/auth-slice';
import { extractApiError } from '@/lib/api/axios';
import { leaderboardKeys } from '@/lib/api/query-keys';
import { normalizeNigerianPhone } from '@/lib/utils/phone';
import { useAppDispatch, useAppSelector } from '@/store';

// Centralised key factory — exported so callers can invalidate from elsewhere.
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

type Ok = { ok: true };
type Err = { ok: false; error: string };
type Result<T = unknown> = (Ok & T) | Err;

function toErr(e: unknown): string {
  return extractApiError(e).message;
}

/**
 * Subscribes to /me. Disabled when not authenticated. Writes successful
 * responses back into the Redux slice so the rest of the app reads from the
 * same materialized state. `staleTime` is generous because /me only changes on
 * user-driven actions, and we explicitly invalidate after bets/profile edits.
 */
export function useMe(options?: { enabled?: boolean }) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return useQuery<MeResponse>({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const me = await authApi.getMe();
      // Mirror into Redux on every successful fetch.
      dispatch(applyMe(me));
      return me;
    },
    enabled: (options?.enabled ?? true) && isAuthenticated,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useAuth() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const auth = useAppSelector((s) => s.auth);

  // ── Mutations ────────────────────────────────────────────────────────────
  const otpMutation = useMutation({
    mutationFn: (phoneNumber: string) => authApi.requestOtp(phoneNumber),
  });

  const signupMutation = useMutation({
    mutationFn: (vars: { phoneNumber: string; otp: string; pin: string }) =>
      authApi.signupComplete(vars).then((res) => ({ ...res, phoneNumber: vars.phoneNumber })),
    onSuccess: (res) => {
      dispatch(
        setAuthSession({
          accessToken: res.accessToken,
          userId: res.userId,
          username: res.username,
          phoneNumber: res.phoneNumber,
        })
      );
      // Prime the /me cache; the next render will fetch fresh wallet balances.
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (vars: { phoneNumber: string; pin: string }) => {
      const res = await authApi.login(vars);
      // Seed the session BEFORE /me so the axios interceptor can attach
      // the bearer on the follow-up request.
      dispatch(
        setAuthSession({
          accessToken: res.accessToken,
          userId: res.userId,
          username: res.username,
          displayName: res.displayName,
          phoneNumber: vars.phoneNumber,
        })
      );
      const me = await authApi.getMe();
      dispatch(applyMe(me));
      // Seed the cache so the next mount of `useMe` doesn't refetch.
      queryClient.setQueryData(authKeys.me(), me);
      return { login: res, me };
    },
  });

  const updateMeMutation = useMutation({
    mutationFn: (payload: UpdateMePayload) => authApi.updateMe(payload),
    onSuccess: (me, vars) => {
      dispatch(applyMe(me));
      queryClient.setQueryData(authKeys.me(), me);
      // Toggling leaderboard visibility changes membership of /leaderboard,
      // so blow that cache away. Done unconditionally on opt-in changes
      // (cheap; the screen will refetch on next mount or focus).
      if (vars.leaderboardOptIn !== undefined) {
        queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
      }
    },
  });

  // ── Public API ───────────────────────────────────────────────────────────
  const sendOtp = useCallback(
    async (rawPhone: string): Promise<Result<{ phoneNumber: string }>> => {
      const phoneNumber = normalizeNigerianPhone(rawPhone);
      if (!phoneNumber) {
        return { ok: false, error: 'Enter a valid Nigerian phone number' };
      }
      try {
        await otpMutation.mutateAsync(phoneNumber);
        return { ok: true, phoneNumber };
      } catch (e) {
        return { ok: false, error: toErr(e) };
      }
    },
    [otpMutation]
  );

  const signup = useCallback(
    async (rawPhone: string, otp: string, pin: string): Promise<Result> => {
      const phoneNumber = normalizeNigerianPhone(rawPhone);
      if (!phoneNumber) {
        return { ok: false, error: 'Enter a valid Nigerian phone number' };
      }
      try {
        await signupMutation.mutateAsync({ phoneNumber, otp, pin });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: toErr(e) };
      }
    },
    [signupMutation]
  );

  const login = useCallback(
    async (rawPhone: string, pin: string): Promise<Result> => {
      const phoneNumber = normalizeNigerianPhone(rawPhone);
      if (!phoneNumber) {
        return { ok: false, error: 'Enter a valid Nigerian phone number' };
      }
      try {
        await loginMutation.mutateAsync({ phoneNumber, pin });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: toErr(e) };
      }
    },
    [loginMutation]
  );

  const setDisplayName = useCallback(
    async (displayName: string): Promise<Result> => {
      try {
        await updateMeMutation.mutateAsync({ displayName });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: toErr(e) };
      }
    },
    [updateMeMutation]
  );

  const setLeaderboardOptIn = useCallback(
    async (leaderboardOptIn: boolean): Promise<Result> => {
      try {
        await updateMeMutation.mutateAsync({ leaderboardOptIn });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: toErr(e) };
      }
    },
    [updateMeMutation]
  );

  const refreshMe = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: authKeys.me() });
  }, [queryClient]);

  const signOut = useCallback(() => {
    dispatch(logout());
    queryClient.removeQueries({ queryKey: authKeys.me() });
  }, [dispatch, queryClient]);

  // Loading + error surfaces are derived from whichever mutation is in flight.
  const isLoading =
    otpMutation.isPending ||
    signupMutation.isPending ||
    loginMutation.isPending ||
    updateMeMutation.isPending;

  const error =
    (loginMutation.error && toErr(loginMutation.error)) ||
    (signupMutation.error && toErr(signupMutation.error)) ||
    (otpMutation.error && toErr(otpMutation.error)) ||
    (updateMeMutation.error && toErr(updateMeMutation.error)) ||
    null;

  const clearError = useCallback(() => {
    otpMutation.reset();
    signupMutation.reset();
    loginMutation.reset();
    updateMeMutation.reset();
  }, [otpMutation, signupMutation, loginMutation, updateMeMutation]);

  return {
    ...auth,
    isLoading,
    error,
    sendOtp,
    signup,
    login,
    setDisplayName,
    setLeaderboardOptIn,
    refreshMe,
    signOut,
    clearError,
  };
}
