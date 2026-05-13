// features/auth/index.ts
export { useAuth, useMe, authKeys } from './hooks/use-auth';
export { authApi } from './api/auth-api';
export type { MeResponse } from './api/auth-api';
export {
  default as authReducer,
  logout,
  setHydrated,
  setAuthSession,
  applyMe,
  applyWallet,
  type AuthState,
} from './store/auth-slice';
