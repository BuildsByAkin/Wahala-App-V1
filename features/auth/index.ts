// features/auth/index.ts
export { useAuth } from './hooks/use-auth';
export { authApi } from './api/auth-api';
export type { MeResponse } from './api/auth-api';
export {
  default as authReducer,
  logout,
  clearAuthError,
  setHydrated,
  setAuthSession,
  applyMe,
  type AuthState,
} from './store/auth-slice';
