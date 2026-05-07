import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import AnimatedLogo from '../../components/AnimatedLogo';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

export default function Register() {
  const { theme } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        // En un flujo real, aquí podríamos esperar confirmación de email
        // Pero por ahora mandamos al login o directo al onboarding si Supabase auto-confirma
        router.replace('/(auth)/login');
      }
    } catch (err) {
      setErrorMsg('Error de conexión al intentar registrarte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient 
      colors={['#1A1A2E', '#16213E', theme.colors.primary]} 
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MotiView 
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            style={styles.header}
          >
            <AnimatedLogo size={140} glowColor="rgba(214, 152, 202, 0.4)" />
            <Text style={[styles.title, { color: '#D698CA' }]}>Nueva Cuenta</Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.6)' }]}>Únete a la élite de MateCare</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 40 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 800, delay: 300 }}
          >
            <BlurView intensity={40} tint="dark" style={[styles.card, { borderColor: 'rgba(214, 152, 202, 0.2)' }]}>
              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : null}

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: '#D698CA' }]}>Nombre Táctico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre completo"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={name}
                  onChangeText={setName}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: '#D698CA' }]}>Email Operativo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="hola@matecare.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: '#D698CA' }]}>Clave de Acceso</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, { backgroundColor: '#D698CA', shadowColor: '#D698CA' }, loading && { opacity: 0.7 }]} 
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sincronizando...' : 'Activar Cuenta'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkButton} onPress={() => router.replace('/(auth)/login')}>
                <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>¿Ya eres miembro? <Text style={[styles.linkTextBold, { color: '#D698CA' }]}>Inicia Sesión</Text></Text>
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
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  title: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: 28, marginTop: 10 },
  subtitle: { fontFamily: TYPOGRAPHY.fontFamily.regular, fontSize: 14, marginTop: 5 },
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
