import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  withSequence,
  Easing, 
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useAnimatedProps
} from 'react-native-reanimated';
import { TYPOGRAPHY, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { MotiView } from 'moti';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedView = Animated.createAnimatedComponent(View);

interface CycleCompassHUDProps {
  dayOfCycle: number;
  cycleLength: number;
  phaseLabel: string;
}

export default function CycleCompassHUD({ dayOfCycle, cycleLength, phaseLabel }: CycleCompassHUDProps) {
  const { theme } = useTheme();
  const rotation = useSharedValue(0);
  const auraScale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auraScale.value }],
  }));

  const getPhaseColor = () => {
    const label = phaseLabel.toUpperCase();
    if (label.includes('MENSTRUAL')) return theme.colors.phases.MENSTRUAL;
    if (label.includes('FOLICULAR')) return theme.colors.phases.FOLLICULAR;
    if (label.includes('OVULACION') || label.includes('OVULACIÓN')) return theme.colors.phases.OVULATION;
    if (label.includes('LUTEA') || label.includes('LÚTEA')) return theme.colors.phases.LUTEAL;
    return theme.colors.accent;
  };

  const phaseColor = getPhaseColor();

  const renderCompass = () => {
    const progress = (dayOfCycle / cycleLength) * 100;
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <Svg width="200" height="200" viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={phaseColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={phaseColor} stopOpacity="0.8" />
          </LinearGradient>
        </Defs>
        <Circle
          cx="100"
          cy="100"
          r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
          fill="none"
        />
        <Circle
          cx="100"
          cy="100"
          r={radius}
          stroke="url(#grad)"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform="rotate(-90 100 100)"
        />
      </Svg>
    );
  };

  return (
    <MotiView 
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 15 }}
      style={styles.container}
    >
      {theme.visuals.material.animationStyle === 'aura' && (
        <AnimatedView style={[styles.auraRing, auraStyle, { backgroundColor: theme.colors.glowStrong || theme.colors.glow }]} />
      )}

      <View style={[
        styles.outerRing,
        {
          borderColor: theme.colors.borderSubtle || theme.colors.border,
          shadowColor: theme.colors.shadows?.glow || phaseColor,
          ...SHADOWS.glow
        }
      ]}>
        <BlurView 
          intensity={theme.visuals.material.blurIntensity} 
          tint="dark" 
          style={[styles.glassContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
        >
          {renderCompass()}

          <View style={styles.centerInfo}>
            <View style={[styles.phaseIndicator, { backgroundColor: `${phaseColor}20` }]}>
              <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
              <Text style={[styles.phaseLabel, { color: phaseColor, fontFamily: theme.typography.boldFont }]}>
                EN CURSO
              </Text>
            </View>
            <Text style={[styles.mainPhase, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
              {phaseLabel.toUpperCase()}
            </Text>
            <View style={styles.dayCounterRow}>
              <Text style={[styles.dayCounter, { color: theme.colors.textSubtle || theme.colors.textMuted, fontFamily: theme.typography.boldFont }]}>
                Día {dayOfCycle}
              </Text>
              <View style={[styles.dayDivider, { backgroundColor: theme.colors.textSubtle || theme.colors.textMuted }]} />
              <Text style={[styles.dayCounter, { color: theme.colors.textSubtle || theme.colors.textMuted, fontFamily: theme.typography.boldFont }]}>
                {cycleLength} total
              </Text>
            </View>
          </View>
        </BlurView>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: { 
    alignItems: 'center', 
    marginVertical: SPACING.md, 
    justifyContent: 'center' 
  },
  auraRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.25,
  },
  outerRing: {
    borderRadius: 115,
    padding: 4,
    borderWidth: 1,
  },
  glassContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  centerInfo: { 
    position: 'absolute', 
    alignItems: 'center' 
  },
  phaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  phaseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  phaseLabel: { 
    fontSize: 8, 
    fontWeight: '700', 
    letterSpacing: 1.5 
  },
  mainPhase: { 
    fontSize: 18, 
    marginVertical: 2,
    letterSpacing: -0.5,
  },
  dayCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dayCounter: { 
    fontSize: 10, 
    fontWeight: '600' 
  },
  dayDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
    opacity: 0.5,
  }
});
