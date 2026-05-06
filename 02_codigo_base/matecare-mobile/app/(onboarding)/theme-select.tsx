import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { THEMES, ThemeType } from '../../constants/themes';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function ThemeSelect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, setTheme } = useTheme();

  const handleSelect = (type: ThemeType) => {
    setTheme(type);
  };

  const handleNext = () => {
    router.push({
      pathname: '/(onboarding)/confirm',
      params: { ...params }
    });
  };

  return (
    <LinearGradient colors={[theme.colors.background, theme.colors.primary]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <MotiView 
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.header}
          >
            <Text style={[styles.stepText, { color: theme.colors.accent }]}>PASO FINAL</Text>
            <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>Elige tu Interfaz</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Selecciona la estética que mejor resuene con tu energía actual.</Text>
          </MotiView>

          <View style={styles.themesGrid}>
            {(Object.keys(THEMES) as ThemeType[]).map((key) => {
              const t = THEMES[key];
              const isSelected = theme.id === key;
              
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeCard,
                    { 
                      backgroundColor: theme.colors.card, 
                      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      borderWidth: isSelected ? 2 : 1
                    }
                  ]}
                  onPress={() => handleSelect(key)}
                >
                  <View style={[styles.colorIndicator, { backgroundColor: t.colors.accent }]}>
                    <Text style={styles.themeEmoji}>{t.visuals.emojiSet.status}</Text>
                  </View>
                  <View style={styles.themeInfo}>
                    <Text style={[styles.themeName, { color: theme.colors.text, fontFamily: theme.typography.boldFont }]}>{t.name}</Text>
                    <Text style={[styles.themeDesc, { color: theme.colors.textMuted }]}>{t.visuals.hudName}</Text>
                  </View>
                  {isSelected && (
                    <MotiView 
                      from={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      style={[styles.checkCircle, { backgroundColor: theme.colors.accent }]}
                    >
                      <Text style={styles.checkIcon}>✓</Text>
                    </MotiView>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity 
            style={[styles.nextButton, { shadowColor: theme.colors.accent }]}
            onPress={handleNext}
          >
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.accent]}
              style={styles.gradientButton}
            >
              <Text style={[styles.nextButtonText, { fontFamily: theme.typography.boldFont }]}>FINALIZAR CONFIGURACIÓN →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.xl },
  header: { marginBottom: SPACING.xxl, marginTop: SPACING.lg },
  stepText: { fontSize: 12, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10 },
  title: { fontSize: 32, lineHeight: 40 },
  subtitle: { fontSize: 16, marginTop: 10, lineHeight: 24 },
  themesGrid: { gap: SPACING.md, marginBottom: SPACING.xxl },
  themeCard: { 
    padding: SPACING.md, 
    borderRadius: RADIUS.lg, 
    flexDirection: 'row', 
    alignItems: 'center',
    position: 'relative'
  },
  colorIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15
  },
  themeEmoji: { fontSize: 24 },
  themeInfo: { flex: 1 },
  themeName: { fontSize: 18 },
  themeDesc: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -5,
    right: -5
  },
  checkIcon: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  nextButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 10,
    elevation: 5,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  gradientButton: {
    padding: 20,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 14,
    letterSpacing: 1.5,
  },
});
