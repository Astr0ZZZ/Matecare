import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { apiFetch } from '../../services/api';
import { useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

// Configuración en español
LocaleConfig.locales['es'] = {
  monthNames: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  monthNamesShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
  dayNames: ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
  dayNamesShort: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function CalendarScreen() {
  const { theme } = useTheme();
  const todayStr = new Date().toISOString().split('T')[0];
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [cycleInfo, setCycleInfo] = useState(null);
  const [missionHistory, setMissionHistory] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchCycleData();
    }, [])
  );

  const fetchCycleData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cycleData, missions] = await Promise.all([
        apiFetch(`/profile/current/${user.id}`),
        apiFetch(`/missions/history/${user.id}`)
      ]);

      if (cycleData) {
        setCycleInfo(cycleData);
      }

      if (Array.isArray(missions)) {
        setMissionHistory(missions);
      }

      if (cycleData) generateMarkedDates(cycleData, missions);
    } catch (error: any) {
      if (
        error.name === 'AbortError' || 
        error.message === 'Aborted' || 
        String(error).includes('Aborted')
      ) {
        console.log('[Calendar] Petición cancelada (Ignorado)');
        return;
      }
      console.error("Error cargando calendario:", error);
    }
  };

  const generateMarkedDates = (cycle: any, missions: any[]) => {
    const marks: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Marcar días de fase (Anillo doble / Periodo)
    const PHASE_COLORS = {
      MENSTRUAL: '#FF4444',
      FOLLICULAR: '#CFAA3C',
      OVULATION: '#4CAF50',
      LUTEAL: '#B8860B'
    };

    if (cycle && cycle.startDate) {
      const start = new Date(cycle.startDate);
      const phaseColor = (PHASE_COLORS as any)[cycle.phase?.toUpperCase()] || theme.colors.accent;
      
      for (let i = 0; i < cycle.totalLength; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        
        marks[dStr] = {
          color: i < cycle.periodDuration ? `${PHASE_COLORS.MENSTRUAL}33` : `${phaseColor}22`,
          textColor: theme.colors.text,
          startingDay: i === 0,
          endingDay: i === cycle.totalLength - 1,
        };
      }
    }

    // 2. Marcar misiones con puntos
    if (Array.isArray(missions)) {
      missions.forEach(m => {
        if (!m.createdAt) return;
        const date = new Date(m.createdAt).toISOString().split('T')[0];
        const existing = marks[date] || {};
        marks[date] = { 
          ...existing,
          marked: true, 
          dotColor: theme.colors.accent,
        };
      });
    }

    // 3. Resaltar día seleccionado
    const activeDay = selectedDay || today;
    const existingActive = marks[activeDay] || {};
    marks[activeDay] = { 
      ...existingActive, 
      selected: true, 
      selectedColor: theme.colors.accent,
      selectedTextColor: theme.colors.background
    };
    
    setMarkedDates(marks);
  };

  return (
    <LinearGradient 
      colors={[theme?.colors?.background || '#044422', theme?.colors?.primary || '#044422']} 
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme?.colors.accent, fontFamily: theme.typography.titleFont, fontWeight: '800' }]}>
              MATRIZ TÁCTICA {theme.visuals.emojiSet.tabs?.matriz || ''}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.typography.boldFont }]}>Anticipación es Victoria</Text>
          </View>

          <MotiView 
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={[styles.calendarCard, { 
              backgroundColor: theme.colors.card, 
              borderColor: 'rgba(255,255,255,0.05)',
              shadowColor: theme.colors.accent 
            }]}
          >
            <Calendar
              markingType={'period'}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: theme.colors.accent,
                selectedDayBackgroundColor: theme.colors.accent,
                selectedDayTextColor: theme.colors.background,
                todayTextColor: theme.colors.accent,
                dayTextColor: theme.colors.text,
                textDisabledColor: 'rgba(255,255,255,0.1)',
                dotColor: theme.colors.accent,
                monthTextColor: theme.colors.accent,
                indicatorColor: theme.colors.accent,
                textDayFontFamily: theme.typography.bodyFont,
                textMonthFontFamily: theme.typography.boldFont,
                textDayHeaderFontFamily: theme.typography.boldFont,
              }}
              markedDates={markedDates}
              onDayPress={day => setSelectedDay(day.dateString)}
            />
          </MotiView>

          <View style={styles.infoSection}>
            {cycleInfo && (
              <View style={[styles.phaseCard, { 
                backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', 
                borderLeftColor: theme?.colors?.accent || '#CFAA3C' 
              }]}>
                <Text style={[styles.phaseLabel, { color: theme?.colors?.textMuted || '#8F8F8F' }]}>Fase Actual</Text>
                <Text style={[styles.phaseValue, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>{(cycleInfo as any).phase}</Text>
                <Text style={[styles.phaseDesc, { color: theme?.colors?.textMuted || '#8F8F8F' }]}>Día {(cycleInfo as any).dayOfCycle} de {(cycleInfo as any).totalLength}</Text>
              </View>
            )}

            <View style={[styles.tipCard, { 
              backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', 
              borderColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' 
            }]}>
              <Text style={[styles.tipTitle, { color: theme?.colors?.accent || '#CFAA3C' }]}>💡 Tip de Anticipación</Text>
              <Text style={[styles.tipText, { color: theme?.colors?.text || '#FFF' }]}>
                {selectedDay === new Date().toISOString().split('T')[0] 
                  ? "Hoy es un día para la escucha activa. Evita confrontaciones innecesarias."
                  : "Explora los días para planificar tus movimientos tácticos."}
              </Text>
            </View>

            {/* Detalles de Misiones Pasadas */}
            {selectedDay && missionHistory.filter(m => {
              if (!m.createdAt) return false;
              const mDate = new Date(m.createdAt).toISOString().split('T')[0];
              return mDate === selectedDay;
            }).map(m => (
              <MotiView 
                key={m.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                style={[styles.historyItem, { 
                  backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', 
                  borderColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' 
                }]}
              >
                <Text style={[styles.historyTitle, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.boldFont }]}>{m.title}</Text>
                {m.imageUrl && (
                  <Image source={{ uri: m.imageUrl }} style={styles.historyImage} resizeMode="cover" />
                )}
                <Text style={[styles.historyDesc, { color: theme?.colors?.textMuted || '#8F8F8F' }]}>{m.description}</Text>
              </MotiView>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.lg },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: 28 },
  subtitle: { fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 },
  calendarCard: { 
    borderRadius: RADIUS.xl, 
    overflow: 'hidden', 
    borderWidth: 1, 
    elevation: 5,
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  infoSection: { marginTop: SPACING.xl },
  phaseCard: { 
    padding: SPACING.lg, 
    borderRadius: RADIUS.lg, 
    borderLeftWidth: 4, 
    marginBottom: SPACING.md
  },
  phaseLabel: { fontSize: 12, textTransform: 'uppercase' },
  phaseValue: { fontSize: 24 },
  phaseDesc: { fontSize: 14 },
  tipCard: { padding: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1 },
  tipTitle: { fontWeight: 'bold', marginBottom: 5 },
  tipText: { lineHeight: 20 },
  historyItem: { marginTop: 15, padding: 15, borderRadius: RADIUS.lg, borderWidth: 1 },
  historyTitle: { fontSize: 16, marginBottom: 8 },
  historyImage: { width: '100%', height: 200, borderRadius: RADIUS.md, marginBottom: 10 },
  historyDesc: { fontSize: 13, lineHeight: 18 }
});
