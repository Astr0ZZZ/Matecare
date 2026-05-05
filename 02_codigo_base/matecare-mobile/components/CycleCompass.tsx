import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '../constants/theme';
import Animated, { useSharedValue, useAnimatedProps, withSpring, withTiming } from 'react-native-reanimated';

interface CycleCompassProps {
  dayOfCycle: number;
  cycleLength?: number;
  phaseLabel: string;
}

const AnimatedG = Animated.createAnimatedComponent(G);

export default function CycleCompass({ dayOfCycle, cycleLength = 28, phaseLabel }: CycleCompassProps) {
  // Rotate indicator based on current day
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Calculate angle: Day 1 is 0 degrees (top). 
    const angle = ((dayOfCycle - 1) / cycleLength) * 360;
    rotation.value = withSpring(angle, { damping: 15, stiffness: 90 });
  }, [dayOfCycle, cycleLength]);

  const animatedProps = useAnimatedProps(() => ({
    rotation: rotation.value,
    origin: '74, 74'
  }));

  // Define SVG elements from mockup
  return (
    <View style={styles.container}>
      <Svg width="250" height="250" viewBox="0 0 148 148">
        {/* Arcos (Fases) */}
        {/* Menstrual: gris */}
        <Path d="M74,11 A63,63 0 0,1 125.5,42.5" fill="none" stroke="#95A5A6" strokeWidth="22" />
        {/* Folicular: moss */}
        <Path d="M125.5,42.5 A63,63 0 0,1 125.5,105.5" fill="none" stroke="#839958" strokeWidth="22" />
        {/* Ovulación: gold */}
        <Path d="M125.5,105.5 A63,63 0 0,1 74,137" fill="none" stroke="#B57D2C" strokeWidth="22" />
        {/* Lútea: midnight */}
        <Path d="M74,137 A63,63 0 0,1 22.5,42.5" fill="none" stroke="#105666" strokeWidth="22" />
        
        {/* Divisores blancos */}
        <Line x1="74" y1="11" x2="74" y2="33" stroke="#F9F5F0" strokeWidth="2.5" />
        <Line x1="125.5" y1="42.5" x2="107" y2="53" stroke="#F9F5F0" strokeWidth="2.5" />
        <Line x1="125.5" y1="105.5" x2="107" y2="95" stroke="#F9F5F0" strokeWidth="2.5" />
        <Line x1="74" y1="137" x2="74" y2="115" stroke="#F9F5F0" strokeWidth="2.5" />
        <Line x1="22.5" y1="42.5" x2="41" y2="53" stroke="#F9F5F0" strokeWidth="2.5" />
        
        {/* Etiquetas estáticas de fases en la rueda */}
        <SvgText x="102" y="30" textAnchor="middle" fontSize="6.5" fill="#ffffff" fontWeight="600">Mens.</SvgText>
        <SvgText x="129" y="76" textAnchor="middle" fontSize="6.5" fill="#ffffff" fontWeight="600">Folic.</SvgText>
        <SvgText x="106" y="124" textAnchor="middle" fontSize="6.5" fill="#ffffff" fontWeight="600">Ovul.</SvgText>
        <SvgText x="30" y="100" textAnchor="middle" fontSize="6.5" fill="#ffffff" fontWeight="600">Lútea</SvgText>

        {/* Círculo central */}
        <Circle cx="74" cy="74" r="41" fill="#F9F5F0" />
        <Circle cx="74" cy="74" r="39" fill="none" stroke="#D5DBDB" strokeWidth="1" />

        {/* Textos del centro */}
        <SvgText x="74" y="64" textAnchor="middle" fontSize="6.5" fill="#95A5A6" fontWeight="600" letterSpacing="0.5">
          FASE ACTUAL
        </SvgText>
        <SvgText x="74" y="76" textAnchor="middle" fontSize="11" fill="#0A3323" fontWeight="700">
          {phaseLabel.toUpperCase()}
        </SvgText>
        <SvgText x="74" y="86" textAnchor="middle" fontSize="7.5" fill="#4D5656">
          Día {dayOfCycle} de {cycleLength}
        </SvgText>

        {/* Indicador animado (Flecha apuntando hacia arriba por defecto) */}
        <AnimatedG animatedProps={animatedProps}>
          {/* Apuntamos hacia arriba (Y menor): desde centro a Y=33 */}
          <Line x1="74" y1="74" x2="74" y2="35" stroke="#B57D2C" strokeWidth="2.5" strokeLinecap="round" />
          <Circle cx="74" cy="35" r="5" fill="#B57D2C" />
          <Circle cx="74" cy="74" r="5" fill="#0A3323" />
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
