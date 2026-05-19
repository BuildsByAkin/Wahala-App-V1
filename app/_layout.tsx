// app/_layout.tsx
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { setHydrated } from '@/features/auth';
import { useUserStream } from '@/features/realtime/hooks/use-user-stream';
import { useCategories } from '@/features/categories/hooks/use-categories';
import { ToastProvider } from '@/hooks/useToast';
import { persistor, store, useAppDispatch, useAppSelector } from '@/store';

// Singleton query client tuned for a mobile betting app:
//   - retry once on transient failures (mutations never auto-retry)
//   - refetch on reconnect (Wi-Fi → mobile transitions are common)
//   - generous staleTime so screen mounts don't refetch the world
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 30_000,
      // gcTime must be >= persister maxAge or restored entries get GC'd immediately.
      gcTime: 24 * 60 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Cold-start cache: persist only roots whose data is safe to splash from disk
// (catalogue + identity). Money-sensitive caches — bets, wallet, withdrawals,
// deposits — are intentionally excluded; they always refetch from the server.
const PERSISTED_ROOTS = new Set<string>([
  'markets',
  'daily-wahala',
  'leaderboard',
  'auth',
  'categories',
]);

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'wahala-query-cache-v1',
  throttleTime: 1_000,
});

const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 24 * 60 * 60_000,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) => {
      const root = query.queryKey[0];
      return typeof root === 'string' && PERSISTED_ROOTS.has(root);
    },
  },
};

SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop */
});

// ── Global crash logger ────────────────────────────────────────────────────
// Logs every uncaught JS exception with full stack to the Metro console so we
// can see what's blowing up the market detail screen.
type RNErrorUtils = {
  getGlobalHandler?: () => (e: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (h: (e: unknown, isFatal?: boolean) => void) => void;
};
const __errorUtils = (globalThis as unknown as { ErrorUtils?: RNErrorUtils }).ErrorUtils;
const __prevHandler = __errorUtils?.getGlobalHandler?.();
__errorUtils?.setGlobalHandler?.((error, isFatal) => {
  const e = error as Error | undefined;
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[GLOBAL] ${isFatal ? 'FATAL ' : ''}JS error: ${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`);
  if (e?.stack) console.log('[GLOBAL] stack:\n' + e.stack);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  __prevHandler?.(error, isFatal);
});

if (typeof (globalThis as { addEventListener?: unknown }).addEventListener === 'function') {
  (globalThis as unknown as { addEventListener: (ev: string, cb: (e: { reason?: unknown }) => void) => void }).addEventListener(
    'unhandledrejection',
    (event) => {
      const r = event?.reason as Error | undefined;
      console.log('[GLOBAL] unhandled promise rejection:', r?.message ?? String(event?.reason));
      if (r?.stack) console.log('[GLOBAL] stack:\n' + r.stack);
    },
  );
}



function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const hydrated = useAppSelector((s) => s.auth.hydrated);

  // PersistGate's onBeforeLift runs *before* this tree mounts, so by the time
  // we get here the rehydrate has completed. Flip the slice flag once.
  useEffect(() => {
    if (!hydrated) dispatch(setHydrated(true));
  }, [hydrated, dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    const first = segments[0] as string | undefined;
    // The splash screen (app/index.tsx) handles its own redirect; don't fight it.
    if (!first) return;

    const inAuthFlow = first === 'auth' || first === 'signup';

    if (!isAuthenticated && !inAuthFlow) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuthFlow) {
      router.replace('/(tabs)');
    }
  }, [hydrated, isAuthenticated, segments, router]);

  return null;
}

/**
 * Mounted once at the root once we have an authenticated session. Opens the
 * SSE channel to /me/stream so wallet balances live-update without waiting
 * for a foreground refetch. BACKEND.md §3.
 */
function RealtimeBridge() {
  useUserStream();
  return null;
}

/**
 * Primes the category taxonomy cache (BACKEND.md §1) once on cold-start so
 * every feed card has the server-denormalized colour triplet available
 * synchronously by the time the home screen mounts.
 */
function CategoryPrimer() {
  useCategories();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Caveat_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.warn('[fonts] failed to load', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={persistOptions}
          >
            <SafeAreaProvider>
              <ToastProvider>
                <AuthGate />
                <RealtimeBridge />
                <CategoryPrimer />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#070707' },
                    animation: 'fade',
                  }}
                />
              </ToastProvider>
            </SafeAreaProvider>
          </PersistQueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}
