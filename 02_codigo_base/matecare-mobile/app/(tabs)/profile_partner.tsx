import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function PartnerDetails() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiFetch('/profile')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const mbti = data?.mbti;
  const prefs = mbti?.preferences || {};

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
            PERFIL DE PERSONALIDAD
          </Text>

          {/* MBTI Card */}
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.accent }]}>TIPO MBTI</Text>
            <Text style={[styles.mbtiText, { color: theme.colors.text }]}>{mbti?.mbtiType || 'PENDIENTE'}</Text>
            <Text style={[styles.bodyText, { color: theme.colors.textMuted }]}>
              Estilo de apego: <Text style={{ color: theme.colors.text }}>{mbti?.attachmentStyle || 'No definido'}</Text>
            </Text>
          </View>

          {/* Vision Calibration Info */}
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.accent }]}>RASGOS DETECTADOS (VISIÓN)</Text>
            <View style={styles.traitRow}>
              <Ionicons name="shirt" size={16} color={theme.colors.accent} />
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>Estilo: {prefs.detectedStyle || 'No calibrado'}</Text>
            </View>
            <View style={styles.traitRow}>
              <Ionicons name="color-palette" size={16} color={theme.colors.accent} />
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>Tono preferido: {prefs.clothingTone || 'No calibrado'}</Text>
            </View>
            <View style={styles.traitRow}>
              <Ionicons name="calendar" size={16} color={theme.colors.accent} />
              <Text style={[styles.bodyText, { color: theme.colors.text }]}>Edad estimada: {prefs.estimatedAge || 'N/A'}</Text>
            </View>
          </View>

          {/* Preferences Info */}
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.accent }]}>PREFERENCIAS GENERALES</Text>
            <Text style={[styles.bodyText, { color: theme.colors.text }]}>
              Planes: {prefs.plans || 'No especificado'}
            </Text>
            <Text style={[styles.bodyText, { color: theme.colors.text }]}>
              Música: {prefs.music || 'No especificada'}
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  title: { fontSize: 24, marginBottom: 25, letterSpacing: 1 },
  card: { padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  mbtiText: { fontSize: 32, fontWeight: 'bold', marginBottom: 5 },
  bodyText: { fontSize: 14, marginBottom: 5 },
  traitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }
});
