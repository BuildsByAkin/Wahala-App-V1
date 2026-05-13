// store/index.ts
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';
import {
  TypedUseSelectorHook,
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector,
} from 'react-redux';

import authReducer, { logout } from '@/features/auth/store/auth-slice';
import withdrawalReducer from '@/features/withdrawals/store/withdrawal-slice';
import { injectLogoutAction, injectStore } from '@/lib/api/store-ref';
import { secureStorage } from '@/lib/storage/secure-storage';

const authPersistConfig = {
  key: 'auth',
  storage: secureStorage,
  whitelist: [
    'accessToken',
    'isAuthenticated',
    'userId',
    'username',
    'displayName',
    'phoneNumber',
    'walletAvailableKobo',
    'walletLockedKobo',
  ],
};

// Persist only non-sensitive UI prefs from the withdrawal slice. The history
// list is always re-hydrated from TanStack Query, but keeping the last value
// around lets the wallet screen render instantly on cold start.
const withdrawalPersistConfig = {
  key: 'withdrawal',
  storage: secureStorage,
  whitelist: ['selectedBankAccountId', 'bvnVerified', 'withdrawalHistory'],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  withdrawal: persistReducer(withdrawalPersistConfig, withdrawalReducer),
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches non-serializable internal actions; ignore them
        // to avoid flooding the console with warnings.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Wire the store + logout action into the axios layer (late binding to avoid
// circular imports between the store, slices, and the axios instance).
injectStore(store);
injectLogoutAction(() => logout());

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useReduxDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useReduxSelector;
