import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SPACING } from '../../constants/theme';
import { CONFIG } from '../../constants/config';
import PhaseCard from '../../components/PhaseCard';
import CycleCompassHUD from '../../components/CycleCompassHUD';
import RecommendationCard from '../../components/RecommendationCard';
import MissionCard from '../../components/MissionCard';
import { MotiView } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cycleData, setCycleData] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [dailyRec, setDailyRec] = useState<string>('');

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    try {
      const apiUrl = CONFIG.API_URL;
      const userId = CONFIG.TEST_USER_ID;

      const recRes = await fetch(`${apiUrl}/api/ai/recommendation/${userId}`, { signal: controller.signal });
      if (recRes.ok) {
        const data = await recRes.json();
        setDailyRec(data.recommendation);
        setCycleData(data.cycle);
      } else if (recRes.status === 404) {
        router.replace('/(onboarding)/cycle-setup');
        return;
      }

      const missionsRes = await fetch(`${apiUrl}/api/missions/${userId}`, { signal: controller.signal });
      if (missionsRes.ok) {
        const data = await missionsRes.json();
        setMissions(data);
      }
    } catch (error: any) {
      console.error('Dashboard Fetch Error:', error.name === 'AbortError' ? 'Timeout' : error.message);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUpdateMission = async (missionId: string, currentProgress: number) => {
    try {
      const apiUrl = CONFIG.API_URL;
      const newProgress = currentProgress >= 100 ? 0 : 100;
      
      const response = await fetch(`${apiUrl}/api/missions/${missionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress }),
      });

      if (response.ok) {
        setMissions(prev => prev.map(m => m.id === missionId ? { ...m, progress: newProgress } : m));
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.primary }]}>Sincronizando guía táctica...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Background Pattern Mockup */}
      {theme.visuals.bgPattern === 'dots' && (
        <View style={styles.dotsOverlay} />
      )}
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.header}
        >
          <Text style={[styles.greeting, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
            {theme.id === 'ALTAR' ? 'SALVE, GUERRERO' : 'HOLA, GUERRERO'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {theme.id === 'ALTAR' ? 'ESTADO DE LA CRUZADA' : 'ESTADO ACTUAL DE LA MISIÓN'}
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.colors.accent }]} />
        </MotiView>

        {cycleData && (
          <PhaseCard 
            phase={cycleData.phase} 
            dayOfCycle={cycleData.dayOfCycle} 
          />
        )}

        <View style={styles.section}>
          <View style={styles.altarHeader}>
             <View style={[styles.altarLine, { backgroundColor: theme.colors.accent }]} />
             <Text style={[styles.sectionTitle, styles.altarTitle, { color: theme.colors.text }]}>
               {theme.id === 'ALTAR' ? 'ALTAR DEL CICLO' : 'CYCLE COMPASS'}
             </Text>
             <View style={[styles.altarLine, { backgroundColor: theme.colors.accent }]} />
          </View>
          
          <CycleCompassHUD 
            dayOfCycle={cycleData ? cycleData.dayOfCycle : 1} 
            cycleLength={28} 
            phaseLabel={cycleData ? cycleData.phase : 'Calculando...'} 
          />
          <Text style={[styles.phaseInfo, { color: theme.colors.textMuted }]}>
            Faltan {cycleData?.daysUntilNextPhase} días para que {theme.id === 'ALTAR' ? 'las llamas muten' : 'la fase cambie'}.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.row}>
              <Ionicons name={theme.icons.mission as any} size={20} color={theme.colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {theme.id === 'ALTAR' ? 'EDICTOS ASIGNADOS' : 'MISIONES TÁCTICAS AI'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
               <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
                 {missions.filter(m => m.progress < 100).length} PENDIENTES
               </Text>
            </View>
          </View>
          
          {missions.length > 0 ? (
            missions.map((mission) => (
              <MissionCard
                key={mission.id}
                id={mission.id}
                title={mission.title}
                description={mission.description}
                progress={mission.progress}
                category={mission.category || "General"}
                onPress={() => handleUpdateMission(mission.id, mission.progress)}
              />
            ))
          ) : (
            <View style={[styles.emptyCard, { borderColor: theme.colors.border }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                El consejo está redactando nuevas encomiendas...
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={[styles.row, { marginBottom: 12 }]}>
            <Ionicons name={theme.icons.recommendation as any} size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {theme.id === 'ALTAR' ? 'SABIDURÍA DEL ORÁCULO' : 'ANÁLISIS TÁCTICO (IA)'}
            </Text>
          </View>
          <RecommendationCard 
            title="Consejo del Día"
            content={dailyRec || "Analizando el estado actual para darte el mejor consejo..."}
          />
        </View>

        <TouchableOpacity 
          style={styles.onboardingReset}
          onPress={() => router.push('/(onboarding)/cycle-setup')}
        >
          <Text style={[styles.resetText, { color: theme.colors.textMuted }]}>⚙️ RE-SINCRONIZAR PERFIL TÁCTICO</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: 60, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontWeight: 'bold' },
  header: { marginBottom: 24, alignItems: 'center' },
  greeting: { fontSize: 28 },
  subtitle: { fontSize: 14, marginTop: 4, fontWeight: 'bold', letterSpacing: 1 },
  divider: { width: 100, height: 2, marginTop: 12 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  altarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  altarLine: { flex: 1, height: 1, opacity: 0.4 },
  altarTitle: { paddingHorizontal: 16, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  emptyCard: { padding: 30, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  phaseInfo: { fontSize: 12, fontWeight: 'bold', marginTop: 12, textAlign: 'center' },
  onboardingReset: { marginTop: 20, padding: 15, alignItems: 'center' },
  resetText: { fontSize: 10, letterSpacing: 1, fontWeight: 'bold' },
  dotsOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    backgroundColor: '#000', // Simplified dots pattern simulation
  }
});
