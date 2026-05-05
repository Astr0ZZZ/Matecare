import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  Easing, 
  useDerivedValue,
  withRepeat,
  interpolate
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface CycleCompassHUDProps {
  dayOfCycle: number;
  cycleLength?: number;
  phaseLabel: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export default function CycleCompassHUD({ dayOfCycle, cycleLength = 28, phaseLabel }: CycleCompassHUDProps) {
  const { theme } = useTheme();
  
  // Constantes de dibujo
  const radio = 90;
  const strokeWidth = 18;
  const circunferencia = 2 * Math.PI * radio;
  const porcentaje = dayOfCycle / cycleLength;

  // Valores compartidos para animaciones
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    // Animación de carga con curva Bezier premium sugerida
    progress.value = withTiming(porcentaje, {
      duration: 2500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Rotación del indicador
    const angle = (dayOfCycle / cycleLength) * 360 - 90;
    rotation.value = withTiming(angle, { duration: 2500, easing: Easing.out(Easing.exp) });

    // Efecto de pulso para el glow
    glow.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
  }, [dayOfCycle, cycleLength]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circunferencia - (progress.value * circunferencia),
  }));

  const indicatorProps = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
    originX: 110,
    originY: 110,
  }));

  return (
    <View style={styles.container}>
      <Svg width={240} height={240} viewBox="0 0 220 220">
        <Defs>
          <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            {theme.visuals.goldGradient?.map((color, i) => (
              <Stop key={i} offset={`${(i / (theme.visuals.goldGradient!.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>

        {/* Fondo (Platino o color de tema) */}
        <Circle 
          cx="110" cy="110" r={radio} 
          stroke={theme.colors.border} 
          strokeWidth={strokeWidth} 
          fill="none" 
          opacity={0.3}
        />

        {/* Trazo de Progreso (Obsidiana o color principal) */}
        <AnimatedCircle
          cx="110" cy="110" r={radio}
          stroke={theme.id === 'LUNAR' ? "url(#goldGrad)" : theme.colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circunferencia}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
          rotation="-90"
          origin="110, 110"
        />

        {/* Indicador Orbital Premium */}
        <AnimatedG animatedProps={indicatorProps}>
          <Circle 
            cx={110 + radio} cy="110" r="10" 
            fill={theme.colors.card} 
            stroke={theme.colors.accent} 
            strokeWidth="3" 
          />
          <Circle cx={110 + radio} cy="110" r="4" fill={theme.colors.accent} />
        </AnimatedG>

        {/* Decoraciones según el tipo de brújula */}
        {theme.visuals.compassType === 'fire' && (
           <Circle 
             cx="110" cy="110" r={radio + 12} 
             stroke={theme.colors.secondary} 
             strokeWidth="2" 
             strokeDasharray="10 20" 
             opacity={0.5}
           />
        )}
      </Svg>

      <View style={styles.textoCentral}>
        <Text style={[styles.faseLabel, { color: theme.colors.textMuted }]}>
          {theme.id === 'ALTAR' ? 'ÉPOCA' : 'FASE ACTUAL'}
        </Text>
        <Text style={[styles.diaTexto, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
          {phaseLabel.toUpperCase()}
        </Text>
        <Text style={[styles.progresoSub, { color: theme.colors.textMuted }]}>
          DÍA {dayOfCycle} DE {cycleLength}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginVertical: 20 
  },
  textoCentral: { 
    position: 'absolute', 
    alignItems: 'center',
    width: 140,
  },
  faseLabel: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  diaTexto: { 
    fontSize: 18, 
    textAlign: 'center',
  },
  progresoSub: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  }
});
