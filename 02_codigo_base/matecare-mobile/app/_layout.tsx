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
    const { data: listener } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log(`[AUTH_GUARD] Event: ${event}, Session: ${!!currentSession}`);
      
      if (currentSession) {
        setSession(currentSession);
      } else {
        setSession(null);
        if (segments[0] !== '(auth)') {
          console.log('[AUTH_GUARD] No session, redirecting to login');
          router.replace('/(auth)/login');
        }
        setChecked(true);
      }
    });

    const initialize = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      console.log(`[AUTH_GUARD] Initial Session: ${!!initialSession}`);
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
      if (!session?.user?.id) return;
      console.log(`[AUTH_GUARD] Checking profile for: ${session.user.id}`);
      
      try {
        const profile = await apiFetch(`/profile/${session.user.id}`);
        const inOnboarding = segments[0] === '(onboarding)';
        const inTabs = segments[0] === '(tabs)';

        if (profile && !profile.error) {
          console.log('[AUTH_GUARD] Profile found');
          if (!inTabs) router.replace('/(tabs)');
        } else {
          console.log('[AUTH_GUARD] No profile found');
          if (!inOnboarding) router.replace('/(onboarding)/cycle-setup');
        }
      } catch (error) {
        console.error('[AUTH_GUARD] Profile check error:', error);
      } finally {
        setChecked(true);
      }
    };

    // ESTRATEGIA OPTIMISTA: Si hay sesión, dejamos pasar y validamos en segundo plano
    setChecked(true);
    checkProfile();
  }, [session?.id]); 

  if (!checked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#044422', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#CFAA3C" />
        <Text style={{ marginTop: 20, color: '#CFAA3C', fontFamily: 'OpenSans-Bold', letterSpacing: 2 }}>
          SINCRONIZANDO MATRIZ...
        </Text>
      </View>
    );
  }
  
  return <>{children}</>;
}

import { View, ActivityIndicator, Text } from 'react-native';

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
