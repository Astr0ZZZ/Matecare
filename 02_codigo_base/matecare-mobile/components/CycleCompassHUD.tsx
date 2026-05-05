import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withSpring, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface CycleCompassHUDProps {
  dayOfCycle: number;
  cycleLength?: number;
  phaseLabel: string;
}

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CycleCompassHUD({ dayOfCycle, cycleLength = 28, phaseLabel }: CycleCompassHUDProps) {
  const { theme } = useTheme();
  
  // Rotación principal (indicador de día)
  const rotation = useSharedValue(0);
  
  // Animaciones para el modo FUEGO
  const fireSpin1 = useSharedValue(0);
  const fireSpin2 = useSharedValue(0);

  useEffect(() => {
    const angle = ((dayOfCycle - 1) / cycleLength) * 360;
    rotation.value = withSpring(angle, { damping: 15, stiffness: 90 });

    if (theme.visuals.compassType === 'fire') {
      fireSpin1.value = withRepeat(withTiming(360, { duration: 8000 }), -1, false);
      fireSpin2.value = withRepeat(withTiming(-360, { duration: 6000 }), -1, false);
    }
  }, [dayOfCycle, cycleLength, theme.visuals.compassType]);

  const indicatorProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    originX: 74,
    originY: 74,
  }));

  const fireProps1 = useAnimatedProps(() => ({
    transform: [{ rotate: `${fireSpin1.value}deg` }],
    originX: 74,
    originY: 74,
  }));

  const fireProps2 = useAnimatedProps(() => ({
    transform: [{ rotate: `${fireSpin2.value}deg` }],
    originX: 74,
    originY: 74,
  }));

  // --- RENDERS ESPECÍFICOS ---

  const renderRadar = () => {
    const arcs = [
      { d: 'M74,11 A63,63 0 0,1 125.5,42.5', color: theme.colors.phases.MENSTRUAL },
      { d: 'M125.5,42.5 A63,63 0 0,1 125.5,105.5', color: theme.colors.phases.FOLLICULAR },
      { d: 'M125.5,105.5 A63,63 0 0,1 74,137', color: theme.colors.phases.OVULATION },
      { d: 'M74,137 A63,63 0 0,1 22.5,42.5', color: theme.colors.phases.LUTEAL },
    ];

    return (
      <G>
        {arcs.map((arc, i) => (
          <Path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth="22" strokeLinecap="round" opacity={0.9} />
        ))}
        <Line x1="74" y1="11" x2="74" y2="33" stroke="#FFF" strokeWidth="2.5" />
        <Line x1="125.5" y1="42.5" x2="107" y2="53" stroke="#FFF" strokeWidth="2.5" />
        <Line x1="125.5" y1="105.5" x2="107" y2="95" stroke="#FFF" strokeWidth="2.5" />
        <Line x1="74" y1="137" x2="74" y2="115" stroke="#FFF" strokeWidth="2.5" />
        <Line x1="22.5" y1="42.5" x2="41" y2="53" stroke="#FFF" strokeWidth="2.5" />
      </G>
    );
  };

  const renderFire = () => {
    return (
      <G>
        <Circle cx="74" cy="74" r="60" fill="none" stroke={theme.colors.glow} strokeWidth="25" opacity="0.3" />
        <AnimatedCircle 
          cx="74" cy="74" r="60" fill="none" stroke={theme.colors.secondary} 
          strokeWidth="15" strokeDasharray="80 30" strokeLinecap="round" 
          animatedProps={fireProps1}
        />
        <AnimatedCircle 
          cx="74" cy="74" r="60" fill="none" stroke={theme.colors.accent} 
          strokeWidth="8" strokeDasharray="40 60" strokeLinecap="round" 
          animatedProps={fireProps2}
        />
      </G>
    );
  };

  const renderClock = () => {
    return (
      <G>
        <Defs>
          <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.accent} />
            <Stop offset="100%" stopColor={theme.colors.primary} />
          </LinearGradient>
        </Defs>
        <Circle cx="74" cy="74" r="63" fill="none" stroke="#E8E2D2" strokeWidth="12" />
        <Circle cx="74" cy="74" r="63" fill="none" stroke="url(#goldGrad)" strokeWidth="4" strokeDasharray="2 6" />
        <Line x1="74" y1="11" x2="74" y2="25" stroke={theme.colors.accent} strokeWidth="2" />
        <Line x1="74" y1="137" x2="74" y2="123" stroke={theme.colors.accent} strokeWidth="2" />
        <Line x1="11" y1="74" x2="25" y2="74" stroke={theme.colors.accent} strokeWidth="2" />
        <Line x1="137" y1="74" x2="123" y2="74" stroke={theme.colors.accent} strokeWidth="2" />
      </G>
    );
  };

  return (
    <View style={styles.container}>
      <Svg width="250" height="250" viewBox="0 0 148 148">
        {theme.visuals.compassType === 'radar' && renderRadar()}
        {theme.visuals.compassType === 'fire' && renderFire()}
        {theme.visuals.compassType === 'clock' && renderClock()}

        {/* Círculo central común */}
        <Circle cx="74" cy="74" r="41" fill={theme.colors.card} />
        <Circle cx="74" cy="74" r="39" fill="none" stroke={theme.colors.border} strokeWidth="1" />
        
        {/* Texto central dinámico */}
        <SvgText x="74" y="64" textAnchor="middle" fontSize="6.5" fill={theme.colors.textMuted} fontWeight="bold" letterSpacing="1">
          {theme.id === 'ALTAR' ? 'ÉPOCA ACTUAL' : 'FASE ACTUAL'}
        </SvgText>
        <SvgText x="74" y="76" textAnchor="middle" fontSize="11" fill={theme.colors.text} fontWeight="bold">
          {phaseLabel.toUpperCase()}
        </SvgText>
        <SvgText x="74" y="86" textAnchor="middle" fontSize="7.5" fill={theme.colors.textMuted}>
          Día {dayOfCycle} de {cycleLength}
        </SvgText>

        {/* Indicador orbital */}
        <AnimatedG animatedProps={indicatorProps}>
          <Circle cx="74" cy="11" r="6" fill={theme.colors.accent} stroke={theme.colors.primary} strokeWidth="2" />
          <Circle cx="74" cy="11" r="2" fill={theme.colors.primary} />
        </AnimatedG>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
});
