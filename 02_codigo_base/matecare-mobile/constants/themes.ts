import { ThinkingLevel } from "@google/genai";

export type ThemeType = 'NEVERLAND' | 'ETHEREAL' | 'DRAGON' | 'CYBER';

export interface ThemeColors {
  primary: string;
  secondary: string;  
  accent: string;     
  background: string; 
  backgroundSecondary: string;
  card: string;
  cardElevated: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  glow: string;
  glowStrong: string;
  border: string;
  borderSubtle: string;
  success: string;
  warning: string;
  error: string;
  
  phases: {
    MENSTRUAL: string;
    FOLLICULAR: string;
    OVULATION: string;
    LUTEAL: string;
  };

  shadows: {
    small: string;
    medium: string;
    large: string;
    glow: string;
  };
}

export interface ThemeDefinition {
  id: ThemeType;
  name: string;
  colors: ThemeColors;
  typography: {
    titleFont: string;
    boldFont: string;
    bodyFont: string;
  };
  visuals: {
    hudName: string;
    emojiSet: {
      status: string;
      mission: string;
      rec: string;
    };
    hasGlowEffect: boolean;
    goldGradient?: string[];
    material: {
      blurIntensity: number;
      progressType: 'linear' | 'segmented';
      animationStyle: 'pulse' | 'aura' | 'none';
    };
  };
}

export const THEMES: Record<ThemeType, ThemeDefinition> = {
  NEVERLAND: {
    id: 'NEVERLAND',
    name: 'Bosque Orgánico',
    colors: {
      primary: '#033319',
      secondary: '#C9A227',
      accent: '#E4C34A',
      background: '#022211',
      backgroundSecondary: '#033D1F',
      card: 'rgba(255, 255, 255, 0.06)',
      cardElevated: 'rgba(255, 255, 255, 0.10)',
      text: '#FAFAFA',
      textMuted: '#A8B5A8',
      textSubtle: '#6B7A6B',
      glow: 'rgba(228, 195, 74, 0.25)',
      glowStrong: 'rgba(228, 195, 74, 0.5)',
      border: 'rgba(255, 255, 255, 0.10)',
      borderSubtle: 'rgba(255, 255, 255, 0.05)',
      success: '#4ADE80',
      warning: '#FBBF24',
      error: '#F87171',
      phases: {
        MENSTRUAL: '#F87171',
        FOLLICULAR: '#E4C34A',
        OVULATION: '#4ADE80',
        LUTEAL: '#C9A227'
      },
      shadows: {
        small: 'rgba(0, 0, 0, 0.15)',
        medium: 'rgba(0, 0, 0, 0.25)',
        large: 'rgba(0, 0, 0, 0.4)',
        glow: 'rgba(228, 195, 74, 0.35)'
      }
    },
    typography: { 
      titleFont: 'OpenSans-Bold',
      boldFont: 'OpenSans-Bold',
      bodyFont: 'OpenSans-Regular'
    },
    visuals: {
      hudName: 'ORÁCULO',
      emojiSet: { status: '🌿', mission: '📜', rec: '✨' },
      hasGlowEffect: true,
      goldGradient: ['#C9A227', '#E4C34A', '#C9A227'],
      material: { blurIntensity: 20, progressType: 'linear', animationStyle: 'pulse' }
    }
  },
  ETHEREAL: {
    id: 'ETHEREAL',
    name: 'Misterio Etéreo',
    colors: {
      primary: '#4A2560',
      secondary: '#F0D9B5',
      accent: '#E8A8D8',
      background: '#1A2530',
      backgroundSecondary: '#243040',
      card: 'rgba(74, 37, 96, 0.35)',
      cardElevated: 'rgba(74, 37, 96, 0.50)',
      text: '#FAFAFA',
      textMuted: '#B8B0C0',
      textSubtle: '#787080',
      glow: 'rgba(232, 168, 216, 0.35)',
      glowStrong: 'rgba(232, 168, 216, 0.6)',
      border: 'rgba(240, 217, 181, 0.15)',
      borderSubtle: 'rgba(240, 217, 181, 0.08)',
      success: '#A8E8C0',
      warning: '#F0D9B5',
      error: '#E94560',
      phases: {
        MENSTRUAL: '#E94560',
        FOLLICULAR: '#E8A8D8',
        OVULATION: '#F0D9B5',
        LUTEAL: '#8B5CA8'
      },
      shadows: {
        small: 'rgba(0, 0, 0, 0.2)',
        medium: 'rgba(0, 0, 0, 0.35)',
        large: 'rgba(0, 0, 0, 0.5)',
        glow: 'rgba(232, 168, 216, 0.4)'
      }
    },
    typography: { 
      titleFont: 'OpenSans-Bold',
      boldFont: 'OpenSans-Bold',
      bodyFont: 'OpenSans-Regular'
    },
    visuals: {
      hudName: 'PRISMA',
      emojiSet: { status: '🔮', mission: '💠', rec: '🌟' },
      hasGlowEffect: true,
      material: { blurIntensity: 30, progressType: 'segmented', animationStyle: 'aura' }
    }
  },
  DRAGON: {
    id: 'DRAGON',
    name: 'Fuego Imperial',
    colors: {
      primary: '#C42B08',
      secondary: '#F0A500',
      accent: '#FF8C1A',
      background: '#1C1A18',
      backgroundSecondary: '#2A2624',
      card: 'rgba(44, 40, 36, 0.85)',
      cardElevated: 'rgba(60, 54, 48, 0.9)',
      text: '#FAFAF8',
      textMuted: '#B8A898',
      textSubtle: '#786858',
      glow: 'rgba(255, 140, 26, 0.35)',
      glowStrong: 'rgba(255, 140, 26, 0.6)',
      border: 'rgba(240, 165, 0, 0.25)',
      borderSubtle: 'rgba(240, 165, 0, 0.12)',
      success: '#A8D850',
      warning: '#F0A500',
      error: '#C42B08',
      phases: {
        MENSTRUAL: '#C42B08',
        FOLLICULAR: '#FF8C1A',
        OVULATION: '#F0A500',
        LUTEAL: '#5A504A'
      },
      shadows: {
        small: 'rgba(0, 0, 0, 0.25)',
        medium: 'rgba(0, 0, 0, 0.4)',
        large: 'rgba(0, 0, 0, 0.55)',
        glow: 'rgba(255, 140, 26, 0.5)'
      }
    },
    typography: { 
      titleFont: 'OpenSans-Bold',
      boldFont: 'OpenSans-Bold',
      bodyFont: 'OpenSans-Regular'
    },
    visuals: {
      hudName: 'IMPERIUM',
      emojiSet: { status: '🐉', mission: '⚔️', rec: '🔥' },
      hasGlowEffect: true,
      material: { blurIntensity: 15, progressType: 'linear', animationStyle: 'pulse' }
    }
  },
  CYBER: {
    id: 'CYBER',
    name: 'Neural Interface',
    colors: {
      primary: '#030025',
      secondary: '#00C8FF',
      accent: '#FF10F0',
      background: '#020018',
      backgroundSecondary: '#080830',
      card: 'rgba(0, 200, 255, 0.06)',
      cardElevated: 'rgba(0, 200, 255, 0.12)',
      text: '#F0F8FF',
      textMuted: '#00C8FF',
      textSubtle: '#0088AA',
      glow: 'rgba(0, 200, 255, 0.35)',
      glowStrong: 'rgba(0, 200, 255, 0.6)',
      border: 'rgba(0, 200, 255, 0.5)',
      borderSubtle: 'rgba(0, 200, 255, 0.25)',
      success: '#00FF88',
      warning: '#FFD000',
      error: '#FF10F0',
      phases: {
        MENSTRUAL: '#FF10F0',
        FOLLICULAR: '#00C8FF',
        OVULATION: '#00FF88',
        LUTEAL: '#1A1850'
      },
      shadows: {
        small: 'rgba(0, 0, 0, 0.3)',
        medium: 'rgba(0, 0, 0, 0.5)',
        large: 'rgba(0, 0, 0, 0.7)',
        glow: 'rgba(0, 200, 255, 0.5)'
      }
    },
    typography: { 
      titleFont: 'OpenSans-Bold',
      boldFont: 'OpenSans-Bold',
      bodyFont: 'OpenSans-Regular'
    },
    visuals: {
      hudName: 'CORE-HUD',
      emojiSet: { status: '🤖', mission: '📡', rec: '💾' },
      hasGlowEffect: true,
      material: { blurIntensity: 40, progressType: 'segmented', animationStyle: 'aura' }
    }
  }
};
