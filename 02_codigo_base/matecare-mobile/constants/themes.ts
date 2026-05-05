/**
 * MateCare Premium Theme Registry
 */

export type ThemeType = 'TACTICAL' | 'ALTAR' | 'LUNAR';

export interface ThemeColors {
  primary: string;    // Color principal (Obsidiana o Verde Táctico)
  secondary: string;  // Color de acento (Oro o Fuego)
  accent: string;     // Color de realce (Platino o Oro)
  background: string; 
  card: string;
  text: string;
  textMuted: string;
  glow: string;
  border: string;
  
  phases: {
    MENSTRUAL: string;
    FOLLICULAR: string;
    OVULATION: string;
    LUTEAL: string;
  }
}

export interface ThemeDefinition {
  id: ThemeType;
  name: string;
  colors: ThemeColors;
  icons: any;
  typography: {
    titleFont: string;
    bodyFont: string;
  };
  visuals: {
    bgPattern?: 'dots' | 'marble' | 'parchment';
    hasGlowEffect: boolean;
    compassType: 'radar' | 'fire' | 'clock';
    goldGradient?: string[]; // Para efectos Skia
  }
}

export const THEMES: Record<ThemeType, ThemeDefinition> = {
  TACTICAL: {
    id: 'TACTICAL',
    name: 'Operación Táctica',
    colors: {
      primary: '#2C2C2C',      // Obsidiana
      secondary: '#E5E4E2',    // Platino
      accent: '#D4AF37',       // Oro
      background: '#F5F5F5',
      card: '#FFFFFF',
      text: '#2C2C2C',
      textMuted: '#666666',
      glow: 'rgba(229, 228, 226, 0.2)',
      border: '#E5E4E2',
      phases: {
        MENSTRUAL: '#2C2C2C',
        FOLLICULAR: '#4A4A4A',
        OVULATION: '#D4AF37',
        LUTEAL: '#666666'
      }
    },
    icons: {
      mission: 'flash-outline',
      recommendation: 'bulb-outline',
      phaseIndicator: 'shield-checkmark-outline'
    },
    typography: { titleFont: 'OpenSans-Bold', bodyFont: 'OpenSans-Regular' },
    visuals: {
      bgPattern: 'dots',
      hasGlowEffect: false,
      compassType: 'radar',
      goldGradient: ['#BF953F', '#FCF6BA', '#B38728', '#FBF5B7', '#AA771C']
    }
  },
  ALTAR: {
    id: 'ALTAR',
    name: 'Altar Místico',
    colors: {
      primary: '#1A1A2E',      // Azul Medianoche
      secondary: '#FF4D00',    // Fuego Puro
      accent: '#FFD700',       // Oro Brillante
      background: '#0F0F1A',   // Fondo Profundo
      card: '#16213E',         // Cristal Esmerilado (Base)
      text: '#FFFFFF',
      textMuted: '#A0A0A0',
      glow: 'rgba(255, 77, 0, 0.4)',
      border: '#1F4068',
      phases: {
        MENSTRUAL: '#E94560',
        FOLLICULAR: '#0F3460',
        OVULATION: '#FFD700',
        LUTEAL: '#533483'
      }
    },
    icons: {
      mission: 'document-text-outline',
      recommendation: 'flame',
      phaseIndicator: 'flame'
    },
    typography: { titleFont: 'OpenSans-Bold', bodyFont: 'OpenSans-Regular' },
    visuals: {
      bgPattern: 'parchment',
      hasGlowEffect: true,
      compassType: 'fire',
      goldGradient: ['#E6B800', '#FFF3B0', '#B8860B', '#FAD02E']
    }
  },
  LUNAR: {
    id: 'LUNAR',
    name: 'Reloj Imperial',
    colors: {
      primary: '#1A3626',      // Verde Imperial
      secondary: '#D4AF37',    // Oro Real
      accent: '#E5E4E2',       // Platino
      background: '#FDFBF7',   // Mármol Crema
      card: '#FFFFFF',
      text: '#1A3626',
      textMuted: '#5C7064',
      glow: 'rgba(212, 175, 55, 0.2)',
      border: '#E8E2D2',
      phases: {
        MENSTRUAL: '#1A3626',
        FOLLICULAR: '#8B9D77',
        OVULATION: '#D4AF37',
        LUTEAL: '#5C7064'
      }
    },
    icons: {
      mission: 'shield-half-outline',
      recommendation: 'book-outline',
      phaseIndicator: 'moon-outline'
    },
    typography: { titleFont: 'OpenSans-Bold', bodyFont: 'OpenSans-Regular' },
    visuals: {
      bgPattern: 'marble',
      hasGlowEffect: true,
      compassType: 'clock',
      goldGradient: ['#BF953F', '#FCF6BA', '#B38728', '#FBF5B7', '#AA771C']
    }
  }
};
