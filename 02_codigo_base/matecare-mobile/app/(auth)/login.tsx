import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import AnimatedLogo from '../../components/AnimatedLogo';
import { SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function Login() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.replace('/(tabs)');
    } catch (error: any) {
      setErrorMsg(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient 
      colors={[theme.colors.background, theme.colors.backgroundSecondary || theme.colors.primary, theme.colors.background]} 
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Decorative elements */}
          <View style={[styles.decorCircle1, { backgroundColor: theme.colors.glow }]} pointerEvents="none" />
          <View style={[styles.decorCircle2, { backgroundColor: theme.colors.accent }]} pointerEvents="none" />
          
          <MotiView 
            from={{ opacity: 0, translateY: -30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15, delay: 100 }}
            style={styles.header}
          >
            <AnimatedLogo size={140} glowColor={theme.colors.glowStrong || theme.colors.glow} />
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>MateCare</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Tu bienestar, en equilibrio</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15, delay: 200 }}
          >
            <View style={[
              styles.card, 
              { 
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadows?.medium || '#000',
                ...SHADOWS.lg
              }
            ]}>
              <BlurView intensity={theme.visuals.material.blurIntensity} tint="dark" style={styles.cardBlur}>
                {/* Welcome message */}
                <View style={styles.welcomeSection}>
                  <Text style={[styles.welcomeTitle, { color: theme.colors.text, fontFamily: theme.typography.boldFont }]}>
                    Bienvenido de vuelta
                  </Text>
                  <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSubtle || theme.colors.textMuted }]}>
                    Ingresa tus credenciales para continuar
                  </Text>
                </View>

                {errorMsg ? (
                  <MotiView 
                    from={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    style={[styles.errorBox, { backgroundColor: `${theme.colors.error || '#FF4444'}15`, borderColor: `${theme.colors.error || '#FF4444'}30` }]}
                  >
                    <Ionicons name="warning-outline" size={16} color={theme.colors.error || '#FF4444'} />
                    <Text style={[styles.errorText, { color: theme.colors.error || '#FF4444' }]}>{errorMsg}</Text>
                  </MotiView>
                ) : null}

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>Email</Text>
                  <View style={[styles.inputWrapper, { borderColor: theme.colors.borderSubtle || theme.colors.border, backgroundColor: theme.colors.cardElevated || 'rgba(255,255,255,0.03)' }]}>
                    <Ionicons name="mail-outline" size={18} color={theme.colors.textSubtle || theme.colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="hola@matecare.com"
                      placeholderTextColor={theme.colors.textSubtle || 'rgba(255,255,255,0.3)'}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!loading}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.textMuted }]}>Contraseña</Text>
                  <View style={[styles.inputWrapper, { borderColor: theme.colors.borderSubtle || theme.colors.border, backgroundColor: theme.colors.cardElevated || 'rgba(255,255,255,0.03)' }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSubtle || theme.colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="Tu contraseña"
                      placeholderTextColor={theme.colors.textSubtle || 'rgba(255,255,255,0.3)'}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.button, 
                    { 
                      backgroundColor: theme.colors.accent, 
                      shadowColor: theme.colors.shadows?.glow || theme.colors.accent,
                      ...SHADOWS.glow
                    }, 
                    loading && { opacity: 0.7 }
                  ]} 
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <Ionicons name="sync" size={18} color={theme.colors.background} style={styles.loadingIcon} />
                      <Text style={[styles.buttonText, { color: theme.colors.background }]}>Sincronizando...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={[styles.buttonText, { color: theme.colors.background }]}>Iniciar Sesión</Text>
                      <Ionicons name="arrow-forward" size={18} color={theme.colors.background} style={styles.buttonIcon} />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.borderSubtle || theme.colors.border }]} />
                  <Text style={[styles.dividerText, { color: theme.colors.textSubtle || theme.colors.textMuted }]}>o</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.borderSubtle || theme.colors.border }]} />
                </View>

                <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
                  <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>
                    ¿No tienes cuenta? <Text style={[styles.linkTextBold, { color: theme.colors.accent }]}>Regístrate</Text>
                  </Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          </MotiView>

          {/* Footer */}
          <MotiView 
            from={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 500 }}
            style={styles.footer}
          >
            <Text style={[styles.footerText, { color: theme.colors.textSubtle || theme.colors.textMuted }]}>
              Protegido con encriptación de extremo a extremo
            </Text>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  content: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  decorCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.08,
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.05,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: SPACING.xl 
  },
  title: { 
    fontSize: 36, 
    marginTop: SPACING.sm,
    letterSpacing: -1,
  },
  subtitle: { 
    fontFamily: TYPOGRAPHY.fontFamily.regular, 
    fontSize: 15, 
    marginTop: SPACING.xs,
    letterSpacing: 0.5,
  },
  card: { 
    borderRadius: RADIUS.xl, 
    overflow: 'hidden', 
    borderWidth: 1,
  },
  cardBlur: {
    padding: SPACING.xl,
  },
  welcomeSection: {
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  errorText: { 
    fontFamily: TYPOGRAPHY.fontFamily.semiBold, 
    fontSize: 13, 
    marginLeft: SPACING.sm,
    flex: 1,
  },
  inputContainer: { 
    marginBottom: SPACING.md 
  },
  label: { 
    fontFamily: TYPOGRAPHY.fontFamily.semiBold, 
    fontSize: 13, 
    marginBottom: SPACING.xs, 
    marginLeft: SPACING.xs,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: { 
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamily.regular, 
    fontSize: 16, 
    height: '100%',
  },
  button: { 
    height: 54, 
    borderRadius: RADIUS.md, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: SPACING.lg,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: { 
    fontFamily: TYPOGRAPHY.fontFamily.bold, 
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: SPACING.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingIcon: {
    marginRight: SPACING.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: SPACING.md,
    fontSize: 13,
  },
  linkButton: { 
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  linkText: { 
    fontFamily: TYPOGRAPHY.fontFamily.regular, 
    fontSize: 14 
  },
  linkTextBold: { 
    fontFamily: TYPOGRAPHY.fontFamily.bold 
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
