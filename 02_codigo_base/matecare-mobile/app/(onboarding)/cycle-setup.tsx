import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useTheme } from '../../context/ThemeContext';

// Configuración de idioma segura
try {
  LocaleConfig.locales['es'] = {
    monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
    dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
    today: 'Hoy'
  };
  LocaleConfig.defaultLocale = 'es';
} catch (e) {
  console.warn("Error configuring Calendar locale", e);
}

export default function CycleSetup() {
  const router = useRouter();
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);

  const handleNext = () => {
    const dateObj = new Date(selectedDate);
    const dateString = dateObj.getTime() ? dateObj.toISOString() : new Date().toISOString();

    router.push({
      pathname: '/(onboarding)/personality-quiz',
      params: {
        lastPeriodDate: dateString,
        cycleLength: cycleLength.toString(),
        periodDuration: periodDuration.toString(),
      }
    });
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <MotiView from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors.accent, fontFamily: theme.typography.titleFont }]}>Matriz de Ciclo</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>Sincroniza el estado biológico para la IA.</Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
          >
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>Último periodo registrado</Text>
              <Calendar
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: theme.colors.accent }
                }}
                theme={{
                  calendarBackground: theme.colors.card,
                  textSectionTitleColor: theme.colors.accent,
                  selectedDayBackgroundColor: theme.colors.accent,
                  selectedDayTextColor: theme.colors.background,
                  todayTextColor: theme.colors.accent,
                  dayTextColor: theme.colors.text,
                  textDisabledColor: theme.colors.border,
                  arrowColor: theme.colors.accent,
                  monthTextColor: theme.colors.accent,
                  indicatorColor: theme.colors.accent,
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 12,
                  textDayFontFamily: theme.typography.bodyFont,
                  textMonthFontFamily: theme.typography.boldFont
                }}
                style={[styles.calendar, { borderColor: theme.colors.border }]}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>Duración estimada del ciclo</Text>
              <View style={[styles.counterContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <TouchableOpacity 
                  style={[styles.counterButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => setCycleLength(Math.max(21, cycleLength - 1))}
                >
                  <Text style={[styles.counterButtonText, { color: theme.colors.accent }]}>-</Text>
                </TouchableOpacity>
                <View style={styles.counterValueContainer}>
                  <Text style={[styles.counterValue, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>{cycleLength}</Text>
                  <Text style={[styles.counterUnit, { color: theme.colors.textMuted }]}>DÍAS</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.counterButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => setCycleLength(Math.min(35, cycleLength + 1))}
                >
                  <Text style={[styles.counterButtonText, { color: theme.colors.accent }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>Duración de la fase menstrual</Text>
              <View style={[styles.counterContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <TouchableOpacity 
                  style={[styles.counterButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => setPeriodDuration(Math.max(3, periodDuration - 1))}
                >
                  <Text style={[styles.counterButtonText, { color: theme.colors.accent }]}>-</Text>
                </TouchableOpacity>
                <View style={styles.counterValueContainer}>
                  <Text style={[styles.counterValue, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>{periodDuration}</Text>
                  <Text style={[styles.counterUnit, { color: theme.colors.textMuted }]}>DÍAS</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.counterButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => setPeriodDuration(Math.min(10, periodDuration + 1))}
                >
                  <Text style={[styles.counterButtonText, { color: theme.colors.accent }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.nextButton, { shadowColor: theme.colors.accent }]}
              onPress={handleNext}
            >
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.accent]}
                style={styles.gradientButton}
              >
                <Text style={[styles.nextButtonText, { fontFamily: theme.typography.boldFont }]}>CONTINUAR AL TEST TÁCTICO →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 30,
    marginTop: 20
  },
  headerTitle: {
    fontSize: 32,
    marginBottom: 8,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: { padding: SPACING.lg },
  section: { marginBottom: 35 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  calendar: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
  },
  counterButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  counterValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  counterValue: {
    fontSize: 44,
    lineHeight: 52,
  },
  counterUnit: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  nextButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 20,
    elevation: 5,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  gradientButton: {
    padding: 20,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 14,
    letterSpacing: 1.5,
  },
});
