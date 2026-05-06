import { MBTIType, ComputedPersonalityProfile, QuizAnswers } from '../../../shared/types/personality.types';

/**
 * Calcula el tipo MBTI y el perfil completo a partir de las respuestas del quiz.
 * Cada dimensión tiene un score de confianza (0.0 a 1.0).
 */
export function mapQuizToPersonality(answers: QuizAnswers): ComputedPersonalityProfile {
  // ── DIMENSIÓN E/I ──────────────────────────────────────────
  let eiScore = 0.5; // 0.0 = puro I, 1.0 = puro E
  if (answers.personalityType === 'EXTROVERTED') eiScore = 0.85;
  if (answers.personalityType === 'INTROVERTED') eiScore = 0.15;
  if (answers.personalityType === 'AMBIVERT') eiScore = 0.5;

  // ── DIMENSIÓN N/S ──────────────────────────────────────────
  let nsScore = 0.5; // 0.0 = puro N, 1.0 = puro S
  if (answers.thinkingStyle === 'SENSING')   nsScore = 0.85;
  if (answers.thinkingStyle === 'INTUITIVE') nsScore = 0.15;

  // ── DIMENSIÓN F/T ──────────────────────────────────────────
  let ftScore = 0.5; // 0.0 = puro F, 1.0 = puro T
  if (answers.decisionStyle === 'THINKING') ftScore = 0.85;
  if (answers.decisionStyle === 'FEELING')  ftScore = 0.15;

  // ── DIMENSIÓN J/P ──────────────────────────────────────────
  let jpScore = 0.5; // 0.0 = puro J, 1.0 = puro P
  if (answers.planningStyle === 'PERCEIVING') jpScore = 0.85;
  if (answers.planningStyle === 'JUDGING')    jpScore = 0.15;

  // Calcular letras MBTI
  const E_or_I = eiScore >= 0.5 ? 'E' : 'I';
  const N_or_S = nsScore >= 0.5 ? 'S' : 'N';
  const F_or_T = ftScore >= 0.5 ? 'T' : 'F';
  const J_or_P = jpScore >= 0.5 ? 'P' : 'J';

  const mbtiType = `${E_or_I}${N_or_S}${F_or_T}${J_or_P}` as MBTIType;

  return {
    mbtiType,
    mbtiConfidence: {
      EI: eiScore,
      NS: nsScore,
      FT: ftScore,
      JP: jpScore,
    },
    attachmentStyle: answers.attachmentStyle,
    preferences: {
      music: answers.musicMood,
      plans: answers.preferredPlans,
      stressedNeeds: answers.stressedNeeds,
    }
  };
}

/**
 * Descripción en texto del tipo MBTI para incluir en el prompt de Gemini.
 */
export const MBTI_DESCRIPTIONS: Record<MBTIType, string> = {
  INTJ: 'Estratega independiente. Valora la autonomía, la lógica y los planes a largo plazo. No le gustan las sorpresas impredecibles ni las conversaciones vacías.',
  INTP: 'Pensadora analítica. Curiosa e independiente. Necesita espacio para procesar. Los gestos que demuestran que la entiendes profundamente le llegan más que los superficiales.',
  ENTJ: 'Líder natural. Directa, ambiciosa, exigente consigo misma. Valora la competencia y la acción. Los actos concretos pesan más que las palabras.',
  ENTP: 'Innovadora espontánea. Ama el debate y la novedad. Los planes rutinarios la aburren. Necesita estimulación intelectual y sorpresas creativas.',
  INFJ: 'Visionaria empática. Profunda, reservada, muy intuitiva. Necesita conexión auténtica. Un gesto pensado para ella específicamente vale más que diez genéricos.',
  INFP: 'Idealista apasionada. Siente todo con intensidad. Valora la autenticidad sobre todo. Los gestos que honran quién es ella (no quién "debería" ser) la conmueven.',
  ENFJ: 'Líder carismática. Profundamente orientada a las personas. Necesita sentir que la relación crece. Apoya a todos; necesita que alguien también la apoye a ella.',
  ENFP: 'Exploradora entusiasta. Creativa, impulsiva, conecta fácil. Los planes espontáneos y creativos la hacen brillar. Necesita variedad y que la sorprendan.',
  ISTJ: 'Guardiana confiable. Tradicional, metódica, leal. Aprecia la consistencia y las promesas cumplidas. Un gesto pequeño pero constante vale más que uno grande esporádico.',
  ISFJ: 'Protectora cálida. Atenta, servicial, profundamente leal. Recuerda todo. Un detalle que demuestre que tú también recuerdas lo que importa para ella es oro.',
  ESTJ: 'Organizadora eficiente. Directa, estructurada, pragmática. Valora la responsabilidad y el seguimiento. Cumplir lo que dices la enamora más que las palabras.',
  ESFJ: 'Cuidadora social. Calurosa, armoniosa, muy pendiente del bienestar ajeno. Necesita sentir aprecio explícito. Dile lo que valoras de ella, frecuentemente.',
  ISTP: 'Artesana pragmática. Independiente, observadora, reservada. No le gustan los dramas. Un gesto práctico y directo funciona mejor que uno emocional forzado.',
  ISFP: 'Artista sensible. Estética, presente, auténtica. Vive el momento. Planes que involucren belleza, naturaleza o experiencias sensoriales la hacen feliz.',
  ESTP: 'Emprendedora audaz. Enérgica, directa, orientada a la acción. Se aburre rápido. Planes con adrenalina, novedad y un toque de competencia la emocionan.',
  ESFP: 'Animadora vivaz. Espontánea, divertida, muy sociable. Adora las sorpresas y la atención. Un plan que involucre gente, música o celebración es perfecto para ella.',
};

/**
 * Descripción del estilo de apego para el prompt.
 */
export const ATTACHMENT_DESCRIPTIONS = {
  ANXIOUS:  'Estilo de apego ansioso: necesita más reassurance de que todo está bien. En fases difíciles, un mensaje claro de que estás presente reduce su ansiedad enormemente.',
  SECURE:   'Estilo de apego seguro: maneja bien la distancia, confía en la relación. Responde bien a la comunicación abierta.',
  AVOIDANT: 'Estilo de apego evitativo: necesita espacio para no sentirse presionada. Demasiada intensidad emocional la hace cerrarse. Paciencia y no-presión son clave.',
};

/**
 * Descripción de preferencias para el prompt.
 */
export const PREFERENCE_DESCRIPTIONS = {
  music: {
    pop_reggaeton:    'Le gusta el pop y reggaeton — energía, ritmo, sensación de fiesta.',
    indie_alternative:'Le gusta el indie y alternativo — ambientes íntimos, con personalidad.',
    classic_jazz:     'Le gusta la clásica y jazz — sofisticación, tranquilidad, profundidad.',
    rock_electronic:  'Le gusta el rock y electrónica — intensidad, energía, adrenalina.',
  },
  plans: {
    intimate_home:    'Sus planes ideales son en casa, íntimos y tranquites.',
    go_out:           'Le encanta salir — restaurantes, bailar, explorar.',
    movie_night:      'Disfruta de noches de película en casa, comodidad y calma.',
    total_surprise:   'Le gustan las sorpresas totales — la emoción de no saber qué viene.',
  },
  stressedNeeds: {
    just_listen:       'Cuando está estresada necesita que la escuches sin dar consejos.',
    solve_something:   'Cuando está estresada necesita que le resuelvas algo concreto.',
    space_then_hug:    'Cuando está estresada necesita espacio primero, luego conexión física.',
    distraction_laughs:'Cuando está estresada necesita distracción y que la hagas reír.',
  }
};
