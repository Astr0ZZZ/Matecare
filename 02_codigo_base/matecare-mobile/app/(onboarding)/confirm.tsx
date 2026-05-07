import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { apiFetch } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function ConfirmOnboarding() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);

    const payload = {
      cycleLength: parseInt(params.cycleLength as string) || 28,
      periodDuration: parseInt(params.periodDuration as string) || 5,
      lastPeriodDate: params.lastPeriodDate,
      personalityType: params.personalityType,
      conflictStyle: params.conflictStyle,
      affectionStyle: params.affectionStyle,
      socialLevel: params.socialLevel || 'MEDIUM',
      privacyLevel: params.privacyLevel || 'MODERATE',
      // Nuevos campos para MBTI y perfil enriquecido
      thinkingStyle: params.thinkingStyle,
      decisionStyle: params.decisionStyle,
      planningStyle: params.planningStyle,
      attachmentStyle: params.attachmentStyle,
      preferredPlans: params.preferredPlans,
      musicMood: params.musicMood,
      stressedNeeds: params.stressedNeeds,
    };

    try {
      await apiFetch('/profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Fallo en la Matriz', error.message || 'No se pudo crear el perfil táctico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <MotiView from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.accent, fontFamily: theme.typography.titleFont }]}>Sincronización</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>Valida los datos de la cruzada antes de iniciar.</Text>
        </MotiView>

        <ScrollView contentContainerStyle={styles.content}>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.summaryTitle, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>PERFIL TÁCTICO</Text>
            
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>CICLO BIOLÓGICO</Text>
              <Text style={[styles.value, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>{params.cycleLength} DÍAS</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>FASE MENSTRUAL</Text>
              <Text style={[styles.value, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>{params.periodDuration} DÍAS</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>ARQUETIPO</Text>
              <Text style={[styles.value, { color: theme.colors.text, fontFamily: theme.typography.boldFont }]}>{params.personalityType}</Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>LENGUAJE</Text>
              <Text style={[styles.value, { color: theme.colors.text, fontFamily: theme.typography.boldFont }]}>{params.affectionStyle}</Text>
            </View>
          </MotiView>

          <TouchableOpacity 
            style={[styles.finishButton, { shadowColor: theme.colors.accent }]}
            onPress={handleFinish}
            disabled={loading}
          >
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.accent]}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={[styles.finishButtonText, { fontFamily: theme.typography.boldFont }]}>INICIAR CRUZADA TÁCTICA</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 30, paddingHorizontal: SPACING.lg, marginTop: 20 },
  headerTitle: { fontSize: 32, marginBottom: 8, letterSpacing: 1 },
  headerSubtitle: { fontSize: 14, fontWeight: '600' },
  content: { padding: SPACING.lg },
  summaryCard: { borderRadius: 24, padding: 24, borderWidth: 1, elevation: 4 },
  summaryTitle: { fontSize: 12, marginBottom: 20, letterSpacing: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  label: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  value: { fontSize: 13 },
  divider: { height: 1, marginVertical: 16, opacity: 0.5 },
  finishButton: { borderRadius: 20, overflow: 'hidden', marginTop: 30, elevation: 8, shadowOpacity: 0.4, shadowRadius: 10 },
  gradientButton: { padding: 20, alignItems: 'center' },
  finishButtonText: { color: '#000', fontSize: 15, letterSpacing: 2 },
});
