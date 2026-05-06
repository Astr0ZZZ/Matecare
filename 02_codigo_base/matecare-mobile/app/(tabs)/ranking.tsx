import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../services/api';
import { SPACING, RADIUS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

export default function RankingScreen() {
  const { theme } = useTheme();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRanking = useCallback(async () => {
    try {
      const res = await apiFetch('/api/profile/leaderboard/all');
      if (res.ok) {
        const data = await res.json();
        setRanking(data);
      }
    } catch (error: any) {
      if (
        error.name === 'AbortError' || 
        error.message === 'Aborted' || 
        String(error).includes('Aborted')
      ) {
        console.log('[Ranking] Petición cancelada (Ignorado)');
        return;
      }
      console.error("Error fetching ranking:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRanking();
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isTop3 = index < 3;
    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    return (
      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ delay: index * 100 }}
        style={[styles.rankItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        <View style={styles.rankLeft}>
          <View style={[styles.rankBadge, { backgroundColor: isTop3 ? medalColors[index] : theme.colors.glow }]}>
            <Text style={[styles.rankText, { color: isTop3 ? '#000' : theme.colors.text }]}>{item.rank}</Text>
          </View>
          <Text style={[styles.userName, { color: theme.colors.text, fontFamily: theme.typography.bodyFont }]}>
            {item.name.toUpperCase()}
          </Text>
        </View>
        <View style={styles.rankRight}>
          <Text style={[styles.points, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>
            {item.points} PTS
          </Text>
          {isTop3 && <Ionicons name="trophy" size={16} color={medalColors[index]} style={{ marginLeft: 5 }} />}
        </View>
      </MotiView>
    );
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>TOP OPERATIVOS</Text>
          <Text style={[styles.subtitle, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>MATECARE GLOBAL RANKING</Text>
        </View>

        <FlatList
          data={ranking}
          renderItem={renderItem}
          keyExtractor={(item) => item.rank.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: theme.colors.textMuted }}>Sincronizando con la red táctica...</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: SPACING.xl, alignItems: 'center' },
  title: { fontSize: 28, letterSpacing: 2 },
  subtitle: { fontSize: 10, letterSpacing: 4, marginTop: 5 },
  listContent: { padding: SPACING.lg },
  rankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  rankLeft: { flexDirection: 'row', alignItems: 'center' },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: { fontWeight: 'bold' },
  userName: { fontSize: 14, letterSpacing: 1 },
  rankRight: { flexDirection: 'row', alignItems: 'center' },
  points: { fontSize: 16 },
  empty: { alignItems: 'center', marginTop: 100 },
});
