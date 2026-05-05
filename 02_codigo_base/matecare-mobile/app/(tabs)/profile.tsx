import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { THEMES, ThemeType } from '../../constants/themes';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const { theme, setTheme } = useTheme();

  const renderThemeCard = (themeKey: string) => {
    const t = THEMES[themeKey as ThemeType];
    const isSelected = theme.id === themeKey;

    return (
      <TouchableOpacity
        key={themeKey}
        style={[
          styles.themeCard,
          { backgroundColor: t.colors.card, borderColor: isSelected ? t.colors.accent : t.colors.border },
          isSelected && styles.selectedCard
        ]}
        onPress={() => setTheme(themeKey as ThemeType)}
      >
        <View style={[styles.previewCircle, { backgroundColor: t.colors.primary }]}>
          <Ionicons name={t.icons.phaseIndicator as any} size={20} color={t.colors.accent} />
        </View>
        <View style={styles.themeInfo}>
          <Text style={[styles.themeName, { color: t.colors.text }]}>{t.name}</Text>
          <Text style={[styles.themeDesc, { color: t.colors.textMuted }]}>
            {t.visuals.compassType.toUpperCase()} MODE
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={t.colors.accent} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.titleFont }]}>
            CENTRO DE MANDO
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Personaliza la estética de tu cruzada
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>VISUALIZACIÓN</Text>
          {Object.keys(THEMES).map(renderThemeCard)}
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.primary }]}>
            Los temas cambian iconos, colores y el estilo de la brújula táctica.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCard: {
    transform: [{ scale: 1.02 }],
  },
  previewCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  themeDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    marginLeft: SPACING.sm,
    flex: 1,
  },
});
