import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function CycleDetails() {
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

  const lastPeriod = data?.lastPeriodDate ? new Date(data.lastPeriodDate).toLocaleDateString() : 'No registrado';

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
            DETALLES DEL CICLO
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.accent }]}>CONFIGURACIÓN BASE</Text>
            
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>Duración del ciclo:</Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>{data?.cycleLength} días</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>Duración del periodo:</Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>{data?.periodDuration} días</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: theme.colors.textMuted }]}>Último periodo:</Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>{lastPeriod}</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.accent }]}>ESTADO DE SALUD</Text>
            <Text style={[styles.bodyText, { color: theme.colors.text }]}>
              Regularidad: {data?.isIrregular ? 'Irregular' : 'Regular'}
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
  cardTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: 'bold' },
  bodyText: { fontSize: 14 }
});
