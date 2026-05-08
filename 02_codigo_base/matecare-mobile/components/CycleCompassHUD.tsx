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
  interpolate,
} from 'react-native-reanimated';
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
    'OVULACION': 'OVULATION',
    'LUTEA': 'LUTEAL',
  };
  const phaseKey = phaseMapping[safePhase.toUpperCase()] || 'MENSTRUAL';
  const phaseColor = theme.colors.phases[phaseKey] || theme.colors.accent;

  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(dayOfCycle / cycleLength, {
      duration: 1500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    rotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1, false
    );

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
  }, [dayOfCycle]);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={styles.container}>
      {/* Capa 1: Glow de Fondo */}
      <AnimatedView style={[styles.glowBackground, { backgroundColor: phaseColor, opacity: 0.1 }]} />

      <BlurView 
        intensity={20} 
        tint="dark" 
        style={[styles.glassContainer, { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' }]}
      >
        <Svg width={220} height={220} viewBox="0 0 220 220">
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={theme.colors.accent} />
              <Stop offset="50%" stopColor={phaseColor} />
              <Stop offset="100%" stopColor={theme.colors.accent} />
            </LinearGradient>
          </Defs>

          {/* Capa 2: Anillo Rotatorio Táctico (Radar) */}
          <AnimatedG originX={centerX} originY={centerY} animatedProps={useAnimatedProps(() => ({ rotation: rotation.value }))}>
             <Circle cx={centerX} cy={centerY} r={radio + 12} stroke="rgba(255,255,255,0.05)" strokeWidth={1} fill="none" strokeDasharray="10, 20" />
          </AnimatedG>

          {/* Capa 3: Anillo de Fondo Pasivo */}
          <Circle cx={centerX} cy={centerY} r={radio} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />

          {/* Capa 4: Anillo de Progreso Dinámico */}
          <AnimatedCircle
            cx={centerX} cy={centerY} r={radio}
            stroke="url(#grad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={progressProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${centerX} ${centerY})`}
          />

          {/* Indicador de posición actual */}
          <AnimatedG originX={centerX} originY={centerY} animatedProps={useAnimatedProps(() => ({ rotation: progress.value * 360 }))}>
             <Circle cx={centerX + radio} cy={centerY} r={6} fill="#FFF" />
             <Circle cx={centerX + radio} cy={centerY} r={12} stroke={phaseColor} strokeWidth={2} opacity={0.5} />
          </AnimatedG>
        </Svg>

        <View style={styles.centerInfo}>
          <Text style={[styles.phaseLabel, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>
            {theme.visuals.hudName}
          </Text>
          <Text style={[styles.mainPhase, { color: '#FFF', fontFamily: theme.typography.titleFont, fontWeight: '800' }]}>
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
  container: { alignItems: 'center', marginVertical: 30, justifyContent: 'center' },
  glowBackground: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  glassContainer: {
    width: 230,
    height: 230,
    borderRadius: 115,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  centerInfo: { position: 'absolute', alignItems: 'center' },
  phaseLabel: { fontSize: 9, letterSpacing: 3, marginBottom: 4 },
  mainPhase: { fontSize: 24, marginVertical: 4, letterSpacing: 1 },
  dayCounter: { fontSize: 11, letterSpacing: 1.5, opacity: 0.8 }
});
