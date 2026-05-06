import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

interface AnimatedLogoProps {
  size?: number;
  glowColor?: string;
}

export default function AnimatedLogo({ 
  size = 160,
  glowColor = 'rgba(207, 170, 60, 0.35)'
}: AnimatedLogoProps) {
  
  // Phase 1: Materialization
  const appear = useSharedValue(0);
  // Phase 2: Levitation  
  const floatY = useSharedValue(0);
  const breathe = useSharedValue(1);
  const glowPulse = useSharedValue(0);
  // Phase 3: Subtle rotation
  const rotation = useSharedValue(0);

  useEffect(() => {
    // ═══ PHASE 1: Logo materializes (0 → 1 over 1.5s) ═══
    appear.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.exp),
    });

    // ═══ PHASE 2: After materialization, start levitation ═══
    const delay = 1800;

    // Gentle float up and down
    floatY.value = withDelay(delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: 2500, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      )
    );

    // Subtle breathing scale
    breathe.value = withDelay(delay,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.97, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      )
    );

    // Glow pulse
    glowPulse.value = withDelay(delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      )
    );

    // Very slow, subtle rotation
    rotation.value = withDelay(delay,
      withRepeat(
        withSequence(
          withTiming(3, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(-3, { duration: 4000, easing: Easing.inOut(Easing.sin) })
        ),
        -1, true
      )
    );
  }, []);

  // Materialization style
  const logoStyle = useAnimatedStyle(() => {
    const scale = interpolate(appear.value, [0, 0.6, 1], [0.3, 1.08, 1], Extrapolation.CLAMP);
    const opacity = interpolate(appear.value, [0, 0.4, 1], [0, 0.8, 1], Extrapolation.CLAMP);
    const blur = interpolate(appear.value, [0, 0.5, 1], [10, 2, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { scale: scale * breathe.value },
        { translateY: floatY.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  // Glow style
  const glowStyle = useAnimatedStyle(() => {
    const baseOpacity = interpolate(appear.value, [0, 0.8, 1], [0, 0, 0.5], Extrapolation.CLAMP);
    return {
      opacity: baseOpacity * glowPulse.value,
      transform: [
        { scale: breathe.value * 1.1 },
      ],
    };
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: size + 20 }}>
      {/* Golden glow behind logo */}
      <Animated.View style={[{
        position: 'absolute',
        width: size * 0.8,
        height: size * 0.8,
        borderRadius: size * 0.4,
        backgroundColor: glowColor,
      }, glowStyle]} />

      {/* The logo */}
      <Animated.Image
        source={require('../assets/images/logo_premium.png')}
        style={[
          {
            width: size,
            height: size,
          },
          logoStyle
        ]}
        resizeMode="contain"
      />
    </View>
  );
}
