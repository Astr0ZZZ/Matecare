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
import { NotificationManager } from '../components/NotificationManager';

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

  useEffect(() => {
    if (!session) {
      setProfileLoaded(false);
      setNeedsOnboarding(false);
    }
  }, [session]);

  useEffect(() => {
    if (loading || !isLoaded) return;

    if (session && !profileLoaded) {
      console.log('[AuthGuard] Verificando perfil en servidor...');
      apiFetch('/profile')
        .then(() => {
          console.log('[AuthGuard] Perfil encontrado.');
          setNeedsOnboarding(false);
          setProfileLoaded(true);
        })
        .catch((err) => {
          const isNotFound = err.message?.includes('404') || err.message?.includes('not found');
          console.log('[AuthGuard] Error al cargar perfil:', err.message, '¿Es 404?', isNotFound);
          
          if (isNotFound) {
            setNeedsOnboarding(true);
            setProfileLoaded(true);
          } else {
            // Si es otro error (ej: 401, 500), no marcamos como cargado para reintentar
            // o simplemente esperamos a que la sesión se estabilice.
            console.warn('[AuthGuard] Error no crítico, esperando...');
          }
        });
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    const isWrongRoute = (!session && !inAuthGroup) || 
                       (session && profileLoaded && needsOnboarding && !inOnboardingGroup) ||
                       (session && profileLoaded && !needsOnboarding && inAuthGroup);

    // Evitar redirecciones infinitas o prematuras
    if (loading || !isLoaded || isTransitioning) {
      console.log('[AuthGuard] Cargando o transicionando, esperando...');
      return;
    }

    if (!session) {
      if (!inAuthGroup) {
        console.log('[AuthGuard] Redirigiendo a login (Sin sesión activa)');
        router.replace('/(auth)/login');
      }
    } 
    else if (profileLoaded) {
      if (needsOnboarding && !inOnboardingGroup) {
        console.log('[AuthGuard] Redirigiendo a onboarding (Perfil pendiente)');
        router.replace('/(onboarding)/cycle-setup');
      } else if (!needsOnboarding && inAuthGroup) {
        console.log('[AuthGuard] Redirigiendo a dashboard (Todo OK)');
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, segments, isLoaded, profileLoaded, needsOnboarding]);

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboardingGroup = segments[0] === '(onboarding)';
  const isTransitioning = session && !profileLoaded;
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
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <NotificationManager>
              <AuthGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(onboarding)" />
                  <Stack.Screen name="(tabs)" />
                </Stack>
              </AuthGuard>
            </NotificationManager>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
