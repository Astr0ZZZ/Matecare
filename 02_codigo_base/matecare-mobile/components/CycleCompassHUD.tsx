import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  useAnimatedStyle,
  withTiming, 
  withRepeat,
  withSequence,
  Easing, 
} from 'react-native-reanimated';
import { TYPOGRAPHY } from '../constants/theme';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

interface CycleCompassHUDProps {
  dayOfCycle: number;
  cycleLength?: number;
  phaseLabel: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedView = Animated.createAnimatedComponent(View);

export default function CycleCompassHUD({ dayOfCycle, cycleLength = 28, phaseLabel }: CycleCompassHUDProps) {
  const { theme } = useTheme();
  const radio = 85;
  const strokeWidth = 14;
  const centerX = 110;
  const centerY = 110;
  const circumference = 2 * Math.PI * radio;
  
  const safePhase = phaseLabel || 'MENSTRUAL';
  const phaseMapping: Record<string, keyof typeof theme.colors.phases> = {
    'MENSTRUAL': 'MENSTRUAL',
    'FOLICULAR': 'FOLLICULAR',
    'FOLLICULAR': 'FOLLICULAR', // English
    'OVULACION': 'OVULATION',
    'OVULACIÓN': 'OVULATION',
    'OVULATION': 'OVULATION', // English
    'LUTEA': 'LUTEAL',
    'LÚTEA': 'LUTEAL',
    'LUTEAL': 'LUTEAL' // English
  };
  const phaseKey = phaseMapping[safePhase.toUpperCase()] || 'MENSTRUAL';
  const phaseColor = theme.colors.phases[phaseKey] || theme.colors.accent;

  const progress = useSharedValue(0);
  const flicker = useSharedValue(1);
  const aura = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(dayOfCycle / cycleLength, {
      duration: 1500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    if (theme.visuals.material.animationStyle === 'flicker') {
      flicker.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 50 }),
          withTiming(1, { duration: 100 }),
          withTiming(0.9, { duration: 30 }),
          withTiming(1, { duration: 200 })
        ),
        -1, true
      );
    } else {
      flicker.value = 1;
    }

    if (theme.visuals.material.animationStyle === 'aura') {
      aura.value = withRepeat(
        withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1, true
      );
    } else {
      aura.value = 1;
    }
  }, [dayOfCycle, theme.id]);

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: aura.value }],
    opacity: (aura.value - 1) * 2 + 0.3,
  }));

  // Definir todos los animatedProps al nivel superior para cumplir las Reglas de Hooks
  const radarAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    opacity: flicker.value,
  }));

  const cyberAnimatedProps = useAnimatedProps(() => {
    const segments = 24;
    const gap = 2;
    const segmentLength = (circumference / segments) - gap;
    const currentSegment = Math.floor(progress.value * segments);
    return {
      strokeDashoffset: -currentSegment * (segmentLength + gap),
      opacity: flicker.value
    };
  });

  const renderCompass = () => {
    switch (theme.visuals.compassType) {
      case 'fire': // DRAGON
        return (
          <Svg width={220} height={220} viewBox="0 0 220 220">
            <Defs>
              <LinearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor={theme.colors.primary} />
                <Stop offset="100%" stopColor={theme.colors.accent} />
              </LinearGradient>
            </Defs>
            {/* Segmentos tipo escudo */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Path
                key={i}
                d={`M ${centerX} 10 L ${centerX + 20} 30 L ${centerX - 20} 30 Z`}
                transform={`rotate(${i * 60} ${centerX} ${centerY})`}
                fill={theme.colors.card}
                stroke={theme.colors.border}
              />
            ))}
            <AnimatedCircle
              cx={centerX} cy={centerY} r={radio}
              stroke={phaseColor}
              strokeWidth={20}
              fill="none"
              strokeDasharray={circumference}
              animatedProps={radarAnimatedProps}
              strokeLinecap="butt"
              transform={`rotate(-90 ${centerX} ${centerY})`}
            />
          </Svg>
        );

      case 'clock': // ETHEREAL
        return (
          <Svg width={220} height={220} viewBox="0 0 220 220">
            <Circle cx={centerX} cy={centerY} r={radio + 10} stroke={theme.colors.glow} strokeWidth={1} fill="none" opacity={0.2} />
            <Circle cx={centerX} cy={centerY} r={radio - 10} stroke={theme.colors.glow} strokeWidth={1} fill="none" opacity={0.2} />
            <AnimatedCircle
              cx={centerX} cy={centerY} r={radio}
              stroke={phaseColor}
              strokeWidth={2}
              fill="none"
              strokeDasharray="4, 4"
              animatedProps={radarAnimatedProps}
              transform={`rotate(-90 ${centerX} ${centerY})`}
            />
            <AnimatedG originX={centerX} originY={centerY} rotation={progress.value * 360}>
              <Circle cx={centerX + radio} cy={centerY} r={10} fill={phaseColor} />
              <Circle cx={centerX + radio} cy={centerY} r={15} stroke={phaseColor} strokeWidth={1} opacity={0.5} />
            </AnimatedG>
          </Svg>
        );

      case 'cyber': // CYBER
        const segments = 24;
        const gap = 2;
        const segmentLength = (circumference / segments) - gap;
        return (
          <Svg width={220} height={220} viewBox="0 0 220 220">
            {Array.from({ length: segments }).map((_, i) => (
              <Circle
                key={i}
                cx={centerX} cy={centerY} r={radio}
                stroke={theme.colors.border}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${segmentLength}, ${circumference - segmentLength}`}
                strokeDashoffset={-i * (segmentLength + gap)}
                opacity={0.1}
              />
            ))}
            <AnimatedCircle
              cx={centerX} cy={centerY} r={radio}
              stroke={phaseColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${segmentLength}, ${circumference - segmentLength}`}
              animatedProps={cyberAnimatedProps}
            />
          </Svg>
        );

      default: // NEVERLAND (Radar)
        return (
          <Svg width={220} height={220} viewBox="0 0 220 220">
            <Defs>
              <LinearGradient id="themeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={theme.visuals.goldGradient[0]} />
                <Stop offset="50%" stopColor={theme.visuals.goldGradient[1]} />
                <Stop offset="100%" stopColor={theme.visuals.goldGradient[2]} />
              </LinearGradient>
            </Defs>
            <Circle cx={centerX} cy={centerY} r={radio} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
            <AnimatedCircle
              cx={centerX} cy={centerY} r={radio}
              stroke={phaseColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              animatedProps={radarAnimatedProps}
              strokeLinecap="round"
              transform={`rotate(-90 ${centerX} ${centerY})`}
            />
            <AnimatedG originX={centerX} originY={centerY} rotation={progress.value * 360}>
               <Circle cx={centerX + radio} cy={centerY} r={8} fill={phaseColor} />
            </AnimatedG>
          </Svg>
        );
    }
  };

  return (
    <View style={styles.container}>
      {theme.visuals.material.animationStyle === 'aura' && (
        <AnimatedView style={[styles.auraRing, auraStyle, { backgroundColor: theme.colors.glow }]} />
      )}

      <BlurView 
        intensity={theme.visuals.material.blurIntensity} 
        tint="dark" 
        style={[styles.glassContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
      >
        {renderCompass()}

        <View style={styles.centerInfo}>
          <Text style={[styles.phaseLabel, { color: phaseColor, fontFamily: theme.typography.boldFont }]}>
            {theme.visuals.hudName}
          </Text>
          <Text style={[styles.mainPhase, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
            {phaseLabel.toUpperCase()}
          </Text>
          <Text style={[styles.dayCounter, { color: theme.colors.textMuted, fontFamily: theme.typography.boldFont }]}>
            DÍA {dayOfCycle} / {cycleLength}
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 20, justifyContent: 'center' },
  auraRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.3,
  },
  glassContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
  },
  centerInfo: { position: 'absolute', alignItems: 'center' },
  phaseLabel: { fontSize: 9, fontWeight: 'bold', letterSpacing: 2 },
  mainPhase: { fontSize: 20, marginVertical: 4 },
  dayCounter: { fontSize: 10, fontWeight: 'bold' }
});
