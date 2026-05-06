export const SPACING = {
  xxs: 2,
  xs: 4, 
  sm: 8, 
  md: 16, 
  lg: 24, 
  xl: 32, 
  xxl: 48,
  xxxl: 64
};

export const RADIUS = {
  xs: 2,
  sm: 6, 
  md: 12, 
  lg: 18, 
  xl: 24, 
  xxl: 32,
  full: 999
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'OpenSans-Regular',
    semiBold: 'OpenSans-SemiBold', 
    bold: 'OpenSans-Bold',
    title: 'OpenSans-Bold'
  },
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 26,
    xxxl: 32,
    display: 40
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
    wider: 2,
    widest: 3
  },
  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6
  }
};

export const SHADOWS = {
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  }
};

export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150
  }
};
