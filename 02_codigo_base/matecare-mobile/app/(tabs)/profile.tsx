import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { THEMES, ThemeType } from '../../constants/themes';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Profile() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [userName, setUserName] = useState('OPERATIVO');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'OPERATIVO';
        setUserName(name.toUpperCase());
        setUserId(data.user.id.substring(0, 8).toUpperCase());
      }
    });
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      "Confirmar Extracción",
      "¿Estás seguro de que deseas cerrar la sesión táctica?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Cerrar Sesión", 
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            // La redirección la maneja automáticamente el AuthGuard en _layout.tsx
          }
        }
      ]
    );
  };

  const renderThemeCard = (themeKey: string) => {
    const t = THEMES[themeKey as ThemeType];
    const isSelected = theme.id === themeKey;

    return (
      <TouchableOpacity
        key={themeKey}
        style={[
          styles.themeCard,
          { 
            backgroundColor: theme.colors.card, 
            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => setTheme(themeKey as ThemeType)}
      >
        <View style={[styles.previewCircle, { backgroundColor: t.colors.primary }]}>
          <Text style={{ fontSize: 20 }}>{t.visuals.emojiSet.status}</Text>
        </View>
        <View style={styles.themeInfo}>
          <Text style={[styles.themeName, { color: isSelected ? theme.colors.accent : theme.colors.text, fontFamily: theme.typography.boldFont }]}>{t.name}</Text>
          <Text style={[styles.themeDesc, { color: theme.colors.textMuted }]}>
            {t.visuals.hudName.toUpperCase()}
          </Text>
        </View>
        {isSelected && (
          <MotiView from={{ scale: 0 }} animate={{ scale: 1 }}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
          </MotiView>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient 
      colors={[theme?.colors?.background || '#044422', theme?.colors?.primary || '#044422']} 
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <MotiView 
              from={{ opacity: 0, scale: 0.5 }} 
              animate={{ opacity: 1, scale: 1 }} 
              style={[styles.avatarPlaceholder, { backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', borderColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' }]}
            >
              <Ionicons name={theme?.visuals?.tabIcons?.profile as any || 'person'} size={40} color={theme?.colors?.accent || '#CFAA3C'} />
            </MotiView>
            <Text style={[styles.title, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.titleFont }]}>{userName}</Text>
            <Text style={[styles.subtitle, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>ID: {userId}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="color-palette" size={18} color={theme?.colors?.accent || '#CFAA3C'} />
              <Text style={[styles.sectionTitle, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>INTERFAZ VISUAL</Text>
            </View>
            {Object.keys(THEMES).map(renderThemeCard)}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings" size={18} color={theme?.colors?.accent || '#CFAA3C'} />
              <Text style={[styles.sectionTitle, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>CONFIGURACIÓN TÁCTICA</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.actionRow, { borderBottomColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' }]} 
              onPress={() => router.push('/profile_partner')}
            >
              <Ionicons name="person-outline" size={20} color={theme?.colors?.textMuted || '#8F8F8F'} />
              <Text style={[styles.actionText, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.bodyFont }]}>Detalles de Personalidad</Text>
              <Ionicons name="chevron-forward" size={16} color={theme?.colors?.border || 'rgba(255,255,255,0.1)'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionRow, { borderBottomColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' }]} 
              onPress={() => router.push('/profile_cycle')}
            >
              <Ionicons name="stats-chart-outline" size={20} color={theme?.colors?.textMuted || '#8F8F8F'} />
              <Text style={[styles.actionText, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.bodyFont }]}>Métricas del Ciclo</Text>
              <Ionicons name="chevron-forward" size={16} color={theme?.colors?.border || 'rgba(255,255,255,0.1)'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionRow, { borderBottomColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' }]} 
              onPress={() => router.push('/(onboarding)/cycle-setup')}
            >
              <Ionicons name="refresh-outline" size={20} color={theme?.colors?.textMuted || '#8F8F8F'} />
              <Text style={[styles.actionText, { color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.bodyFont }]}>Re-calibrar Ciclo (Setup)</Text>
              <Ionicons name="chevron-forward" size={16} color={theme?.colors?.border || 'rgba(255,255,255,0.1)'} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.signOutButton, { backgroundColor: '#FF444410', borderColor: '#FF444430' }]} 
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4444" />
            <Text style={[styles.signOutText, { fontFamily: theme?.typography?.boldFont }]}>CERRAR SESIÓN TÁCTICA</Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: theme?.colors?.textMuted || '#8F8F8F' }]}>MATECARE v1.0.0 - GEMINI 3 ENGINE</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginBottom: 15 },
  title: { fontSize: 22, letterSpacing: 2 },
  subtitle: { fontSize: 12, marginTop: 4 },
  section: { marginBottom: 35 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 13, letterSpacing: 1, marginLeft: 10 },
  themeCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  previewCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  themeInfo: { flex: 1 },
  themeName: { fontSize: 16 },
  themeDesc: { fontSize: 10, marginTop: 2, fontWeight: 'bold', letterSpacing: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  actionText: { flex: 1, fontSize: 15, marginLeft: 15 },
  signOutButton: { marginTop: 10, padding: 18, borderRadius: RADIUS.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  signOutText: { color: '#FF4444', fontWeight: 'bold', letterSpacing: 1, marginLeft: 10 },
  versionText: { textAlign: 'center', marginTop: 40, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }
});
