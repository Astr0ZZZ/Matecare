import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AnimatedLogo from '../../components/AnimatedLogo';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const { theme } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        // Pre-calentamiento táctico: avisamos al servidor para que empiece a calcular el Dashboard
        const apiBase = process.env.EXPO_PUBLIC_API_URL;
        fetch(`${apiBase}/api/dashboard/summary/${data.user.id}`).catch(() => {});
        // Dejamos que AuthGuard maneje la redirección
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el centro de mando.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const redirectTo = Linking.createURL('/');
      console.log('[AUTH] Redirecting to simplified URI:', redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo,
          skipBrowserRedirect: true,
        }
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        
        if (result.type === 'success' && result.url) {
          // Robust token extraction (handles both ?query and #hash fragments)
          const urlStr = result.url.replace('#', '?');
          const { queryParams } = Linking.parse(urlStr);
          
          const access_token = queryParams?.access_token;
          const refresh_token = queryParams?.refresh_token;

          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token: access_token as string,
              refresh_token: refresh_token as string,
            });
            
            // Pre-calentamiento táctico para Google
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const apiBase = process.env.EXPO_PUBLIC_API_URL;
              fetch(`${apiBase}/api/dashboard/summary/${user.id}`).catch(() => {});
            }
          } else {
            console.warn('[AUTH] No tokens found in redirect URL:', result.url);
          }
        }
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg('Error al conectar con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MotiView 
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 1000 }}
            style={styles.header}
          >
            <AnimatedLogo size={170} glowColor={theme.colors.glow} />
            <Text style={[styles.title, { color: theme.colors.accent }]}>MateCare</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Tu bienestar, en equilibrio</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 800, delay: 300 }}
          >
            <BlurView intensity={30} tint="dark" style={styles.card}>
              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : null}

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.accent }]}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="hola@matecare.com"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.accent }]}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, { backgroundColor: theme.colors.accent, shadowColor: theme.colors.accent }, loading && { opacity: 0.7 }]} 
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sincronizando...' : 'Iniciar Sesión'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textMuted }]}>O CONTINÚA CON</Text>
                <View style={[styles.dividerLine, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              </View>

              <TouchableOpacity 
                style={[styles.googleButton, { borderColor: 'rgba(255,255,255,0.1)' }]} 
                onPress={signInWithGoogle}
                disabled={loading}
              >
                <View style={styles.googleIconPlaceholder}>
                  <View style={[styles.googleDot, { backgroundColor: '#4285F4' }]} />
                  <View style={[styles.googleDot, { backgroundColor: '#EA4335' }]} />
                  <View style={[styles.googleDot, { backgroundColor: '#FBBC05' }]} />
                  <View style={[styles.googleDot, { backgroundColor: '#34A853' }]} />
                </View>
                <Text style={styles.googleButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>¿No tienes cuenta? <Text style={[styles.linkTextBold, { color: theme.colors.accent }]}>Regístrate</Text></Text>
              </TouchableOpacity>
            </BlurView>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  header: { alignItems: 'center', marginBottom: SPACING.xxl },
  title: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: 32, marginTop: -10 },
  subtitle: { fontFamily: TYPOGRAPHY.fontFamily.regular, fontSize: 16, marginTop: 5 },
  card: { padding: SPACING.xl, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'transparent' },
  inputContainer: { marginBottom: SPACING.lg },
  label: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: 14, marginBottom: 6, marginLeft: 4 },
  input: { fontFamily: TYPOGRAPHY.fontFamily.regular, backgroundColor: 'rgba(255,255,255,0.05)', height: 50, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, fontSize: 16, color: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  button: { height: 55, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.md, elevation: 5 },
  buttonText: { fontFamily: TYPOGRAPHY.fontFamily.bold, color: '#fff', fontSize: 18 },
  linkButton: { marginTop: SPACING.xl, alignItems: 'center' },
  linkText: { fontFamily: TYPOGRAPHY.fontFamily.regular, fontSize: 14 },
  linkTextBold: { fontFamily: TYPOGRAPHY.fontFamily.bold },
  errorText: { color: '#ff4444', fontFamily: TYPOGRAPHY.fontFamily.semiBold, fontSize: 12, textAlign: 'center', marginBottom: 10, backgroundColor: 'rgba(255,68,68,0.1)', padding: 8, borderRadius: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.xl },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: SPACING.md, fontSize: 10, fontFamily: TYPOGRAPHY.fontFamily.bold, letterSpacing: 1 },
  googleButton: { height: 55, borderRadius: RADIUS.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  googleButtonText: { fontFamily: TYPOGRAPHY.fontFamily.bold, color: '#fff', fontSize: 16, marginLeft: 12 },
  googleIconPlaceholder: { flexDirection: 'row', width: 20, flexWrap: 'wrap', gap: 2 },
  googleDot: { width: 8, height: 8, borderRadius: 4 },
});
