// features/deposits/index.ts
export {
  useInitiateDeposit,
  useDepositStatusPolling,
  extractDepositError,
  POLL_INTERVAL_MS,
  POLL_MAX_ATTEMPTS,
} from './hooks/use-deposit';
export {
  depositsApi,
  DEPOSIT_MIN_KOBO,
  DEPOSIT_MAX_KOBO,
  isTerminalDepositStatus,
  sanitizeNairaInput,
  nairaTextToKoboString,
  compareKobo,
  type DepositStatus,
  type DepositStatusResponse,
  type InitiateDepositPayload,
  type InitiateDepositResult,
} from './api/deposits-api';
export {
  default as depositReducer,
  depositInitiating,
  depositSessionStarted,
  depositCompleted,
  depositFailed,
  depositCancelled,
  resetDepositFlow,
  isTerminalFlowStatus,
  isResumableFlowStatus,
  type DepositFlowStatus,
  type DepositState,
} from './store/deposit-slice';
