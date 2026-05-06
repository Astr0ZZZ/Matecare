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

vec3 goldColor(float t) {
    vec3 c1 = vec3(0.75, 0.58, 0.25);
    vec3 c2 = vec3(1.0, 0.96, 0.73);
    vec3 c3 = vec3(0.5, 0.3, 0.1);
    float pulse = sin(t * 2.0) * 0.5 + 0.5;
    return mix(mix(c1, c2, pulse), c3, 1.0 - pulse);
}

vec4 main(vec2 pos) {
    vec2 uv = pos / u_resolution;
    float shine = sin(uv.x * 10.0 + uv.y * 5.0 + u_time * 3.0);
    shine = smoothstep(0.7, 0.95, shine);
    vec3 base = goldColor(u_time * 0.5);
    vec3 final = mix(base, vec3(1.0, 1.0, 0.9), shine * 0.6);
    float d = distance(uv, vec2(0.5));
    final *= smoothstep(0.8, 0.2, d);
    return vec4(final, 1.0);
}
`)!;

export const GoldShader = ({ width, height }: { width: number, height: number }) => {
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(100, { duration: 100000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

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
