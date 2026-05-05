import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);

  const handleNext = () => {
    // Asegurar que la fecha es válida
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
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.light.greenDark, '#0A3323']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Configura el Ciclo</Text>
        <Text style={styles.headerSubtitle}>Esto nos ayuda a ser precisos con los consejos.</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Cuándo empezó su último periodo?</Text>
            <Calendar
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: COLORS.light.greenDark }
              }}
              theme={{
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: COLORS.light.textMuted,
                selectedDayBackgroundColor: COLORS.light.greenDark,
                selectedDayTextColor: '#ffffff',
                todayTextColor: COLORS.light.gold,
                dayTextColor: COLORS.light.greenDark,
                textDisabledColor: '#d9e1e8',
                arrowColor: COLORS.light.greenDark,
                monthTextColor: COLORS.light.greenDark,
                indicatorColor: COLORS.light.greenDark,
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12
              }}
              style={styles.calendar}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Cuánto suele durar su ciclo?</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => setCycleLength(Math.max(21, cycleLength - 1))}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>
              <View style={styles.counterValueContainer}>
                <Text style={styles.counterValue}>{cycleLength}</Text>
                <Text style={styles.counterUnit}>días</Text>
              </View>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => setCycleLength(Math.min(35, cycleLength + 1))}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Cuánto dura su regla?</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => setPeriodDuration(Math.max(3, periodDuration - 1))}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </TouchableOpacity>
              <View style={styles.counterValueContainer}>
                <Text style={styles.counterValue}>{periodDuration}</Text>
                <Text style={styles.counterUnit}>días</Text>
              </View>
              <TouchableOpacity 
                style={styles.counterButton}
                onPress={() => setPeriodDuration(Math.min(10, periodDuration + 1))}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Continuar al Test →</Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F5F0' },
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
  content: { padding: SPACING.lg },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    color: COLORS.light.greenDark,
    marginBottom: 12,
  },
  calendar: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E4DF',
    overflow: 'hidden',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8E4DF',
  },
  counterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: {
    fontSize: 24,
    color: COLORS.light.greenDark,
    fontWeight: 'bold',
  },
  counterValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  counterValue: {
    fontSize: 42,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.light.greenDark,
    lineHeight: 50,
  },
  counterUnit: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    color: COLORS.light.textMuted,
  },
  nextButton: {
    backgroundColor: COLORS.light.greenDark,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
  },
});
