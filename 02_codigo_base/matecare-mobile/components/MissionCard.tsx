import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  withSpring
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

interface MissionCardProps {
  id: string;
  userId: string;
  title: string;
  description: string;
  progress: number;
  category: string;
  index: number;
  onPress: () => void;
}

export default function MissionCard({ id, userId, title, description, progress, category, index, onPress }: MissionCardProps) {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  
  const isCompleted = progress >= 100;
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const isCyber = theme.id === 'CYBER';

  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isCyber) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 100 }),
          withTiming(1, { duration: 100 })
        ),
        -1,
        true
      );
    }
  }, [isCyber]);

  const flickerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleCaptureEvidence = () => {
    // Placeholder for camera logic
    setUploading(true);
    setTimeout(() => setUploading(false), 2000);
  };

  const renderProgressBar = () => {
    if (theme.visuals.material.progressType === 'segmented') {
      return (
        <View style={styles.segmentedTrack}>
          {[1, 2, 3].map((seg) => (
            <View 
              key={seg} 
              style={[
                styles.segment, 
                { 
                  backgroundColor: safeProgress >= seg * 33.3 ? theme.colors.accent : 'rgba(255, 255, 255, 0.08)',
                  width: '31%' 
                }
              ]} 
            />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.barTrack}>
        <MotiView
          from={{ width: '0%' }}
          animate={{ width: `${safeProgress}%` }}
          transition={{ type: 'timing', duration: 1000 }}
          style={[styles.progressBar, { backgroundColor: theme.colors.accent }]}
        />
      </View>
    );
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 15, scale: 0.98 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ delay: index * 80, type: 'spring', damping: 15 }}
      style={[
        styles.cardContainer,
        { 
          backgroundColor: theme.colors.card, 
          borderColor: isCompleted ? theme.colors.success || theme.colors.accent : theme.colors.border,
          shadowColor: isCyber ? theme.colors.accent : theme.colors.shadows?.medium || '#000',
          ...SHADOWS.sm
        },
        isCyber && flickerStyle
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[
            styles.iconBox, 
            { 
              backgroundColor: isCompleted 
                ? `${theme.colors.success || theme.colors.accent}20` 
                : theme.colors.cardElevated || 'rgba(255, 255, 255, 0.08)',
              borderColor: isCompleted 
                ? `${theme.colors.success || theme.colors.accent}40`
                : theme.colors.borderSubtle || 'transparent'
            }
          ]}>
            {isCompleted ? (
              <Ionicons name="checkmark-circle" size={26} color={theme.colors.success || theme.colors.accent} />
            ) : (
              <Text style={{ fontSize: 22 }}>{theme.visuals.emojiSet.mission}</Text>
            )}
          </View>
          <View style={styles.titleBox}>
            <Text 
              style={[
                styles.missionTitle, 
                { 
                  color: isCompleted ? theme.colors.textMuted : theme.colors.text, 
                  fontFamily: theme.typography.boldFont,
                  textDecorationLine: isCompleted ? 'line-through' : 'none'
                }
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <View style={styles.categoryRow}>
              <View style={[styles.categoryBadge, { backgroundColor: `${theme.colors.accent}15` }]}>
                <Text style={[styles.missionCategory, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>
                  {category.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          {!isCompleted && (
            <TouchableOpacity 
              onPress={handleCaptureEvidence} 
              style={[
                styles.cameraButton, 
                { 
                  borderColor: theme.colors.borderSubtle || theme.colors.border,
                  backgroundColor: theme.colors.cardElevated || 'rgba(255,255,255,0.05)'
                }
              ]}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons name="camera-outline" size={18} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text 
          style={[
            styles.missionDesc, 
            { 
              color: theme.colors.textSubtle || theme.colors.textMuted, 
              fontFamily: theme.typography.bodyFont 
            }
          ]} 
          numberOfLines={2}
        >
          {description}
        </Text>

        <View style={styles.progressSection}>
          {renderProgressBar()}
          <Text style={[styles.progressText, { color: theme.colors.textSubtle || theme.colors.textMuted }]}>
            {Math.round(safeProgress)}%
          </Text>
        </View>

        {isCompleted && (
          <View style={[
            styles.badge, 
            { 
              borderColor: `${theme.colors.success || theme.colors.accent}50`, 
              backgroundColor: `${theme.colors.success || theme.colors.accent}12` 
            }
          ]}>
            <Ionicons name="checkmark-done" size={14} color={theme.colors.success || theme.colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.badgeText, { color: theme.colors.success || theme.colors.accent, fontFamily: theme.typography.boldFont }]}>
              MISIÓN COMPLETADA
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
  },
  titleBox: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  missionCategory: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
  missionDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: RADIUS.xs,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: SPACING.sm,
    minWidth: 32,
    textAlign: 'right',
  },
  segmentedTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    justifyContent: 'space-between',
  },
  segment: {
    borderRadius: 1,
  },
  badge: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 1.5,
  },
  cameraButton: {
    padding: 10,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginLeft: SPACING.sm,
  }
});
