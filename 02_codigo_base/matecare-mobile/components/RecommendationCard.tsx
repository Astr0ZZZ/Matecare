import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTheme } from '../context/ThemeContext';

interface RecommendationCardProps {
  title: string;
  content: string;
}

export default function RecommendationCard({ title, content }: RecommendationCardProps) {
  const { theme } = useTheme();

  return (
    <MotiView 
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 800, delay: 600 }}
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.accent + '15' }]}>
        <Ionicons name={theme.icons.recommendation as any} size={24} color={theme.colors.accent} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.primary, fontFamily: theme.typography.titleFont }]}>
          {title}
        </Text>
        <Text style={[styles.text, { color: theme.colors.text }]}>{content}</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
