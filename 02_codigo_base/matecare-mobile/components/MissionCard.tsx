import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { View as MotiView } from 'moti';
import { SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface MissionCardProps {
  id: string;
  title: string;
  description: string;
  progress: number;
  category: string;
  index?: number;
  onPress: () => void;
}

export default function MissionCard({ title, description, progress, category, index = 0, onPress }: MissionCardProps) {
  const { theme } = useTheme();
  const isCompleted = progress >= 100;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: index * 100 }}
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.card, 
          borderColor: isCompleted ? theme.colors.primary : theme.colors.border,
          borderLeftColor: theme.colors.accent, // Acento Oro/Platino sugerido
          borderLeftWidth: 6
        },
        isCompleted && { opacity: 0.7 }
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
        
        <View style={[styles.footer, { borderTopColor: theme.colors.border + '30' }]}>
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
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
