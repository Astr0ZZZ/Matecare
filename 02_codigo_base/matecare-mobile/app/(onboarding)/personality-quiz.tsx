import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const QUESTIONS = [
  {
    id: 'personalityType',
    title: '¿Cómo recarga ella su energía?',
    subtitle: 'Entender si brilla más en compañía o necesita quietud nos ayuda a sugerirte planes que realmente disfrute.',
    options: [
      { label: 'En soledad (Introvertida)', value: 'INTROVERTED', icon: '🏠', desc: 'Valora su espacio personal' },
      { label: 'Con gente (Extrovertida)', value: 'EXTROVERTED', icon: '🌟', desc: 'Se activa con la socialización' },
      { label: 'Es equilibrada (Ambivertida)', value: 'AMBIVERT', icon: '⚖️', desc: 'Se adapta según el momento' },
    ]
  },
  {
    id: 'conflictStyle',
    title: '¿Cuál es su forma de procesar tensiones?',
    subtitle: 'Saber esto te permitirá ser su mejor apoyo cuando las cosas se pongan difíciles.',
    options: [
      { label: 'Necesita espacio (Evitativa)', value: 'AVOIDANT', icon: '🤐', desc: 'Se cierra para procesar antes de hablar' },
      { label: 'Directa y honesta', value: 'DIRECT', icon: '💬', desc: 'Prefiere resolver los problemas de frente' },
      { label: 'Sutil y callada (Pasiva)', value: 'PASSIVE', icon: '🌊', desc: 'Siente mucho aunque no lo exprese de inmediato' },
    ]
  },
  {
    id: 'affectionStyle',
    title: '¿Qué la hace sentir más amada?',
    subtitle: 'Identificar su "lenguaje de amor" es el primer paso para una conexión real.',
    options: [
      { label: 'Cercanía y contacto físico', value: 'PHYSICAL', icon: '🤝' },
      { label: 'Palabras que validen y motiven', value: 'VERBAL', icon: '✨' },
      { label: 'Que hagas cosas por ella (Actos)', value: 'ACTS', icon: '🛠️' },
      { label: 'Atención y tiempo de calidad', value: 'QUALITY', icon: '⏳' },
    ]
  },
  {
    id: 'socialLevel',
    title: '¿Cómo prefiere manejar su vida social?',
    subtitle: 'Saber si prefiere la calma del hogar o la energía de las salidas te ayudará a proponer el plan perfecto.',
    options: [
      { label: 'Prefiere la calma (Bajo)', value: 'LOW', icon: '🍵', desc: 'Disfruta de momentos tranquilos' },
      { label: 'Equilibrada (Medio)', value: 'MEDIUM', icon: '👫', desc: 'Le gusta salir pero valora su hogar' },
      { label: 'Muy sociable (Alto)', value: 'HIGH', icon: '🎉', desc: 'Se siente viva rodeada de gente' },
    ]
  },
  {
    id: 'privacyLevel',
    title: '¿Qué tan reservada es con su intimidad?',
    subtitle: 'Esto nos indica qué tan sutiles o públicos deben ser tus gestos de cariño.',
    options: [
      { label: 'Muy reservada', value: 'VERY_PRIVATE', icon: '🔐' },
      { label: 'Moderada', value: 'MODERATE', icon: '🏠' },
      { label: 'Abierta y expresiva', value: 'OPEN', icon: '📖' },
    ]
  }
];

export default function PersonalityQuiz() {
  const router = useRouter();
  const params = useLocalSearchParams(); // Capturar parámetros anteriores (cycle data)
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSelect = (value: string) => {
    const question = QUESTIONS[currentStep];
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Forward EVERYTHING to confirm
      router.push({
        pathname: '/(onboarding)/confirm',
        params: {
          ...params, // Aquí incluimos lastPeriodDate, cycleLength, periodDuration
          ...newAnswers
        }
      });
    }
  };

  const question = QUESTIONS[currentStep];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.light.greenDark, '#0A3323']}
        style={styles.header}
      >
        <View style={styles.progressContainer}>
          {QUESTIONS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
                index < currentStep && styles.progressDotDone
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepTitle}>Paso {currentStep + 1} de {QUESTIONS.length}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={currentStep}
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -50 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.questionCard}
          >
            <Text style={styles.title}>{question.title}</Text>
            <Text style={styles.subtitle}>{question.subtitle}</Text>

            {question.options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.optionButton}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {(option as any).desc && <Text style={styles.optionDesc}>{(option as any).desc}</Text>}
                </View>
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
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5F0',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  progressDot: {
    width: 30,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: COLORS.light.gold,
  },
  progressDotDone: {
    backgroundColor: COLORS.light.greenMid,
  },
  stepTitle: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  content: {
    padding: SPACING.lg,
  },
  questionCard: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.light.greenDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.light.textMuted,
    marginBottom: 30,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E4DF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    color: COLORS.light.greenDark,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.light.textMuted,
    marginTop: 2,
  },
  backButton: {
    padding: 20,
    alignItems: 'center',
  },
  backText: {
    fontFamily: TYPOGRAPHY.fontFamily.semiBold,
    color: COLORS.light.textMuted,
    fontSize: 14,
  }
});
