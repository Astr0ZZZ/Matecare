import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';
import { CONFIG } from '../../constants/config';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

export default function ConfirmOnboarding() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    const apiUrl = CONFIG.API_URL;
    const userId = CONFIG.TEST_USER_ID;

    const payload = {
      userId,
      cycleLength: parseInt(params.cycleLength as string) || 28,
      periodDuration: parseInt(params.periodDuration as string) || 5,
      lastPeriodDate: params.lastPeriodDate,
      personalityType: params.personalityType,
      conflictStyle: params.conflictStyle,
      affectionStyle: params.affectionStyle,
      socialLevel: params.socialLevel || 'MEDIUM',
      privacyLevel: params.privacyLevel || 'MODERATE',
    };

    try {
      console.log('Sending payload:', payload);
      
      const response = await fetch(`${apiUrl}/api/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          'Error del Servidor', 
          `Mensaje: ${responseData.error}\nDetalle: ${responseData.detail || 'Sin detalle'}`
        );
      }
    } catch (error: any) {
      Alert.alert('Error de Conexión', `Verifica la IP ${apiUrl}. Detalle: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.light.greenDark, '#0A3323']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>¡Todo listo!</Text>
        <Text style={styles.headerSubtitle}>Confirma que la información sea correcta.</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500 }}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryTitle}>Resumen del Perfil</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Ciclo:</Text>
            <Text style={styles.value}>{params.cycleLength} días</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Regla:</Text>
            <Text style={styles.value}>{params.periodDuration} días</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Personalidad:</Text>
            <Text style={styles.value}>{params.personalityType}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Conflictos:</Text>
            <Text style={styles.value}>{params.conflictStyle}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Lenguaje:</Text>
            <Text style={styles.value}>{params.affectionStyle}</Text>
          </View>
        </MotiView>

        <TouchableOpacity 
          style={styles.finishButton}
          onPress={handleFinish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.finishButtonText}>Empezar ahora</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5F0',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: 'rgba(255,255,255,0.7)',
  },
  content: {
    padding: SPACING.lg,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8E4DF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.light.greenDark,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.light.textMuted,
  },
  value: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    color: COLORS.light.greenDark,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E4DF',
    marginVertical: 16,
  },
  finishButton: {
    backgroundColor: COLORS.light.gold,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: COLORS.light.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
  },
});
