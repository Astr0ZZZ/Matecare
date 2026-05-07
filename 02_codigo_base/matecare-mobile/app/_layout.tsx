import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { theme, isLoaded } = useTheme();

  useEffect(() => {
    if (loading || !isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, isLoaded]);

  const inAuthGroup = segments[0] === '(auth)';
  const isWrongRoute = (session && inAuthGroup) || (!session && !inAuthGroup);

  if (loading || !isLoaded || isWrongRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: isLoaded ? theme.colors.background : '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={isLoaded ? theme.colors.accent : '#FFF'} />
      </View>
    );
  }

  return <>{children}</>;
}


export default function RootLayout() {
  const [loaded, error] = useFonts({
    'OpenSans-Regular': OpenSans_400Regular,
    'OpenSans-SemiBold': OpenSans_600SemiBold,
    'OpenSans-Bold': OpenSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}

