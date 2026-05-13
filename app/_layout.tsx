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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { setHydrated } from '@/features/auth';
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
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop */
});

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
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AuthGate />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0A0A0A' },
                animation: 'fade',
              }}
            />
          </SafeAreaProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
