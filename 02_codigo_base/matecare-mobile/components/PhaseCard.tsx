import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, TYPOGRAPHY, RADIUS } from '../constants/theme';
import { MotiView } from 'moti';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface PhaseCardProps {
  phase: 'MENSTRUAL' | 'FOLLICULAR' | 'OVULATION' | 'LUTEAL';
  dayOfCycle: number;
  description?: string;
}

export default function PhaseCard({ phase, dayOfCycle, description }: PhaseCardProps) {
  const { theme } = useTheme();

  const getPhaseData = () => {
    const phaseColor = theme.colors.phases[phase];
    switch (phase) {
      case 'MENSTRUAL': return { label: 'Menstrual', color: phaseColor };
      case 'FOLLICULAR': return { label: 'Folicular', color: phaseColor };
      case 'OVULATION': return { label: 'Ovulación', color: phaseColor };
      case 'LUTEAL': return { label: 'Lútea', color: phaseColor };
    }
  };

  const data = getPhaseData();

  return (
    <MotiView 
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 800 }}
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}
    >
      <View style={styles.leftContent}>
        <View style={[styles.iconWrapper, { backgroundColor: data.color + '15' }]}>
          <Ionicons name={theme.icons.phaseIndicator as any} size={20} color={data.color} />
        </View>
        <View>
          <Text style={[styles.phaseLabel, { color: theme.colors.textMuted }]}>
            {theme.id === 'ALTAR' ? 'ESTADO DE LA CRUZADA' : 'FASE ACTUAL'}
          </Text>
          <Text style={[styles.phaseName, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
            {data.label.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={[styles.dayBadge, { backgroundColor: data.color }]}>
        <Text style={styles.dayText}>DÍA {dayOfCycle}</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  phaseLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  phaseName: {
    fontSize: 20,
    marginTop: 2,
  },
  dayBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  dayText: {
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    fontSize: 12,
    color: '#FFF',
  },
});
