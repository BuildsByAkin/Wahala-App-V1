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

import { useAuth } from '@/features/auth';
import { persistor, store } from '@/store';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop */
});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const first = segments[0] as string | undefined;
    // Allow the splash screen (app/index.tsx) to render briefly without redirecting.
    if (!first) return;

    const inAuthFlow = first === 'auth' || first === 'signup';

    if (!isAuthenticated && !inAuthFlow) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuthFlow) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, router]);

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
      </PersistGate>
    </Provider>
  );
}
