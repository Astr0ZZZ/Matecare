import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

interface RecommendationCardProps {
  title: string;
  content: string;
}

export default function RecommendationCard({ title, content }: RecommendationCardProps) {
  const { theme } = useTheme();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400 }}
      style={[
        styles.container, 
        { 
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadows?.medium || '#000',
          ...SHADOWS.sm
        }
      ]}
    >
      <LinearGradient
        colors={[theme.colors.cardElevated || theme.colors.card, theme.colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.paddingBox}>
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.colors.accent}18` }]}>
              <Ionicons name="sparkles" size={18} color={theme.colors.accent} />
            </View>
            <View style={styles.titleBox}>
              <Text style={[styles.title, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>
                {title.toUpperCase()}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSubtle || theme.colors.textMuted }]}>
                Recomendación personalizada
              </Text>
            </View>
          </View>
          
          <View style={[styles.contentBox, { backgroundColor: theme.colors.cardElevated || 'rgba(255,255,255,0.03)' }]}>
            <View style={[styles.quoteBar, { backgroundColor: theme.colors.accent }]} />
            <Text style={[styles.content, { color: theme.colors.text, fontFamily: theme.typography.bodyFont }]}>
              {content}
            </Text>
          </View>
          
          <View style={[styles.footer, { borderTopColor: theme.colors.borderSubtle || theme.colors.border }]}>
            <View style={[styles.aiIndicator, { backgroundColor: `${theme.colors.accent}10` }]}>
              <Ionicons name="hardware-chip-outline" size={12} color={theme.colors.accent} />
            </View>
            <Text style={[styles.footerText, { color: theme.colors.textSubtle || theme.colors.textMuted }]}>
              POWERED BY GEMINI 3.1
            </Text>
          </View>
        </View>
      </LinearGradient>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: { 
    borderRadius: RADIUS.lg, 
    overflow: 'hidden',
    borderWidth: 1,
  },
  gradient: {
    borderRadius: RADIUS.lg - 1,
  },
  paddingBox: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  titleBox: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  contentBox: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    paddingLeft: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
  },
  footer: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
  }
});
