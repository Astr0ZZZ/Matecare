/**
 * MateCare Premium Theme Registry - High Engineering Edition
 * Basado en la Guía Técnica de Arquitectura e Ingeniería de Bienestar.
 */

export type ThemeType = 'NEVERLAND' | 'ETHEREAL' | 'DRAGON' | 'CYBER';

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
  typography: {
    titleFont: string;
    bodyFont: string;
    boldFont: string;
  };
  visuals: {
    hudName: string;
    emojiSet: {
      mission: string;
      rec: string;
      status: string;
      phase: string;
    };
    tabIcons: {
      centro: string;
      chat: string;
      calendar: string;
      profile: string;
    };
    material: {
      blurIntensity: number;
      glowSpread: number;
      animationStyle: 'organic' | 'aura' | 'turbulence' | 'flicker';
      progressStyle: 'smooth' | 'segmented';
    };
    hasGlowEffect: boolean;
    compassType: 'radar' | 'fire' | 'clock' | 'cyber';
    goldGradient: readonly [string, string, ...string[]]; 
  }
}

export const THEMES: Record<ThemeType, ThemeDefinition> = {
  NEVERLAND: {
    id: 'NEVERLAND',
    name: 'Bosque Orgánico',
    colors: {
      primary: '#044422',
      secondary: '#B8860B',
      accent: '#CFAA3C',
      background: '#044422',
      card: 'rgba(255, 255, 255, 0.08)',
      text: '#FFFFFF',
      textMuted: '#8F8F8F',
      glow: 'rgba(207, 170, 60, 0.3)',
      border: 'rgba(255, 255, 255, 0.15)',
      phases: {
        MENSTRUAL: '#FF4444',
        FOLLICULAR: '#CFAA3C',
        OVULATION: '#4CAF50',
        LUTEAL: '#B8860B'
      }
    },
    typography: { 
      titleFont: 'OpenSans-Bold', 
      bodyFont: 'OpenSans-Regular',
      boldFont: 'OpenSans-Bold'
    },
    visuals: {
      hudName: 'CYCLE COMPASS',
      emojiSet: {
        mission: '🌿',
        rec: '✨',
        status: '🧘',
        phase: '🧪'
      },
      tabIcons: {
        centro: 'leaf',
        chat: 'chatbubble-ellipses',
        calendar: 'calendar',
        profile: 'person'
      },
      material: {
        blurIntensity: 20,
        glowSpread: 10,
        animationStyle: 'organic',
        progressStyle: 'smooth'
      },
      hasGlowEffect: true,
      compassType: 'radar',
      goldGradient: ['#8f6B29', '#FDE08D', '#DF9F28'] as const
    }
  },
  ETHEREAL: {
    id: 'ETHEREAL',
    name: 'Misterio Etéreo',
    colors: {
      primary: '#572D6A',
      secondary: '#E8CBA0',
      accent: '#D698CA',
      background: '#20303D',
      card: 'rgba(87, 45, 106, 0.4)',
      text: '#FFFFFF',
      textMuted: '#A0A0A0',
      glow: 'rgba(214, 152, 202, 0.5)', 
      border: 'rgba(232, 203, 160, 0.2)',
      phases: {
        MENSTRUAL: '#E94560',
        FOLLICULAR: '#D698CA',
        OVULATION: '#E8CBA0',
        LUTEAL: '#533483'
      }
    },
    typography: { 
      titleFont: 'OpenSans-Bold', 
      bodyFont: 'OpenSans-Regular',
      boldFont: 'OpenSans-Bold'
    },
    visuals: {
      hudName: 'ORÁCULO DE CICLO',
      emojiSet: {
        mission: '🔮',
        rec: '🪄',
        status: '🌙',
        phase: '💎'
      },
      tabIcons: {
        centro: 'planet',
        chat: 'sparkles',
        calendar: 'moon',
        profile: 'eye'
      },
      material: {
        blurIntensity: 35,
        glowSpread: 25,
        animationStyle: 'aura',
        progressStyle: 'smooth'
      },
      hasGlowEffect: true,
      compassType: 'clock',
      goldGradient: ['#E8CBA0', '#FFDAB9', '#D2B48C'] as const
    }
  },
  DRAGON: {
    id: 'DRAGON',
    name: 'Ruleta de Fuego',
    colors: {
      primary: '#B62203',
      secondary: '#DA9202',
      accent: '#FF7500',
      background: '#2B2B2A',
      card: 'rgba(43, 43, 42, 0.8)',
      text: '#FFFFFF',
      textMuted: '#888888',
      glow: 'rgba(182, 34, 3, 0.6)', 
      border: 'rgba(218, 146, 2, 0.3)',
      phases: {
        MENSTRUAL: '#B62203',
        FOLLICULAR: '#FF7500',
        OVULATION: '#DA9202',
        LUTEAL: '#4A4A4A'
      }
    },
    typography: { 
      titleFont: 'OpenSans-Bold', 
      bodyFont: 'OpenSans-Regular',
      boldFont: 'OpenSans-Bold'
    },
    visuals: {
      hudName: 'INDICADOR DE BATALLA',
      emojiSet: {
        mission: '🐉',
        rec: '🔥',
        status: '⚔️',
        phase: '🏰'
      },
      tabIcons: {
        centro: 'flame',
        chat: 'shield',
        calendar: 'skull',
        profile: 'trophy'
      },
      material: {
        blurIntensity: 10,
        glowSpread: 15,
        animationStyle: 'turbulence',
        progressStyle: 'smooth'
      },
      hasGlowEffect: true,
      compassType: 'fire',
      goldGradient: ['#B62203', '#FF7500', '#DA9202'] as const
    }
  },
  CYBER: {
    id: 'CYBER',
    name: 'Hacker / Jarvis',
    colors: {
      primary: '#020021',
      secondary: '#00AEFF',
      accent: '#FC0FF5',
      background: '#020021',
      card: 'rgba(0, 174, 255, 0.05)',
      text: '#FFFFFF',
      textMuted: '#00AEFF',
      glow: 'rgba(0, 174, 255, 0.4)', 
      border: 'rgba(0, 174, 255, 0.6)',
      phases: {
        MENSTRUAL: '#FC0FF5',
        FOLLICULAR: '#00AEFF',
        OVULATION: '#39FF14',
        LUTEAL: '#1A1A40'
      }
    },
    typography: { 
      titleFont: 'OpenSans-Bold', 
      bodyFont: 'OpenSans-Regular',
      boldFont: 'OpenSans-Bold'
    },
    visuals: {
      hudName: 'HUD DE ESTADO',
      emojiSet: {
        mission: '💻',
        rec: '🤖',
        status: '⚡',
        phase: '💀'
      },
      tabIcons: {
        centro: 'grid',
        chat: 'terminal',
        calendar: 'pulse',
        profile: 'hardware-chip'
      },
      material: {
        blurIntensity: 5,
        glowSpread: 8,
        animationStyle: 'flicker',
        progressStyle: 'segmented'
      },
      hasGlowEffect: false,
      compassType: 'cyber',
      goldGradient: ['#00AEFF', '#00FBFF', '#0044FF'] as const
    }
  }
};
