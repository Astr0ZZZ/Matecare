import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';

interface AnimatedSpriteLogoProps {
  width: number;
  height: number;
  source: any;
  fps?: number;
  loop?: boolean;
}

export default function AnimatedSpriteLogo({ 
  width, 
  height, 
  source, 
  fps = 14,
  loop = false  // Default: NO loop - play once then levitate
}: AnimatedSpriteLogoProps) {
  
  const columns = 7;
  const rows = 4;
  const totalFrames = 28;
  
  const frame = useSharedValue(0);
  const floatY = useSharedValue(0);
  const floatScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    const duration = (totalFrames / fps) * 1000;
    
    if (loop) {
      // Loop mode: repeat forever
      frame.value = withRepeat(
        withTiming(totalFrames - 1, {
          duration: duration,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      // Play once, then hold on last frame and start levitating
      frame.value = withTiming(totalFrames - 1, {
        duration: duration,
        easing: Easing.linear,
      });
      
      // Start levitation after assembly completes
      const levitationDelay = duration + 200;
      
      // Gentle up-down floating
      floatY.value = withDelay(
        levitationDelay,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            withTiming(6, { duration: 2000, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
      
      // Subtle breathing scale
      floatScale.value = withDelay(
        levitationDelay,
        withRepeat(
          withSequence(
            withTiming(1.03, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.98, { duration: 3000, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
      
      // Subtle glow pulse
      glowOpacity.value = withDelay(
        levitationDelay,
        withRepeat(
          withSequence(
            withTiming(0.4, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.1, { duration: 2500, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
    }
  }, [fps, totalFrames, loop]);

  const spriteStyle = useAnimatedStyle(() => {
    const currentFrame = Math.floor(Math.min(frame.value, totalFrames - 1));
    const col = currentFrame % columns;
    const row = Math.floor(currentFrame / columns);

    return {
      transform: [
        { translateX: -col * width },
        { translateY: -row * height },
      ],
    };
  });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: floatScale.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, containerStyle]}>
      {/* Subtle glow behind logo */}
      <Animated.View style={[{
        position: 'absolute',
        width: width * 0.7,
        height: width * 0.7,
        borderRadius: width * 0.35,
        backgroundColor: 'rgba(207, 170, 60, 0.3)',
      }, glowStyle]} />
      
      <View style={{ 
        width, 
        height, 
        overflow: 'hidden',
        backgroundColor: 'transparent'
      }}>
        <Animated.Image 
          source={source}
          style={[
            {
              width: width * columns,
              height: height * rows,
              position: 'absolute',
            },
            spriteStyle
          ]}
          resizeMode="stretch"
        />
      </View>
    </Animated.View>
  );
}
