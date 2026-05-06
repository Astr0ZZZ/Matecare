import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, ActivityIndicator } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../services/api';
import { supabase } from '../lib/supabase';

interface MissionCardProps {
  id: string;
  title: string;
  description: string;
  progress: number;
  category: string;
  index?: number;
  onPress: () => void;
}

export default function MissionCard({ 
  id,
  title, 
  description, 
  progress, 
  category, 
  index = 0, 
  onPress 
}: MissionCardProps) {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const isCompleted = progress >= 100;
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const isCyber = theme.id === 'CYBER';

  const flicker = useSharedValue(1);

  useEffect(() => {
    if (isCyber) {
      flicker.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 100 }),
          withTiming(1, { duration: 200 })
        ),
        -1, true
      );
    }
  }, [isCyber]);

  const flickerStyle = useAnimatedStyle(() => ({
    opacity: flicker.value,
    shadowOpacity: flicker.value * 0.5,
  }));

  const handleCaptureEvidence = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled) {
        setUploading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const res = await apiFetch('/api/missions/upload-evidence', {
          method: 'POST',
          body: JSON.stringify({
            missionId: id,
            imageUrl: result.assets[0].uri,
            userId: user?.id
          })
        });

        if (res.ok) {
          alert("Evidencia táctica asegurada. +50 Puntos.");
          onPress(); 
        }
      }
    } catch (e) {
      console.error("Error capturando evidencia:", e);
    } finally {
      setUploading(false);
    }
  };


  const renderProgressBar = () => {
    if (theme.visuals.material.progressStyle === 'segmented') {
      const segments = 10;
      const activeSegments = Math.round((safeProgress / 100) * segments);
      
      return (
        <View style={styles.segmentedTrack}>
          {[...Array(segments)].map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.segment, 
                { 
                  backgroundColor: i < activeSegments ? theme.colors.accent : 'rgba(255,255,255,0.05)',
                  borderColor: i < activeSegments ? theme.colors.accent : 'transparent',
                  borderWidth: isCyber ? 0.5 : 0
                }
              ]} 
            />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.barTrack}>
        <LinearGradient
          colors={theme.visuals.goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${safeProgress}%`, height: '100%', borderRadius: 3 }}
        />
      </View>
    );
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: index * 100, type: 'timing', duration: 500 }}
      style={[
        styles.cardContainer,
        { 
          backgroundColor: theme.colors.card, 
          borderColor: theme.colors.border,
          shadowColor: isCyber ? theme.colors.accent : 'transparent'
        },
        isCyber && flickerStyle
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: isCompleted ? theme.colors.glow : 'rgba(255, 255, 255, 0.05)' }]}>
            {isCompleted ? (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
            ) : (
              <Text style={{ fontSize: 24 }}>{theme.visuals.emojiSet.mission}</Text>
            )}
          </View>
          <View style={styles.titleBox}>
            <Text style={[styles.missionTitle, { color: theme.colors.text, fontFamily: theme.typography.boldFont }]}>
              {title}
            </Text>
            <Text style={[styles.missionCategory, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>
              {category.toUpperCase()}
            </Text>
          </View>
          {!isCompleted && (
            <TouchableOpacity 
              onPress={handleCaptureEvidence} 
              style={[styles.cameraButton, { borderColor: theme.colors.accent }]}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Ionicons name="camera" size={20} color={theme.colors.accent} />
              )}
            </TouchableOpacity>
          )}
        </View>


        <Text style={[styles.missionDesc, { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFont }]} numberOfLines={2}>
          {description}
        </Text>

        {renderProgressBar()}

        {isCompleted && (
          <View style={[styles.badge, { borderColor: theme.colors.accent, backgroundColor: theme.colors.glow }]}>
            <Text style={[styles.badgeText, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>
              MISIÓN ASEGURADA
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
    borderWidth: 0.5,
    overflow: 'hidden',
    elevation: 2,
    shadowRadius: 5,
  },
  content: {
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  titleBox: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 16,
  },
  missionCategory: {
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 2,
  },
  missionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentedTrack: {
    flexDirection: 'row',
    height: 8,
    justifyContent: 'space-between',
  },
  segment: {
    flex: 1,
    marginHorizontal: 1,
    height: '100%',
    borderRadius: 1,
  },
  badge: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 8,
    letterSpacing: 1.5,
  },
  cameraButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 12,
    marginLeft: 10,
  }
});
