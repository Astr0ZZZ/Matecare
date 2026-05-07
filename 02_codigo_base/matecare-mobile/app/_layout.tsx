import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../services/api';

SplashScreen.preventAutoHideAsync();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // 1. Escuchar cambios de autenticación en tiempo real
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession) {
        // Solo redirigir si no estamos ya en auth
        if (segments[0] !== '(auth)') {
          router.replace('/(auth)/login');
        }
        setChecked(true);
      }
    });

    // 2. Verificación inicial de sesión
    const initialize = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      if (!initialSession) {
        if (segments[0] !== '(auth)') {
          router.replace('/(auth)/login');
        }
        setChecked(true);
      }
    };

    initialize();
    return () => listener.subscription.unsubscribe();
  }, []);

  // 3. Reaccionar a la sesión para validar perfil
  useEffect(() => {
    if (!session) return;

    const checkProfile = async () => {
      try {
        const profile = await apiFetch(`/profile/${session.user.id}`);
        const inOnboarding = segments[0] === '(onboarding)';
        const inTabs = segments[0] === '(tabs)';

        if (profile && !profile.error) {
          // Si tiene perfil, mandamos a tabs (si no está ya ahí)
          if (!inTabs) {
            router.replace('/(tabs)');
          }
        } else {
          // Si no tiene perfil, mandamos a onboarding
          if (!inOnboarding) {
            router.replace('/(onboarding)/cycle-setup');
          }
        }
      } catch (error) {
        // En caso de 404 o error de red, asumimos que falta perfil
        if (segments[0] !== '(onboarding)') {
          router.replace('/(onboarding)/cycle-setup');
        }
      } finally {
        setChecked(true);
      }
    };

    checkProfile();
  }, [session, segments[0]]); // Re-validar si cambia la sesión o el grupo de rutas

  if (!checked) return null;
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
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGuard>
    </ThemeProvider>
  );
}
