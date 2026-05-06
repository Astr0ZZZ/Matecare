import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { SPACING, RADIUS } from '../constants/theme';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface PhaseCardProps {
  phase: string;
  dayOfCycle: number;
}

export default function PhaseCard({ phase, dayOfCycle }: PhaseCardProps) {
  const { theme } = useTheme();
  const safePhase = phase || 'Fase Desconocida';

  return (
    <MotiView 
      from={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }} 
      style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
    >
      <BlurView intensity={theme.visuals.material.blurIntensity} tint="dark" style={styles.glass}>
        <View style={styles.content}>
          <View style={styles.left}>
            <Text style={[styles.label, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>ESTADO OPERATIVO</Text>
            <Text style={[styles.phase, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>{safePhase.toUpperCase()}</Text>
            <View style={[styles.badge, { backgroundColor: theme.colors.glow }]}>
              <Text style={[styles.badgeText, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>DÍA {dayOfCycle || 1} DEL CICLO</Text>
            </View>
          </View>
          <View style={styles.right}>
            <Ionicons name="shield-half" size={40} color={theme.colors.accent} />
          </View>
        </View>
      </BlurView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  glass: {
    padding: SPACING.lg,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  phase: {
    fontSize: 26,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  right: {
    marginLeft: 20,
  }
});

