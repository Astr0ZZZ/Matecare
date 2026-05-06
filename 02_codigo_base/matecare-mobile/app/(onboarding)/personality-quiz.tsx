import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface Option {
  label: string;
  value: string;
  icon: string;
  desc?: string;
}

interface Question {
  id: string;
  title: string;
  subtitle: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  // ── DIMENSIÓN E/I ──────────────────────────────────────────
  {
    id: 'personalityType',
    title: '¿Cómo recarga ella su energía?',
    subtitle: 'Esto nos indica si prefiere planes íntimos o sociales.',
    options: [
      { label: 'En soledad (Introvertida)', value: 'INTROVERTED', icon: '🏠', desc: 'Valora su espacio personal' },
      { label: 'Con gente (Extrovertida)', value: 'EXTROVERTED', icon: '🌟', desc: 'Se activa con la socialización' },
      { label: 'Equilibrada (Ambivertida)', value: 'AMBIVERT', icon: '⚖️', desc: 'Depende del momento' },
    ]
  },

  // ── DIMENSIÓN N/S ──────────────────────────────────────────
  {
    id: 'thinkingStyle',
    title: '¿Cómo procesa el mundo?',
    subtitle: 'Esto nos indica si valora más el significado o los hechos concretos.',
    options: [
      { label: 'Por intuición y significado', value: 'INTUITIVE', icon: '🌌', desc: 'Ve patrones, le gustan las ideas profundas' },
      { label: 'Por hechos y detalles reales', value: 'SENSING', icon: '🔍', desc: 'Práctica, concreta, confía en lo tangible' },
    ]
  },

  // ── DIMENSIÓN F/T ──────────────────────────────────────────
  {
    id: 'decisionStyle',
    title: '¿Cómo toma decisiones?',
    subtitle: 'Esto define cómo procesa los conflictos y conversaciones difíciles.',
    options: [
      { label: 'Con el corazón (Emocional)', value: 'FEELING', icon: '💛', desc: 'Prioriza las personas y el impacto emocional' },
      { label: 'Con la cabeza (Racional)', value: 'THINKING', icon: '🧠', desc: 'Busca lógica y coherencia antes que armonía' },
    ]
  },

  // ── DIMENSIÓN J/P ──────────────────────────────────────────
  {
    id: 'planningStyle',
    title: '¿Cómo organiza su vida?',
    subtitle: 'Determina si le gustan las sorpresas o prefiere saber qué esperar.',
    options: [
      { label: 'Con estructura y planes', value: 'JUDGING', icon: '📅', desc: 'Le da seguridad saber qué viene' },
      { label: 'Espontánea y flexible', value: 'PERCEIVING', icon: '🎲', desc: 'Disfruta la improvisación y la novedad' },
    ]
  },

  // ── LENGUAJE DE AMOR ───────────────────────────────────────
  {
    id: 'affectionStyle',
    title: '¿Qué la hace sentir más amada?',
    subtitle: 'Su "lenguaje de amor" principal.',
    options: [
      { label: 'Contacto físico y cercanía', value: 'PHYSICAL', icon: '🤝' },
      { label: 'Palabras que la validen', value: 'VERBAL', icon: '✨' },
      { label: 'Que hagas cosas por ella', value: 'ACTS', icon: '🛠️' },
      { label: 'Tiempo de calidad sin distracciones', value: 'QUALITY', icon: '⏳' },
    ]
  },

  // ── ESTILO DE CONFLICTO ────────────────────────────────────
  {
    id: 'conflictStyle',
    title: '¿Cómo maneja las tensiones?',
    subtitle: 'Saber esto te permite ser su mejor apoyo.',
    options: [
      { label: 'Se cierra y necesita tiempo', value: 'AVOIDANT', icon: '🤐', desc: 'Procesa sola antes de hablar' },
      { label: 'Prefiere hablarlo de frente', value: 'DIRECT', icon: '💬', desc: 'Valora la honestidad directa' },
      { label: 'Lo siente pero no lo dice', value: 'PASSIVE', icon: '🌊', desc: 'Hay que leer sus señales' },
    ]
  },

  // ── ESTILO DE APEGO ────────────────────────────────────────
  {
    id: 'attachmentStyle',
    title: '¿Cómo suele sentirse en la relación?',
    subtitle: 'El estilo de apego define cuánta cercanía o independencia necesita.',
    options: [
      { label: 'Busca mucha cercanía y seguridad', value: 'ANXIOUS', icon: '🫂', desc: 'Necesita sentir que la relación está bien' },
      { label: 'Fluye tranquila y confía', value: 'SECURE', icon: '🌿', desc: 'Base segura, maneja bien la distancia' },
      { label: 'Valora su espacio e independencia', value: 'AVOIDANT', icon: '🦋', desc: 'Se siente asfixiada ante la presión' },
    ]
  },

  // ── ENRIQUECIMIENTO: PLANES ────────────────────────────────
  {
    id: 'preferredPlans',
    title: 'Un viernes libre, ¿qué la haría brillar?',
    subtitle: 'Para recomendarte planes que realmente disfrute.',
    options: [
      { label: 'Cena íntima en casa', value: 'intimate_home', icon: '🕯️' },
      { label: 'Salir a bailar o cenar afuera', value: 'go_out', icon: '💃' },
      { label: 'Película, pijama y manta', value: 'movie_night', icon: '🎬' },
      { label: 'Una sorpresa total', value: 'total_surprise', icon: '🎁' },
    ]
  },

  // ── ENRIQUECIMIENTO: MÚSICA ────────────────────────────────
  {
    id: 'musicMood',
    title: '¿Qué música la pone de buen humor?',
    subtitle: 'Útil para recomendarte playlists o ambientes.',
    options: [
      { label: 'Pop / Reggaeton', value: 'pop_reggaeton', icon: '🎵' },
      { label: 'Indie / Alternativo', value: 'indie_alternative', icon: '🎸' },
      { label: 'Clásica / Jazz', value: 'classic_jazz', icon: '🎹' },
      { label: 'Rock / Electrónica', value: 'rock_electronic', icon: '🎧' },
    ]
  },

  // ── ENRIQUECIMIENTO: ESTRÉS ────────────────────────────────
  {
    id: 'stressedNeeds',
    title: 'Cuando está estresada, ¿qué necesita de ti?',
    subtitle: 'Define cómo apoyarla en sus momentos difíciles.',
    options: [
      { label: 'Que la escuches sin dar consejos', value: 'just_listen', icon: '👂' },
      { label: 'Que le resuelvas algo concreto', value: 'solve_something', icon: '🛠️' },
      { label: 'Espacio... y luego un abrazo', value: 'space_then_hug', icon: '🌙' },
      { label: 'Distracción y risas', value: 'distraction_laughs', icon: '😄' },
    ]
  },

  // ── NIVEL SOCIAL Y PRIVACIDAD ──────────────────────────────
  {
    id: 'socialLevel',
    title: '¿Cómo prefiere manejar su vida social?',
    subtitle: 'Para recomendarte el tipo de plan correcto.',
    options: [
      { label: 'Prefiere la calma del hogar', value: 'LOW', icon: '🍵' },
      { label: 'Equilibrada, sale pero valora su espacio', value: 'MEDIUM', icon: '👫' },
      { label: 'Muy sociable, le encanta salir', value: 'HIGH', icon: '🎉' },
    ]
  },
  {
    id: 'privacyLevel',
    title: '¿Qué tan reservada es con su intimidad?',
    subtitle: 'Define si tus gestos deben ser íntimos o públicos.',
    options: [
      { label: 'Muy reservada', value: 'VERY_PRIVATE', icon: '🔐' },
      { label: 'Moderada', value: 'MODERATE', icon: '🏠' },
      { label: 'Abierta y expresiva', value: 'OPEN', icon: '📖' },
    ]
  }
];

export default function PersonalityQuiz() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const handleSelect = (value: string) => {
    const question = QUESTIONS[currentStep];
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push({
        pathname: '/(onboarding)/theme-select',
        params: { ...params, ...newAnswers }
      });
    }
  };

  const question = QUESTIONS[currentStep];

  return (
    <LinearGradient 
      colors={[theme?.colors?.background || '#044422', theme?.colors?.primary || '#044422']} 
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.progressContainer}>
          {QUESTIONS.map((_, index) => (
            <MotiView
              key={`dot-${index}`}
              animate={{ 
                backgroundColor: index <= currentStep ? theme.colors.accent : 'rgba(255,255,255,0.2)',
                width: index === currentStep ? 24 : 8 
              }}
              style={[styles.progressDot, { marginHorizontal: 2 }]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <AnimatePresence exitBeforeEnter>
            <MotiView
              key={`question-${currentStep}`}
              from={{ opacity: 0, translateX: 30 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: -30 }}
              transition={{ type: 'timing', duration: 400 }}
              style={styles.questionCard}
            >
              <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.boldFont }]}>
                {question.title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFont }]}>
                {question.subtitle}
              </Text>

              {question.options.map((option: Option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionLabel, { color: theme.colors.text, fontFamily: theme.typography.boldFont }]}>
                      {option.label}
                    </Text>
                    {option.desc ? (
                      <Text style={[styles.optionDesc, { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFont }]}>
                        {option.desc}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </MotiView>
          </AnimatePresence>
        </ScrollView>

        {currentStep > 0 && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={[styles.backText, { color: theme.colors.textMuted, fontFamily: theme.typography.boldFont }]}>
              ← RECALIBRAR ANTERIOR
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  content: { 
    padding: SPACING.lg,
    paddingTop: 20,
  },
  questionCard: { width: '100%' },
  title: {
    fontSize: 22,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 30,
    lineHeight: 20,
  },
  optionButton: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionIcon: { fontSize: 24, marginRight: 16 },
  optionTextContainer: { flex: 1 },
  optionLabel: { fontSize: 16 },
  optionDesc: { fontSize: 12, marginTop: 2 },
  backButton: { padding: 25, alignItems: 'center' },
  backText: { fontSize: 10, letterSpacing: 1 },
});
