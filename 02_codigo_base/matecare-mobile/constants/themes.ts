/**
 * MateCare Theme Registry
 * Aquí definimos el "Contrato" de lo que debe tener un tema para ser válido.
 */

export type ThemeType = 'TACTICAL' | 'ALTAR' | 'LUNAR';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  text: string;
  textMuted: string;
  glow: string;
  border: string;
  
  // Colores específicos por fase (pueden ser override por tema)
  phases: {
    MENSTRUAL: string;
    FOLLICULAR: string;
    OVULATION: string;
    LUTEAL: string;
  }
}

export interface ThemeIcons {
  home: string;
  chat: string;
  calendar: string;
  profile: string;
  mission: string;
  recommendation: string;
  phaseIndicator: string;
}

export interface ThemeDefinition {
  id: ThemeType;
  name: string;
  colors: ThemeColors;
  icons: ThemeIcons;
  typography: {
    titleFont: string;
    bodyFont: string;
  };
  visuals: {
    bgPattern?: 'dots' | 'marble' | 'plain';
    hasGlowEffect: boolean;
    compassType: 'radar' | 'fire' | 'clock';
  }
}

export const THEMES: Record<ThemeType, ThemeDefinition> = {
  TACTICAL: {
    id: 'TACTICAL',
    name: 'Operación Táctica',
    colors: {
      primary: '#1A531A',
      secondary: '#437A43',
      accent: '#B57D2C',
      background: '#F9F5F0',
      card: '#FFFFFF',
      text: '#4D5656',
      textMuted: '#95A5A6',
      glow: 'rgba(26, 83, 26, 0.1)',
      border: '#D5DBDB',
      phases: {
        MENSTRUAL: '#1A531A',
        FOLLICULAR: '#437A43',
        OVULATION: '#B57D2C',
        LUTEAL: '#95A5A6'
      }
    },
    icons: {
      home: 'home',
      chat: 'chatbubbles',
      calendar: 'calendar',
      profile: 'person',
      mission: 'flash-outline',
      recommendation: 'bulb-outline',
      phaseIndicator: 'shield-checkmark-outline'
    },
    typography: {
      titleFont: 'OpenSans-Bold',
      bodyFont: 'OpenSans-Regular'
    },
    visuals: {
      bgPattern: 'dots',
      hasGlowEffect: false,
      compassType: 'radar'
    }
  },
  ALTAR: {
    id: 'ALTAR',
    name: 'Altar de Fuego',
    colors: {
      primary: '#1A3626',
      secondary: '#dc2626',
      accent: '#fbbf24',
      background: '#FDFBF7',
      card: '#FFFFFF',
      text: '#000000',
      textMuted: '#1A3626',
      glow: '#991b1b',
      border: '#E8E2D2',
      phases: {
        MENSTRUAL: '#dc2626',
        FOLLICULAR: '#ea580c',
        OVULATION: '#fbbf24',
        LUTEAL: '#991b1b'
      }
    },
    icons: {
      home: 'home',
      chat: 'chatbubble-ellipses',
      calendar: 'document-text',
      profile: 'shield',
      mission: 'scroll', // Requiere mapeo o uso de FontAwesome/etc
      recommendation: 'flame',
      phaseIndicator: 'flame'
    },
    typography: {
      titleFont: 'OpenSans-Bold',
      bodyFont: 'OpenSans-Regular'
    },
    visuals: {
      bgPattern: 'plain',
      hasGlowEffect: true,
      compassType: 'fire'
    }
  },
  LUNAR: {
    id: 'LUNAR',
    name: 'Reloj Lunar',
    colors: {
      primary: '#1A3626',
      secondary: '#8B9D77',
      accent: '#C28F3D',
      background: '#FDFBF7',
      card: '#FFFFFF',
      text: '#1A3626',
      textMuted: '#8B9D77',
      glow: 'rgba(194, 143, 61, 0.2)',
      border: '#E8E2D2',
      phases: {
        MENSTRUAL: '#1A3626',
        FOLLICULAR: '#8B9D77',
        OVULATION: '#C28F3D',
        LUTEAL: '#5C7064'
      }
    },
    icons: {
      home: 'home',
      chat: 'chatbubble-outline',
      calendar: 'calendar-clear-outline',
      profile: 'person-outline',
      mission: 'sword',
      recommendation: 'book-outline',
      phaseIndicator: 'moon-outline'
    },
    typography: {
      titleFont: 'OpenSans-Bold',
      bodyFont: 'OpenSans-Regular'
    },
    visuals: {
      bgPattern: 'dots',
      hasGlowEffect: true,
      compassType: 'clock'
    }
  }
};
