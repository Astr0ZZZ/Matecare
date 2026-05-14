import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import PhaseCard from '../../components/PhaseCard';
import CycleCompassHUD from '../../components/CycleCompassHUD';
import RecommendationCard from '../../components/RecommendationCard';
import MissionCard from '../../components/MissionCard';
import { MotiView, MotiText } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function Dashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cycleData, setCycleData] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [dailyRec, setDailyRec] = useState<string>('');
  const [userPoints, setUserPoints] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);

  const pollInterval = useRef<any>(null);
  const pollCount = useRef(0);
  const lastVisionTimestamp = useRef<string | null>(null);



  const fetchData = useCallback(async (isPolling = false) => {
    if (!user?.id) return;
    
    if (!isPolling) setLoading(true);
    
    try {
      const summaryData = await apiFetch(`/dashboard/summary/${user.id}`);
      setSummary(summaryData);
      
      if (summaryData.profile) setUserPoints(summaryData.profile.points || 0);
      if (summaryData.cycle) setCycleData(summaryData.cycle);
      if (summaryData.missions) setMissions(summaryData.missions);
      
      if (summaryData.recommendation) {
        setDailyRec(summaryData.recommendation.text || '');
        
        // Si la IA sigue generando, activamos polling
        if (summaryData.recommendation.isGenerating) {
          setIsWaitingForAI(true);
          if (!pollInterval.current) {
            console.log('[DASHBOARD] IA en proceso. Iniciando polling suave...');
            pollCount.current = 0;
            pollInterval.current = setInterval(() => {
              if (pollCount.current >= 20) {
                if (pollInterval.current) clearInterval(pollInterval.current);
                pollInterval.current = null;
                setIsWaitingForAI(false);
                console.log('[DASHBOARD] Max polling alcanzado (60s). Deteniendo.');
                return;
              }
              pollCount.current++;
              fetchData(true);
            }, 5000);
          }
        } else {
          setIsWaitingForAI(false);
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
            console.log('[DASHBOARD] IA completada. Polling detenido.');
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Aborted') {
        console.log(`[Dashboard] Petición ${isPolling ? 'de polling ' : ''}cancelada o timeout. Reintentando en el próximo ciclo.`);
      } else {
        console.error("[Dashboard] Error cargando resumen:", error);
        showError("Falla en sincronización de datos tácticos.");
      }
    } finally {
      if (!isPolling) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      const checkVisionUpdate = async () => {
        const storedTimestamp = await AsyncStorage.getItem('lastVisionUpdate');
        if (storedTimestamp && storedTimestamp !== lastVisionTimestamp.current) {
          lastVisionTimestamp.current = storedTimestamp;
          fetchData(); // Reload dashboard
        }
      };
      checkVisionUpdate();
    }, [fetchData])
  );

  useEffect(() => {
    fetchData();
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUpdateMission = async (id: string, currentProgress: number) => {
    if (id.startsWith('fb-')) {
      showError("Aún sincronizando con el oráculo. Misiones de ejemplo no completables.");
      return;
    }

    const newProgress = currentProgress >= 100 ? 0 : 100;
    try {
      const data = await apiFetch(`/missions/${id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ progress: newProgress, userId: user?.id })
      });
      if (data && data.mission) {
        setMissions(prev => prev.map(m => m.id === id ? { ...m, ...data.mission } : m));
        if (data.newPoints !== undefined) setUserPoints(data.newPoints);
      }
    } catch (e) {
      console.error("Error actualizando misión:", e);
      showError("Error al reportar avance de misión.");
    }
  };

  const handleResetMissions = async () => {
    try {
      const data = await apiFetch('/missions/reset', {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id })
      });
      if (data) {
        setMissions(data);
      }
    } catch (e) {
      console.error("Error en reset:", e);
      showError("No se pudo re-calibrar la lista de edictos.");
    }
  };

  const getTacticalRank = (pts: number) => {
    if (pts < 100) return "NOVATO TÁCTICO";
    if (pts < 500) return "OPERATIVO MATECARE";
    if (pts < 1500) return "GUARDIÁN DE LA ARMONÍA";
    return "MAESTRO DE LA MATRIZ";
  };

  if (!summary && loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme?.colors?.background || '#044422' }]}>
        <ActivityIndicator size="large" color={theme?.colors?.accent || '#CFAA3C'} />
        <Text style={{ marginTop: 15, color: '#CFAA3C', fontFamily: theme?.typography?.boldFont, letterSpacing: 1 }}>
          SINCRONIZANDO MATRIZ TÁCTICA...
        </Text>
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
                  <Text style={[styles.userName, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.titleFont, fontWeight: '800' }]} numberOfLines={1}>
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
                <Text style={{ fontSize: 18, marginRight: 10 }}>{theme?.visuals?.emojiSet?.tabs?.centro || '🏡'}</Text>
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
                {/* 
                  [NOTE] El sistema de Nivel/XP está desactivado hasta que se integre la lógica de rangos en el backend.
                  Los puntos actuales (userPoints) se muestran en la cabecera superior.
                */}
                {/* 
                <View style={[styles.xpBadge, { backgroundColor: (theme?.colors?.accent || '#CFAA3C') + '22' }]}>
                  <Text style={[styles.xpText, { color: theme?.colors?.accent || '#CFAA3C' }]}>NIVEL 12</Text>
                </View> 
                */}
              </View>

              {/* 
              <View style={styles.xpContainer}>
                <View style={styles.xpHeader}>
                  <Text style={[styles.xpLabel, { color: theme?.colors?.textMuted }]}>PROGRESO DE RANGO</Text>
                  <Text style={[styles.xpValue, { color: theme?.colors?.accent }]}>750 / 1000 XP</Text>
                </View>
                <View style={[styles.xpBarBg, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <MotiView 
                    from={{ width: '0%' }}
                    animate={{ width: '75%' }}
                    transition={{ type: 'timing', duration: 1500 }}
                    style={[styles.xpBarFill, { backgroundColor: theme?.colors?.accent || '#CFAA3C' }]}
                  />
                </View>
              </View> 
              */}

              <TouchableOpacity onPress={handleResetMissions} style={styles.resetButton}>
                <Ionicons name="refresh-circle" size={24} color={theme?.colors?.accent || '#CFAA3C'} />
              </TouchableOpacity>
              
              {missions.length > 0 ? (
                missions.map((mission, index) => (
                  <MissionCard
                    key={`mission-${mission.id || index}`}
                    id={mission.id}
                    userId={user?.id || ''}
                    title={mission.title}
                    description={mission.description}
                    progress={mission.progress}
                    category={mission.category || "General"}
                    intensity={mission.intensity || "NORMAL"}
                    index={index}
                    onPress={() => handleUpdateMission(mission.id, mission.progress)}
                  />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={{ color: theme?.colors?.textMuted }}>Recibiendo misiones...</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>{theme?.visuals?.emojiSet?.rec || '✨'}</Text>
                <Text style={[styles.sectionTitle, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>INTELIGENCIA TÁCTICA</Text>
                {isWaitingForAI && <ActivityIndicator size="small" color={theme?.colors?.accent} style={{ marginLeft: 10 }} />}
              </View>
              <RecommendationCard 
                title="Sabiduría del Oráculo"
                content={dailyRec}
                interpreter={summary?.recommendation?.interpreter}
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
  scrollContent: { padding: SPACING.lg, paddingTop: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  userName: { fontSize: 26, marginTop: 4 },
  section: { marginBottom: 35 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sectionTitle: { fontSize: 13, letterSpacing: 2, fontWeight: '800' },
  xpBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 'auto' },
  xpText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  xpContainer: { marginBottom: 20, paddingHorizontal: 4 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  xpLabel: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  xpValue: { fontSize: 10, fontWeight: 'bold' },
  xpBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 3 },
  missionCard: { marginTop: 10 },
  emptyCard: { padding: 40, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  rankBar: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  rankProgress: { height: '100%' },
  resetButton: { marginLeft: 10, padding: 4 },
});
