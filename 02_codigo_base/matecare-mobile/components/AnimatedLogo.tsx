import React from 'react';
import { MotiImage } from 'moti';
import { StyleSheet, ImageStyle } from 'react-native';

const LOGO_SOURCE = require('../assets/logo_transparent.png');

export default function AnimatedLogo() {
  return (
    <MotiImage
      source={LOGO_SOURCE}
      from={{
        opacity: 0,
        scale: 0.8,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: 'timing',
        duration: 1500,
        loop: true,
      } as any}
      style={styles.logo}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 10,
    borderRadius: 90,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  } as ImageStyle,
});
