import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import { SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface MissionCardProps {
  id: string;
  title: string;
  description: string;
  progress: number;
  category: string;
  onPress: () => void;
}

export default function MissionCard({ title, description, progress, category, onPress }: MissionCardProps) {
  const { theme } = useTheme();
  const isCompleted = progress >= 100;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={[
        styles.container, 
        { backgroundColor: theme.colors.card, borderColor: isCompleted ? theme.colors.primary : theme.colors.border },
        isCompleted && { opacity: 0.8 }
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.content}>
        <View style={styles.mainRow}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: isCompleted ? theme.colors.primary + '15' : theme.colors.accent + '15' }
          ]}>
            <Ionicons 
              name={isCompleted ? "checkmark-circle" : theme.icons.mission as any} 
              size={24} 
              color={isCompleted ? theme.colors.primary : theme.colors.accent} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[
              styles.title, 
              { color: theme.colors.text, fontFamily: theme.typography.titleFont },
              isCompleted && styles.completedText
            ]}>
              {title}
            </Text>
            <Text 
              style={[styles.description, { color: theme.colors.textMuted }]} 
              numberOfLines={2}
            >
              {description}
            </Text>
          </View>
        </View>
        
        <View style={[styles.footer, { borderTopColor: theme.colors.border + '50' }]}>
          <View style={[styles.tag, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[styles.tagText, { color: theme.colors.primary }]}>{category.toUpperCase()}</Text>
          </View>
          {isCompleted && (
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>MISIÓN CUMPLIDA</Text>
          )}
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  content: {
    padding: SPACING.md,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  completedText: {
    textDecorationLine: 'none',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  }
});
