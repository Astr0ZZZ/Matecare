// Paleta "Vitalidad Equilibrada" — MateCare
// Light mode / Dark mode por fase
export const PHASES = {
  MENSTRUAL:  {
    label: 'Menstruación', days: '1–5',
    light: { bg: '#E8F0E8', text: '#1A531A', tag: '#fff0f0', tagText: '#c0392b' },
    dark:  { bg: '#1C2E1C', text: '#A8D5A2', tag: '#3a1a1a', tagText: '#e88080' },
  },
  FOLLICULAR: {
    label: 'Folicular', days: '6–13',
    light: { bg: '#E2ECD4', text: '#437A43', tag: '#e8f0e8', tagText: '#1A531A' },
    dark:  { bg: '#1E2E18', text: '#B8D490', tag: '#1e3018', tagText: '#90c060' },
  },
  OVULATION:  {
    label: 'Ovulación', days: '14–16',
    light: { bg: '#F5E9D5', text: '#B57D2C', tag: '#f5e9d5', tagText: '#B57D2C' },
    dark:  { bg: '#2E2010', text: '#D4A35D', tag: '#2e2010', tagText: '#D4A35D' },
  },
  LUTEAL:     {
    label: 'Lútea', days: '17–28',
    light: { bg: '#F2EBE1', text: '#95A5A6', tag: '#f0ece6', tagText: '#7a8a8a' },
    dark:  { bg: '#252020', text: '#A0AAAA', tag: '#252020', tagText: '#909a9a' },
  },
} as const
