// features/auth/hooks/use-auth.ts
import { useCallback } from 'react';

import {
  clearAuthError,
  completeSignup,
  fetchMe,
  loginWithPin,
  logout,
  requestOtp,
  updateDisplayName,
} from '@/features/auth/store/auth-slice';
import { normalizeNigerianPhone } from '@/lib/utils/phone';
import { useAppDispatch, useAppSelector } from '@/store';

export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);

  const sendOtp = useCallback(
    async (rawPhone: string) => {
      const phoneNumber = normalizeNigerianPhone(rawPhone);
      if (!phoneNumber) {
        return { ok: false as const, error: 'Enter a valid Nigerian phone number' };
      }
      const action = await dispatch(requestOtp({ phoneNumber }));
      if (requestOtp.rejected.match(action)) {
        return { ok: false as const, error: (action.payload as string) ?? 'Failed' };
      }
      return { ok: true as const, phoneNumber };
    },
    [dispatch]
  );

  const signup = useCallback(
    async (rawPhone: string, otp: string, pin: string) => {
      const phoneNumber = normalizeNigerianPhone(rawPhone);
      if (!phoneNumber) {
        return { ok: false as const, error: 'Enter a valid Nigerian phone number' };
      }
      const action = await dispatch(completeSignup({ phoneNumber, otp, pin }));
      if (completeSignup.rejected.match(action)) {
        return { ok: false as const, error: (action.payload as string) ?? 'Failed' };
      }
      return { ok: true as const };
    },
    [dispatch]
  );

  const login = useCallback(
    async (rawPhone: string, pin: string) => {
      const phoneNumber = normalizeNigerianPhone(rawPhone);
      if (!phoneNumber) {
        return { ok: false as const, error: 'Enter a valid Nigerian phone number' };
      }
      const action = await dispatch(loginWithPin({ phoneNumber, pin }));
      if (loginWithPin.rejected.match(action)) {
        return { ok: false as const, error: (action.payload as string) ?? 'Failed' };
      }
      return { ok: true as const };
    },
    [dispatch]
  );

  const setDisplayName = useCallback(
    async (displayName: string) => {
      const action = await dispatch(updateDisplayName({ displayName }));
      if (updateDisplayName.rejected.match(action)) {
        return { ok: false as const, error: (action.payload as string) ?? 'Failed' };
      }
      return { ok: true as const };
    },
    [dispatch]
  );

  const refreshMe = useCallback(() => dispatch(fetchMe()), [dispatch]);

  const signOut = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  return {
    ...auth,
    sendOtp,
    signup,
    login,
    setDisplayName,
    refreshMe,
    signOut,
    clearError,
  };
}
