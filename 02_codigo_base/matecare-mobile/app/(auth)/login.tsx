import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import AnimatedLogo from '../../components/AnimatedLogo';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

import { useTheme } from '../../context/ThemeContext';

export default function Login() {
  const { theme } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('guerrero@matecare.com');
  const [password, setPassword] = useState('MateCare2026!');
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
        router.replace('/(tabs)');
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el centro de mando.');
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
});
