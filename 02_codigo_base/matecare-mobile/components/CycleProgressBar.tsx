import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { MotiView } from 'moti';

interface CycleProgressBarProps {
  progress: number;
}

export default function CycleProgressBar({ progress }: CycleProgressBarProps) {
  const safeProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={styles.container}>
      <MotiView 
        from={{ width: '0%' }}
        animate={{ width: `${safeProgress * 100}%` }}
        transition={{ type: 'timing', duration: 1500, delay: 500 }}
        style={styles.progress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 12,
    backgroundColor: COLORS.light.bgSecondary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    width: '100%',
  },
  progress: {
    height: '100%',
    backgroundColor: COLORS.light.gold,
    borderRadius: RADIUS.full,
  },
});
