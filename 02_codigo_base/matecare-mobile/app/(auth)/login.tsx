import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import AnimatedLogo from '../../components/AnimatedLogo';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Por ahora, navegación directa a las pestañas para que puedas "avanzar"
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient colors={[COLORS.light.bgPrimary, '#E8F0E8']} style={styles.container}>
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
            <AnimatedLogo />
            <Text style={styles.title}>MateCare</Text>
            <Text style={styles.subtitle}>Tu bienestar, en equilibrio</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 800, delay: 300 }}
          >
            <BlurView intensity={80} tint="light" style={styles.card}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="hola@matecare.com"
                  placeholderTextColor={COLORS.light.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.light.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.linkText}>¿No tienes cuenta? <Text style={styles.linkTextBold}>Regístrate</Text></Text>
              </TouchableOpacity>
            </BlurView>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: 32,
    color: COLORS.light.greenDark,
    marginTop: -10,
  },
  subtitle: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: 16,
    color: COLORS.light.textMuted,
    marginTop: 5,
  },
  card: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: 14,
    color: COLORS.light.greenDark,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    backgroundColor: 'rgba(255,255,255,0.8)',
    height: 50,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: COLORS.light.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(26,83,26,0.1)',
  },
  button: {
    backgroundColor: COLORS.light.greenDark,
    height: 55,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.light.greenDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: '#fff',
    fontSize: 18,
  },
  linkButton: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  linkText: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.light.textMuted,
    fontSize: 14,
  },
  linkTextBold: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.light.greenDark,
  },
});
