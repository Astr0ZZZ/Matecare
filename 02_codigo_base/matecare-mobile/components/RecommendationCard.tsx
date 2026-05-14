import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface RecommendationCardProps {
  title: string;
  content: string;
  interpreter?: any;
}

export default function RecommendationCard({ title, content, interpreter }: RecommendationCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.paddingBox}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.glow }]}>
            <Ionicons name="bulb" size={18} color={theme.colors.accent} />
          </View>
          <Text style={[styles.title, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>{title.toUpperCase()}</Text>
        </View>

        {/* Los datos del interpreter son internos — se muestran solo en Vision Control */}

        <Text style={[styles.content, { color: theme.colors.text, fontFamily: theme.typography.bodyFont }]}>{content}</Text>
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>MATRIZ TÁCTICA DOBLE AGENTE GPT-5</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  paddingBox: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  visionChip: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    marginTop: 4,
  },
  visionChipText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  footer: {
    marginTop: 15,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
