import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import PhaseCard from '../../components/PhaseCard';
import CycleCompassHUD from '../../components/CycleCompassHUD';
import RecommendationCard from '../../components/RecommendationCard';
import MissionCard from '../../components/MissionCard';
import { MotiView, MotiText } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function Dashboard() {
  const router = useRouter();
  const { theme, isLoaded: themeLoaded } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cycleData, setCycleData] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [dailyRec, setDailyRec] = useState<string>('');
  const [userPoints, setUserPoints] = useState(0);
  const [resetTimer, setResetTimer] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      const userId = user.id;
      
      // Lanzamos peticiones en paralelo para máxima velocidad
      const [recRes, missionRes, profileRes] = await Promise.all([
        apiFetch(`/api/ai/recommendation/${userId}`),
        apiFetch(`/api/missions/${userId}`),
        apiFetch(`/api/profile/${userId}`)
      ]);

      if (recRes.ok) {
        const data = await recRes.json();
        setDailyRec(data.recommendation);
        setCycleData(data.cycle);
      } else if (recRes.status === 404) {
        router.replace('/(onboarding)/cycle-setup');
        return;
      } else if (recRes.status === 401) {
        router.replace('/(auth)/login');
        return;
      }

      if (missionRes.ok) {
        const data = await missionRes.json();
        setMissions(data);
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        setUserPoints(data.points || 0);
      }

    } catch (e) {
      console.error("Error cargando Dashboard:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Desacoplado de router para evitar bucles infinitos

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUpdateMission = async (id: string, currentProgress: number) => {
    const newProgress = currentProgress >= 100 ? 0 : 100;
    try {
      const res = await apiFetch(`/api/missions/${id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ progress: newProgress })
      });
      if (res.ok) {
        const data = await res.json();
        setMissions(prev => prev.map(m => m.id === id ? { ...m, ...data.mission } : m));
        if (data.newPoints !== undefined) setUserPoints(data.newPoints);
      }
    } catch (e) {
      console.error("Error actualizando misión:", e);
    }
  };

  const handleResetMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await apiFetch('/api/missions/reset', {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id })
      });
      
      const data = await res.json();
      if (res.ok) {
        setMissions(data);
        alert("Matriz reiniciada. Nuevas coordenadas recibidas.");
      } else if (res.status === 429) {
        alert(data.error);
      }
    } catch (e) {
      console.error("Error en reset:", e);
    }
  };

  const getTacticalRank = (pts: number) => {
    if (pts < 100) return "NOVATO TÁCTICO";
    if (pts < 500) return "OPERATIVO MATECARE";
    if (pts < 1500) return "GUARDIÁN DE LA ARMONÍA";
    return "MAESTRO DE LA MATRIZ";
  };

  if (loading || !themeLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme?.colors?.background || '#044422' }]}>
        <ActivityIndicator size="large" color={theme?.colors?.accent || '#CFAA3C'} />
        <Text style={{ marginTop: 10, color: theme?.colors?.textMuted || '#8F8F8F' }}>Sincronizando con la matriz...</Text>
      </View>
    );
  }

  return (
    <LinearGradient 
      colors={[theme?.colors?.background || '#044422', theme?.colors?.primary || '#044422']} 
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme?.colors?.accent || '#CFAA3C'} />}
          >
            <MotiView
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.header}
            >
              <View style={styles.headerTop}>
                <View style={{ flex: 1, marginRight: 15 }}>
                  <Text style={[styles.greeting, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>{getTacticalRank(userPoints)}</Text>
                  <Text 
                    style={[styles.userName, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.titleFont }]} 
                    numberOfLines={1} 
                    adjustsFontSizeToFit
                  >
                    {userPoints} PTS ACUMULADOS
                  </Text>
                  <View style={[styles.rankBar, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <View style={[styles.rankProgress, { backgroundColor: theme?.colors?.accent || '#CFAA3C', width: `${Math.min((userPoints % 500) / 5, 100)}%` }]} />
                  </View>
                </View>
              </View>

            </MotiView>

            {cycleData && (
              <PhaseCard 
                phase={cycleData.phase} 
                dayOfCycle={cycleData.dayOfCycle} 
              />
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>{theme?.visuals?.emojiSet?.status || '🧘'}</Text>
                <Text style={[styles.sectionTitle, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>{theme?.visuals?.hudName || 'HUD'}</Text>
              </View>
              <CycleCompassHUD 
                dayOfCycle={cycleData?.dayOfCycle || 1} 
                cycleLength={cycleData?.totalLength || 28} 
                phaseLabel={cycleData?.phase || 'Calculando...'} 
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>{theme?.visuals?.emojiSet?.mission || '🌿'}</Text>
                <Text style={[styles.sectionTitle, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>EDICTOS TÁCTICOS</Text>
                <TouchableOpacity onPress={handleResetMissions} style={styles.resetButton}>
                  <Ionicons name="refresh-circle" size={24} color={theme?.colors?.accent || '#CFAA3C'} />
                </TouchableOpacity>
                <View style={[styles.missionCountBadge, { backgroundColor: theme?.colors?.glow || 'rgba(0,0,0,0.1)' }]}>
                  <Text style={[styles.missionCountText, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>{missions.filter(m => m.progress < 100).length} PENDIENTES</Text>
                </View>
              </View>

              
              {missions.length > 0 ? (
                missions.map((mission, index) => (
                  <MissionCard
                    key={mission.id}
                    id={mission.id}
                    title={mission.title}
                    description={mission.description}
                    progress={mission.progress}
                    category={mission.category || "General"}
                    index={index}
                    onPress={() => handleUpdateMission(mission.id, mission.progress)}
                  />
                ))
              ) : (
                <View style={[styles.emptyCard, { backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', borderColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' }]}>
                  <Text style={[styles.emptyText, { color: theme?.colors?.textMuted || '#8F8F8F', fontFamily: theme?.typography?.bodyFont }]}>Recibiendo misiones de la matriz táctica...</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>{theme?.visuals?.emojiSet?.rec || '✨'}</Text>
                <Text style={[styles.sectionTitle, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>ANÁLISIS GEMINI 3</Text>
              </View>
              <RecommendationCard 
                title="Sabiduría del Oráculo"
                content={dailyRec || "Sincronizando con el motor Gemini 3.1 para darte la mejor estrategia..."}
              />
            </View>
            
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 10, fontWeight: 'bold', letterSpacing: 3 },
  header: { marginBottom: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  userName: { fontSize: 26, marginTop: 4 },
  crisisButton: { backgroundColor: '#FF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', elevation: 5, shadowColor: '#FF0000', shadowOpacity: 0.3, shadowRadius: 5 },
  crisisText: { color: '#000', fontWeight: 'bold', fontSize: 10, marginLeft: 6 },
  section: { marginBottom: 35 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5, marginLeft: 10 },
  missionCountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginLeft: 'auto' },
  missionCountText: { fontSize: 9, fontWeight: 'bold' },
  emptyCard: { padding: 40, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  emptyText: { fontSize: 12, textAlign: 'center' },
  rankBar: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  rankProgress: { height: '100%' },
  resetButton: { marginLeft: 10, padding: 4 },
  settingsFooter: { marginTop: 10, padding: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', opacity: 0.5 },
  settingsFooterText: { fontSize: 9, fontWeight: 'bold', marginLeft: 8, letterSpacing: 1 },
});
