/**
 * MateCare Crisis Detection Engine
 * Analiza el mensaje del usuario en busca de indicadores de alta tensión o conflicto.
 */

export type CrisisTier = 'NONE' | 'TENSION' | 'CRITICAL';

const TENSION_KEYWORDS = ['enojada', 'molesta', 'discusión', 'pelea', 'gritos', 'llanto', 'triste', 'distante'];
const CRITICAL_KEYWORDS = ['terminar', 'separarnos', 'irse de la casa', 'odio', 'insoportable', 'emergencia'];

export function detectCrisisTier(message: string): CrisisTier {
  const msg = message.toLowerCase();
  
  if (CRITICAL_KEYWORDS.some(key => msg.includes(key))) {
    return 'CRITICAL';
  }
  
  if (TENSION_KEYWORDS.some(key => msg.includes(key))) {
    return 'TENSION';
  }
  
  return 'NONE';
}

export function getCrisisInstructions(tier: CrisisTier): string {
  switch (tier) {
    case 'CRITICAL':
      return `
        AVISO DE CRISIS CRÍTICA: La situación es de alto riesgo para la relación. 
        Instrucciones: Mantén la calma extrema. Recomienda silencio, escucha activa y espacio. 
        No sugieras soluciones lógicas ahora. Prioriza la desescalada emocional inmediata.
      `;
    case 'TENSION':
      return `
        AVISO DE TENSIÓN: Hay fricción en el ambiente. 
        Instrucciones: Sugiere gestos de servicio pequeños (agua, comida, manta) sin pedir nada a cambio. 
        Evita el sarcasmo o la confrontación.
      `;
    default:
      return '';
  }
}
