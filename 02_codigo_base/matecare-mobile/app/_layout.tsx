import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { apiFetch } from '../services/api';
import * as Notifications from 'expo-notifications';
import { LogBox } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../context/ToastContext';

// Silenciar advertencia de notificaciones en Expo Go
LogBox.ignoreLogs(['expo-notifications', 'remote notifications']);



SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { theme, isLoaded } = useTheme();
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Resetear estados al cerrar sesión
  useEffect(() => {
    if (!session) {
      setProfileLoaded(false);
      setNeedsOnboarding(false);
    }
  }, [session]);

  useEffect(() => {
    if (loading || !isLoaded) return;

    // Si hay sesión pero no hemos verificado el perfil, lo hacemos
    if (session && !profileLoaded) {
      apiFetch('/profile')
        .then(() => {
          setNeedsOnboarding(false);
          setProfileLoaded(true);
        })
        .catch((err) => {
          console.log('[AuthGuard] Perfil no encontrado o error:', err.message);
          setNeedsOnboarding(true);
          setProfileLoaded(true);
        });
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    // Caso 1: No hay sesión y no estamos en auth -> Ir a login
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } 
    // Caso 2: Hay sesión y ya verificamos el perfil
    else if (session && profileLoaded) {
      if (needsOnboarding && !inOnboardingGroup) {
        // Logueado pero sin perfil -> Onboarding
        router.replace('/(onboarding)/cycle-setup');
      } else if (!needsOnboarding && inAuthGroup) {
        // Logueado con perfil -> Dashboard (si está en login)
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, segments, isLoaded, profileLoaded, needsOnboarding]);

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboardingGroup = segments[0] === '(onboarding)';
  const isTransitioning = session && !profileLoaded;
  
  // Bloqueo visual durante la verificación
  const isWrongRoute = (!session && !inAuthGroup) || 
                       (session && profileLoaded && needsOnboarding && !inOnboardingGroup) ||
                       (session && profileLoaded && !needsOnboarding && inAuthGroup);

  if (loading || !isLoaded || isTransitioning || isWrongRoute) {
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
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      } as any),
    });

    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  console.log('[RootLayout] Renderizando...', { loaded, error });
  if (!loaded && !error) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AuthGuard>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </AuthGuard>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

