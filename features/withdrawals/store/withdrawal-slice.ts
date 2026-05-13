// features/withdrawals/store/withdrawal-slice.ts
//
// Withdrawal slice holds non-sensitive, durable UI state ONLY:
//   - selectedBankAccountId: which saved account the user picked last
//   - withdrawalHistory:     last seen list (mirrored from TanStack Query for
//                            instant render on cold start; the query is the
//                            source of truth)
//   - bvnVerified:           cached flag so we can decide flow shape without
//                            an extra round-trip
//
// Sensitive material (PIN, BVN digits) is NEVER stored here. Those live in
// component state and are wiped immediately after the corresponding API call.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Withdrawal } from '@/features/withdrawals/api/withdrawals-api';

export type WithdrawalState = {
  selectedBankAccountId: string | null;
  withdrawalHistory: Withdrawal[];
  bvnVerified: boolean;
};

const initialState: WithdrawalState = {
  selectedBankAccountId: null,
  withdrawalHistory: [],
  bvnVerified: false,
};

const withdrawalSlice = createSlice({
  name: 'withdrawal',
  initialState,
  reducers: {
    setSelectedBankAccountId: (
      state,
      action: PayloadAction<string | null>
    ) => {
      state.selectedBankAccountId = action.payload;
    },
    setWithdrawalHistory: (state, action: PayloadAction<Withdrawal[]>) => {
      state.withdrawalHistory = action.payload;
    },
    setBvnVerified: (state, action: PayloadAction<boolean>) => {
      state.bvnVerified = action.payload;
    },
    resetWithdrawalState: () => initialState,
  },
});

export const {
  setSelectedBankAccountId,
  setWithdrawalHistory,
  setBvnVerified,
  resetWithdrawalState,
} = withdrawalSlice.actions;

export default withdrawalSlice.reducer;
