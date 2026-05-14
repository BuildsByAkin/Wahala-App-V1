// features/deposits/store/deposit-slice.ts
//
// Tracks the in-flight Stripe Checkout session so the flow survives:
//   - app backgrounding while the user finishes payment on Stripe's page
//   - cold start after the OS kills the app while in the browser sheet
//
// `sessionId` + `amountKobo` are persisted via redux-persist (see
// store/index.ts whitelist). On deposit-screen mount, if `status` is
// non-terminal and a `sessionId` exists, the screen resumes polling instead
// of asking the user to start over.
//
// Sensitive material — there is none here. The Stripe checkoutUrl is NEVER
// stored: it can expire mid-session, and we generate a fresh one per attempt.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type DepositFlowStatus =
  | 'idle'
  | 'loading'      // POST /deposits/initiate in flight
  | 'processing'   // Stripe sheet is / was open, polling for terminal status
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DepositState = {
  sessionId: string | null;
  amountKobo: string | null;
  status: DepositFlowStatus;
  // Human-readable error surfaced from the API or flow logic.
  errorMessage: string | null;
};

const initialState: DepositState = {
  sessionId: null,
  amountKobo: null,
  status: 'idle',
  errorMessage: null,
};

const depositSlice = createSlice({
  name: 'deposit',
  initialState,
  reducers: {
    depositInitiating: (state, action: PayloadAction<{ amountKobo: string }>) => {
      state.status = 'loading';
      state.amountKobo = action.payload.amountKobo;
      state.sessionId = null;
      state.errorMessage = null;
    },
    depositSessionStarted: (
      state,
      action: PayloadAction<{ sessionId: string; amountKobo: string }>
    ) => {
      state.status = 'processing';
      state.sessionId = action.payload.sessionId;
      state.amountKobo = action.payload.amountKobo;
      state.errorMessage = null;
    },
    depositCompleted: (state) => {
      state.status = 'completed';
      state.errorMessage = null;
    },
    depositFailed: (
      state,
      action: PayloadAction<{ message: string | null }>
    ) => {
      state.status = 'failed';
      state.errorMessage = action.payload.message;
    },
    depositCancelled: (state) => {
      state.status = 'cancelled';
    },
    resetDepositFlow: () => initialState,
  },
});

export const {
  depositInitiating,
  depositSessionStarted,
  depositCompleted,
  depositFailed,
  depositCancelled,
  resetDepositFlow,
} = depositSlice.actions;

export default depositSlice.reducer;

export function isTerminalFlowStatus(status: DepositFlowStatus): boolean {
  return (
    status === 'completed' || status === 'failed' || status === 'cancelled'
  );
}

export function isResumableFlowStatus(status: DepositFlowStatus): boolean {
  // 'loading' is treated as resumable too: if the app died between initiate
  // and sessionStarted there is no sessionId, so the screen will just reset.
  return status === 'loading' || status === 'processing';
}
