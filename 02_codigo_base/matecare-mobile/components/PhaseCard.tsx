import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface PhaseCardProps {
  phase: string;
  dayOfCycle: number;
}

export default function PhaseCard({ phase, dayOfCycle }: PhaseCardProps) {
  const { theme } = useTheme();

  const safePhase = phase || 'MENSTRUAL';
  const phaseMapping: Record<string, string> = {
    'MENSTRUAL': 'MENSTRUAL',
    'FOLICULAR': 'FOLLICULAR',
    'FOLLICULAR': 'FOLLICULAR',
    'OVULACION': 'OVULATION',
    'OVULACIÓN': 'OVULATION',
    'OVULATION': 'OVULATION',
    'LUTEA': 'LUTEAL',
    'LÚTEA': 'LUTEAL',
    'LUTEAL': 'LUTEAL'
  };
  const phaseKey = phaseMapping[safePhase.toUpperCase()] || 'MENSTRUAL';
  const phaseColor = theme.colors.phases[phaseKey] || theme.colors.accent;

  const phaseDescriptions: Record<string, string> = {
    'MENSTRUAL': 'Tiempo de descanso y renovación',
    'FOLLICULAR': 'Energía en ascenso',
    'OVULATION': 'Momento de máxima vitalidad',
    'LUTEAL': 'Preparación y reflexión'
  };

  return (
    <MotiView 
      from={{ opacity: 0, scale: 0.95, translateY: 10 }} 
      animate={{ opacity: 1, scale: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      style={[
        styles.container, 
        { 
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadows?.glow || phaseColor,
          ...SHADOWS.md
        }
      ]}
    >
      <LinearGradient
        colors={[theme.colors.cardElevated || theme.colors.card, theme.colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBg}
      >
        <BlurView intensity={theme.visuals.material.blurIntensity} tint="dark" style={styles.glass}>
          <View style={styles.content}>
            <View style={styles.left}>
              <View style={styles.labelRow}>
                <View style={[styles.statusDot, { backgroundColor: phaseColor }]} />
                <Text style={[styles.label, { color: theme.colors.textMuted, fontFamily: theme.typography.boldFont }]}>
                  ESTADO OPERATIVO
                </Text>
              </View>
              <Text style={[styles.phase, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
                {safePhase.toUpperCase()}
              </Text>
              <Text style={[styles.description, { color: theme.colors.textSubtle || theme.colors.textMuted }]}>
                {phaseDescriptions[phaseKey] || ''}
              </Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: `${phaseColor}18`, borderColor: `${phaseColor}40` }]}>
                  <Ionicons name="calendar-outline" size={12} color={phaseColor} style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: phaseColor, fontFamily: theme.typography.boldFont }]}>
                    DÍA {dayOfCycle || 1}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.right}>
              <View style={[styles.iconContainer, { backgroundColor: `${phaseColor}15` }]}>
                <Ionicons name="shield-half" size={36} color={phaseColor} />
              </View>
            </View>
          </View>
        </BlurView>
      </LinearGradient>

      {/* Glow effect */}
      {theme.visuals.hasGlowEffect && (
        <View style={[styles.glowEffect, { backgroundColor: phaseColor }]} pointerEvents="none" />
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: { 
    borderRadius: RADIUS.xl, 
    marginBottom: SPACING.lg, 
    overflow: 'hidden',
    borderWidth: 1,
  },
  gradientBg: {
    borderRadius: RADIUS.xl - 1,
  },
  glass: {
    padding: SPACING.lg,
  },
  content: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  left: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },
  phase: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  right: {
    marginLeft: SPACING.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowEffect: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.08,
  }
});
