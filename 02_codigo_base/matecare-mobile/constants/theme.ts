// MateCare — Design tokens
// Paleta "Vitalidad Equilibrada" — light + dark mode
// Usar estos valores en TODOS los componentes. Nunca hardcodear colores fuera de este archivo.

export const COLORS = {

  // ── LIGHT MODE ──────────────────────────────────────────
  light: {
    // Fondos
    bgPrimary:    '#F9F5F0',   // fondo principal (crema suave)
    bgSecondary:  '#F2EBE1',   // fondo alternativo (compass, inputs)
    bgCard:       '#FFFFFF',   // cards sobre fondo crema

    // Marca
    greenDark:    '#1A531A',   // headers, CTAs, botones primarios, navbar activo
    greenMid:     '#437A43',   // base soft, tags foliacular
    gold:         '#B57D2C',   // acción, energía, barras de progreso, acento
    goldLight:    '#D4A35D',   // acción light, highlights suaves

    // Texto
    textPrimary:  '#4D5656',   // texto principal
    textSecondary:'#7A8C8C',   // texto secundario (nuevo)
    textMuted:    '#95A5A6',   // texto secundario, labels, placeholders

    // Estructura
    divider:      '#D5DBDB',   // bordes, separadores
    overlay:      'rgba(26,83,26,0.08)',  // hover states

    // Fases
    menstrualBg:  '#E8F0E8',
    menstrualText:'#1A531A',
    follicularBg: '#E2ECD4',
    follicularText:'#437A43',
    ovulationBg:  '#F5E9D5',
    ovulationText:'#B57D2C',
    lutealBg:     '#F2EBE1',
    lutealText:   '#95A5A6',
  },

  // ── DARK MODE ───────────────────────────────────────────
  dark: {
    // Fondos
    bgPrimary:    '#141A14',   // fondo principal (verde muy oscuro, no negro puro)
    bgSecondary:  '#1C261C',   // fondo alternativo (compass, inputs)
    bgCard:       '#1E2A1E',   // cards sobre fondo oscuro

    // Marca — mismos valores, funcionan bien sobre oscuro
    greenDark:    '#2A7A2A',   // headers, CTAs (un tono más claro para contraste)
    greenMid:     '#5A9A5A',   // base soft
    gold:         '#C8921A',   // acción, energía (ligeramente más saturado)
    goldLight:    '#D4A35D',   // acción light

    // Texto
    textPrimary:  '#E8F0E8',   // texto principal (crema verdoso)
    textMuted:    '#7A9090',   // texto secundario

    // Estructura
    divider:      '#2A3A2A',   // bordes, separadores
    overlay:      'rgba(168,213,162,0.08)',

    // Fases
    menstrualBg:  '#1C2E1C',
    menstrualText:'#A8D5A2',
    follicularBg: '#1E3018',
    follicularText:'#90C060',
    ovulationBg:  '#2E2010',
    ovulationText:'#D4A35D',
    lutealBg:     '#252020',
    lutealText:   '#909A9A',
  },
} as const

// ── Tipografía ─────────────────────────────────────────────
export const TYPOGRAPHY = {
  fontFamily: {
    regular:  'OpenSans-Regular',
    semiBold: 'OpenSans-SemiBold',
    bold:     'OpenSans-Bold',
  },
  sizes: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    xxl:  28,
  },
  weights: {
    regular: '400' as const,
    medium:  '500' as const,
    bold:    '600' as const,
  },
} as const

// ── Espaciado ──────────────────────────────────────────────
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const

// ── Radios de borde ────────────────────────────────────────
export const RADIUS = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  full: 999,
} as const
