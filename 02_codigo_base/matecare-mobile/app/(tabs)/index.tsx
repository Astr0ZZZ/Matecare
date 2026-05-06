import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import PhaseCard from '../../components/PhaseCard';
import CycleCompassHUD from '../../components/CycleCompassHUD';
import RecommendationCard from '../../components/RecommendationCard';
import MissionCard from '../../components/MissionCard';
import { MotiView } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function Dashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [cycleData, setCycleData] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [dailyRec, setDailyRec] = useState<string>('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }
      setUserId(user.id);

      // Cargar perfil (puntos)
      const profile = await apiFetch(`/profile/${user.id}`);
      if (profile) setUserPoints(profile.points || 0);

      // Cargar ciclo e IA en paralelo
      const [aiData, missionsData] = await Promise.all([
        apiFetch(`/ai/recommendation/${user.id}`),
        apiFetch(`/missions/${user.id}`)
      ]);

      if (aiData) {
        if (aiData.cycle) setCycleData(aiData.cycle);
        if (aiData.recommendation) setDailyRec(aiData.recommendation);
      }
      
      if (missionsData) {
        setMissions(missionsData);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleUpdateMission = async (missionId: string, currentProgress: number) => {
    try {
      const nextProgress = Math.min(currentProgress + 33.4, 100);
      await apiFetch('/missions/update', {
        method: 'POST',
        body: JSON.stringify({ userId, missionId, progress: nextProgress })
      });
      loadData(true);
    } catch (error) {
      console.error('Error updating mission:', error);
    }
  };

  const handleResetMissions = async () => {
    try {
      await apiFetch('/missions/reset', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      loadData(true);
    } catch (error) {
      console.error('Error resetting missions:', error);
    }
  };

  const getTacticalRank = (pts: number) => {
    if (pts < 500) return 'CENTINELA';
    if (pts < 1500) return 'OPERADOR';
    if (pts < 3000) return 'COMANDANTE';
    return 'GURÚ EMOCIONAL';
  };

  if (loading) {
    return (
      <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.accent }]}>INICIANDO PROTOCOLOS TÁCTICOS...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={theme?.colors?.accent || '#CFAA3C'} 
            />
          }
        >
          <MotiView
            from={{ opacity: 0, translateY: -15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.header}
          >
            <View style={[
              styles.headerCard, 
              { 
                backgroundColor: theme?.colors?.cardElevated || theme?.colors?.card,
                borderColor: theme?.colors?.border,
                shadowColor: theme?.colors?.shadows?.medium || '#000',
                ...SHADOWS.sm
              }
            ]}>
              <View style={styles.headerTop}>
                <View style={styles.rankSection}>
                  <View style={[styles.rankBadge, { backgroundColor: `${theme?.colors?.accent}15` }]}>
                    <Ionicons name="trophy" size={16} color={theme?.colors?.accent || '#CFAA3C'} />
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={[styles.greeting, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>
                      {getTacticalRank(userPoints)}
                    </Text>
                    <Text 
                      style={[styles.userName, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.titleFont }]} 
                      numberOfLines={1} 
                      adjustsFontSizeToFit
                    >
                      {userPoints.toLocaleString()} PUNTOS
                    </Text>
                  </View>
                </View>
                <View style={[styles.levelIndicator, { borderColor: theme?.colors?.border }]}>
                  <Text style={[styles.levelText, { color: theme?.colors?.textMuted }]}>Nivel</Text>
                  <Text style={[styles.levelNumber, { color: theme?.colors?.accent }]}>
                    {Math.floor(userPoints / 500) + 1}
                  </Text>
                </View>
              </View>
              <View style={styles.progressSection}>
                <View style={[styles.rankBar, { backgroundColor: theme?.colors?.borderSubtle || 'rgba(255,255,255,0.05)' }]}>
                  <LinearGradient
                    colors={theme?.visuals?.goldGradient || ['#CFAA3C', '#E4C34A', '#CFAA3C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.rankProgress, { width: `${Math.min((userPoints % 500) / 5, 100)}%` }]}
                  />
                </View>
                <Text style={[styles.progressLabel, { color: theme?.colors?.textSubtle || theme?.colors?.textMuted }]}>
                  {500 - (userPoints % 500)} pts para siguiente nivel
                </Text>
              </View>
            </View>
          </MotiView>

          {cycleData && (
            <PhaseCard 
              phase={cycleData.phase} 
              dayOfCycle={cycleData.dayOfCycle} 
            />
          )}

          <MotiView 
            style={styles.section}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100 }}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBox, { backgroundColor: `${theme?.colors?.accent}12` }]}>
                <Text style={{ fontSize: 16 }}>{theme?.visuals?.emojiSet?.status || '🧘'}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.boldFont }]}>
                {theme?.visuals?.hudName || 'HUD'}
              </Text>
            </View>
            <CycleCompassHUD 
              dayOfCycle={cycleData?.dayOfCycle || 1} 
              cycleLength={cycleData?.totalLength || 28} 
              phaseLabel={cycleData?.phase || 'Calculando...'} 
            />
          </MotiView>

          <MotiView 
            style={styles.section}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 }}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBox, { backgroundColor: `${theme?.colors?.accent}12` }]}>
                <Text style={{ fontSize: 16 }}>{theme?.visuals?.emojiSet?.mission || '🌿'}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.boldFont }]}>
                Misiones del Día
              </Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity 
                  onPress={handleResetMissions} 
                  style={[styles.resetButton, { backgroundColor: `${theme?.colors?.accent}10`, borderColor: theme?.colors?.borderSubtle }]}
                >
                  <Ionicons name="refresh" size={16} color={theme?.colors?.accent || '#CFAA3C'} />
                </TouchableOpacity>
                <View style={[styles.missionCountBadge, { backgroundColor: `${theme?.colors?.accent}15`, borderColor: `${theme?.colors?.accent}30` }]}>
                  <Text style={[styles.missionCountText, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>
                    {missions.filter(m => m.progress < 100).length}
                  </Text>
                </View>
              </View>
            </View>

            {missions.length > 0 ? (
              <View style={styles.missionsContainer}>
                {missions.map((mission, index) => (
                  <MissionCard
                    key={mission.id}
                    id={mission.id}
                    userId={userId || ''}
                    title={mission.title}
                    description={mission.description}
                    progress={mission.progress}
                    category={mission.category || "General"}
                    index={index}
                    onPress={() => handleUpdateMission(mission.id, mission.progress)}
                  />
                ))}
              </View>
            ) : (
              <View style={[
                styles.emptyCard, 
                { 
                  backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', 
                  borderColor: theme?.colors?.borderSubtle || 'rgba(255,255,255,0.08)' 
                }
              ]}>
                <Ionicons name="hourglass-outline" size={32} color={theme?.colors?.textSubtle || '#666'} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: theme?.colors?.textMuted || '#8F8F8F', fontFamily: theme?.typography?.bodyFont }]}>
                  Recibiendo misiones tácticas...
                </Text>
              </View>
            )}
          </MotiView>

          <MotiView 
            style={styles.section}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 300 }}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBox, { backgroundColor: `${theme?.colors?.accent}12` }]}>
                <Text style={{ fontSize: 16 }}>{theme?.visuals?.emojiSet?.rec || '✨'}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.boldFont }]}>
                Recomendación AI
              </Text>
            </View>
            <RecommendationCard 
              title="Sabiduría del Oráculo"
              content={dailyRec || "Sincronizando con el motor táctico para darte la mejor estrategia..."}
            />
          </MotiView>
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  safeArea: { 
    flex: 1 
  },
  scrollContent: { 
    padding: SPACING.lg, 
    paddingTop: SPACING.md, 
    paddingBottom: 120 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: SPACING.md, 
    fontSize: 11, 
    fontWeight: '700', 
    letterSpacing: 2 
  },
  header: { 
    marginBottom: SPACING.lg 
  },
  headerCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  rankInfo: {
    flex: 1,
  },
  greeting: { 
    fontSize: 10, 
    fontWeight: '700', 
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  userName: { 
    fontSize: 22, 
    marginTop: 2,
    letterSpacing: -0.5,
  },
  levelIndicator: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  levelText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  progressSection: {
    marginTop: SPACING.md,
  },
  rankBar: { 
    height: 6, 
    borderRadius: RADIUS.xs, 
    overflow: 'hidden' 
  },
  rankProgress: { 
    height: '100%',
    borderRadius: RADIUS.xs,
  },
  progressLabel: {
    fontSize: 11,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  section: { 
    marginBottom: SPACING.xl 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: SPACING.md 
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  sectionTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  missionCountBadge: { 
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  missionCountText: { 
    fontSize: 12, 
    fontWeight: '700' 
  },
  missionsContainer: {
    gap: SPACING.sm,
  },
  emptyCard: { 
    padding: SPACING.xxl, 
    borderRadius: RADIUS.lg, 
    borderWidth: 1, 
    borderStyle: 'dashed', 
    alignItems: 'center' 
  },
  emptyText: { 
    fontSize: 13, 
    textAlign: 'center' 
  },
  resetButton: { 
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
  },
});
