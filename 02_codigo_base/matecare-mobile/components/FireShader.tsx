import React, { useEffect } from 'react';
import { 
  Canvas, 
  Shader, 
  Skia, 
  Fill,
} from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';

const source = Skia.RuntimeEffect.Make(`
uniform float u_time;
uniform vec2 u_resolution;

float snoise(vec2 v) {
  return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
}

float fbm(vec2 uv) {
    float f = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        f += amp * snoise(uv + u_time * 0.1);
        uv *= 2.1;
        amp *= 0.5;
    }
    return f;
}

vec4 main(vec2 pos) {
    vec2 uv = pos / u_resolution;
    float noise = fbm(uv * 3.0 + vec2(0.0, -u_time * 2.0));
    float distFromCenter = abs(uv.x - 0.5);
    float shape = (1.0 - uv.y) * smoothstep(0.4, 0.1, distFromCenter + uv.y * 0.2);
    float intensity = shape * (0.7 + 0.3 * noise);
    vec3 color1 = vec3(0.9, 0.2, 0.0);
    vec3 color2 = vec3(1.0, 0.8, 0.2);
    vec3 finalColor = mix(color1, color2, intensity);
    return vec4(finalColor * intensity * 1.5, intensity * 0.8);
}
`)!;

export const FireShader = ({ width, height }: { width: number, height: number }) => {
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(100, { duration: 100000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // En Skia 2.x, podemos pasar un objeto de uniformes derivado de Reanimated
  const uniforms = useDerivedValue(() => ({
    u_time: time.value,
    u_resolution: [width, height],
  }));

  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
};
