import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { apiFetch } from '../../services/api';
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

  useEffect(() => {
    fetchCycleData();
  }, []);

  const fetchCycleData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [recRes, historyRes] = await Promise.all([
        apiFetch(`/api/ai/recommendation/${user.id}`),
        apiFetch(`/api/missions/history/${user.id}`)
      ]);

      let cycleData = null;
      let missions = [];

      if (recRes.ok) {
        const data = await recRes.json();
        cycleData = data.cycle;
        setCycleInfo(data.cycle);
      }

      if (historyRes.ok) {
        missions = await historyRes.json();
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
    
    if (Array.isArray(missions)) {
      missions.forEach(m => {
        if (!m.createdAt) return;
        const date = new Date(m.createdAt).toISOString().split('T')[0];
        marks[date] = { 
          marked: true, 
          dotColor: theme?.colors?.accent || '#CFAA3C',
          selected: date === selectedDay,
          selectedColor: date === selectedDay ? (theme?.colors?.accent || '#CFAA3C') : undefined
        };
      });
    }

    const activeDay = selectedDay || today;
    if (!marks[activeDay]) {
      marks[activeDay] = { selected: true, selectedColor: theme?.colors?.accent || '#CFAA3C' };
    } else {
      marks[activeDay] = { ...marks[activeDay], selected: true, selectedColor: theme?.colors?.accent || '#CFAA3C' };
    }
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
            <Text style={[styles.title, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>Calendario Táctico</Text>
            <Text style={[styles.subtitle, { color: theme?.colors?.textMuted || '#8F8F8F' }]}>Anticipación es Victoria</Text>
          </View>

          <MotiView 
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={[styles.calendarCard, { 
              backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', 
              borderColor: theme?.colors?.border || 'rgba(255,255,255,0.1)',
              shadowColor: theme?.colors?.accent || '#CFAA3C' 
            }]}
          >
            <Calendar
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: theme?.colors?.accent || '#CFAA3C',
                selectedDayBackgroundColor: theme?.colors?.accent || '#CFAA3C',
                selectedDayTextColor: theme?.colors?.background || '#044422',
                todayTextColor: theme?.colors?.accent || '#CFAA3C',
                dayTextColor: theme?.colors?.text || '#FFF',
                textDisabledColor: theme?.colors?.border || 'rgba(255,255,255,0.1)',
                dotColor: theme?.colors?.accent || '#CFAA3C',
                monthTextColor: theme?.colors?.accent || '#CFAA3C',
                indicatorColor: theme?.colors?.accent || '#CFAA3C',
                textDayFontFamily: theme?.typography?.bodyFont,
                textMonthFontFamily: theme?.typography?.boldFont,
                textDayHeaderFontFamily: theme?.typography?.boldFont,
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
