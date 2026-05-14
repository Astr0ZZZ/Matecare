/**
 * VisionScan.tsx - Premium Unified Edition
 * 
 * Flujo unificado: Toma foto -> Analiza Emoción + Calibra Perfil.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ─── Hook de Interacción Unificada ──────────────────────────────────────────

export function useVisionChat() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    response: string;
    description?: string;
    emotionDetected: string;
    authenticityLabel?: string;
    isSuppressed?: boolean;
    hasDiscrepancy?: boolean;
    bodyLanguage?: string;
    sceneCategory?: string;
    clothingStyle?: string;
    environment?: string;
    energyAppearance?: string;
    timeOfDayHint?: string;
    ambientMood?: string;
    clothingTone?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processPhoto = async (imageUri: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      
      // Única llamada atómica (Calibra + Analiza + Persiste)
      const chatData = await apiFetch('/ai/vision-chat', {
        method: 'POST',
        body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }),
      });

      setResult({
        response: chatData.response,
        description: chatData.interpreter?.style_analysis,
        emotionDetected: chatData.vision?.emotional_tone || "Neutral",
        authenticityLabel: chatData.vision?.authenticityLabel || chatData.vision?.emotional_tone,
        isSuppressed: chatData.vision?.suppression_detected || chatData.vision?.isSuppressed,
        hasDiscrepancy: chatData.vision?.visual_discrepancy || chatData.vision?.hasDiscrepancy,
        bodyLanguage: chatData.vision?.bodyLanguage || chatData.vision?.pose_analysis?.posture,
        sceneCategory: chatData.vision?.sceneCategory || chatData.vision?.environment_context,
        clothingStyle: chatData.vision?.style || chatData.vision?.estimated_style,
        environment: chatData.vision?.environment || chatData.vision?.environment_context,
        energyAppearance: chatData.vision?.energyAppearance,
        timeOfDayHint: chatData.vision?.timeOfDayHint,
        ambientMood: chatData.vision?.ambientMood,
        clothingTone: chatData.vision?.clothingTone,
      });

      await AsyncStorage.setItem('lastVisionUpdate', Date.now().toString());

    } catch (e: any) {
      setError(e.message || "Error en el procesamiento");
      showError("Falla en la sincronización táctica.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { processPhoto, loading, result, error, reset };
}

/**
 * Estima el brillo de una imagen de forma rápida.
 * Usa una muestra del thumbnail en Base64 para evitar leer toda la imagen.
 * Retorna valor 0-255.
 */
const estimateBrightness = async (uri: string): Promise<number> => {
  try {
    const thumb = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 40 } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.3 }
    );
    const b64 = await FileSystem.readAsStringAsync(thumb.uri, { encoding: 'base64' });

    // Muestrear bytes de la cadena base64 para estimar brillo
    const binary = atob(b64);
    const step = Math.max(1, Math.floor(binary.length / 200));
    let total = 0;
    let count = 0;
    for (let i = 0; i < binary.length; i += step) {
      total += binary.charCodeAt(i);
      count++;
    }
    return count > 0 ? total / count : 128;
  } catch {
    return 128; // Valor neutro — no rechazar si falla el sampling
  }
};

interface QualityCheck {
  approved: boolean;
  reason?: string;
  suggestion?: string;
}

const checkImageQuality = async (uri: string): Promise<QualityCheck> => {
  const brightness = await estimateBrightness(uri);

  if (brightness < 40) {
    return {
      approved: false,
      reason: 'Poca iluminación',
      suggestion: 'Muévete a un lugar más iluminado o enciende la luz.',
    };
  }

  if (brightness > 230) {
    return {
      approved: false,
      reason: 'Sobreexposición',
      suggestion: 'Evita la luz solar directa detrás de la cámara.',
    };
  }

  return { approved: true };
};

// Componente para los Brackets Tácticos (v2.2)
const TacticalBracket = ({ position, color }: { position: 'tl' | 'tr' | 'bl' | 'br', color: string }) => {
  const rotation = { tl: '0deg', tr: '90deg', br: '180deg', bl: '270deg' }[position];
  return (
    <View style={[styles.bracket, styles[`bracket_${position}` as keyof typeof styles] as any, { transform: [{ rotate: rotation }] }]}>
      <Svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <Path d="M2 30V2H30" stroke={color} strokeWidth="3" />
      </Svg>
    </View>
  );
};

export default function VisionScanScreen() {
  const { theme } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { processPhoto, loading, result, error, reset } = useVisionChat();

  const handleCapture = async (source: 'camera' | 'library') => {
    const permission = source === 'camera' 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permiso requerido", `Necesitamos acceso a tu ${source === 'camera' ? 'cámara' : 'galería'}.`);
      return;
    }

    const picked = source === 'camera' 
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });

    if (!picked.canceled && picked.assets[0]) {
      let uri = picked.assets[0].uri;

      // Optimización 1000px
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri, [{ resize: { width: 1000 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        uri = manipulated.uri;
      } catch (e) {}

      setSelectedImage(uri);

      // NUEVO — Quality gate local antes de subir
      const quality = await checkImageQuality(uri);
      if (!quality.approved) {
        Alert.alert(
          quality.reason!,
          quality.suggestion,
          [{ text: 'Entendido', style: 'default' }]
        );
        setSelectedImage(null);
        return; 
      }

      processPhoto(uri);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.accent, fontFamily: theme.typography.titleFont }]}>
            LECTURA TÁCTICA {theme.visuals.emojiSet.tabs?.vision || ''}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFont }]}>
            Sincroniza el perfil visual de tu pareja con la inteligencia de MateCare.
          </Text>
        </View>

        <View style={styles.previewWrapper}>
          {/* Brackets Tácticos */}
          <TacticalBracket position="tl" color={theme.colors.accent} />
          <TacticalBracket position="tr" color={theme.colors.accent} />
          <TacticalBracket position="bl" color={theme.colors.accent} />
          <TacticalBracket position="br" color={theme.colors.accent} />

          <View style={styles.previewContainer}>
            {selectedImage ? (
              <View style={styles.imageWrapper}>
                {loading && (
                  <MotiView
                    from={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.2, opacity: 0 }}
                    transition={{ loop: true, duration: 1500, type: 'timing' }}
                    style={[styles.pulseRing, { borderColor: theme.colors.accent }]}
                  />
                )}
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                
                {loading && (
                  <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark">
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color={theme.colors.accent} />
                      <Text style={[styles.loadingText, { color: theme.colors.text }]}>CALIBRANDO...</Text>
                    </View>
                  </BlurView>
                )}
              </View>
            ) : (
              <View style={[styles.placeholder, { backgroundColor: theme.colors.card }]}>
                <Ionicons name="scan-outline" size={60} color={theme.colors.border} />
                <Text style={[styles.placeholderText, { color: theme.colors.textMuted }]}>
                  ESPERANDO CAPTURA
                </Text>
              </View>
            )}
          </View>
        </View>

        {!loading && !result && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: theme.colors.accent }]} 
              onPress={() => handleCapture('camera')}
            >
              <Ionicons name="camera" size={20} color={theme.colors.background} />
              <Text style={[styles.btnText, { color: theme.colors.background }]}>Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryBtn, { borderColor: theme.colors.accent }]} 
              onPress={() => handleCapture('library')}
            >
              <Ionicons name="images" size={20} color={theme.colors.accent} />
              <Text style={[styles.btnText, { color: theme.colors.accent }]}>Galería</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={24} color="#FF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={[styles.resultCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.tagsRow}>
              <View style={[styles.tag, { backgroundColor: 'rgba(207, 170, 100, 0.15)' }]}>
                <Text style={[styles.tagText, { color: theme.colors.accent }]}>
                  {result.emotionDetected.toUpperCase()}
                </Text>
              </View>

              {result.isSuppressed && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 165, 0, 0.15)' }]}>
                  <Text style={[styles.tagText, { color: '#FFA500' }]}>CONTENIDA</Text>
                </View>
              )}

              {result.hasDiscrepancy && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 80, 80, 0.15)' }]}>
                  <Text style={[styles.tagText, { color: '#FF5050' }]}>DISCREPANCIA DETECTADA</Text>
                </View>
              )}

              {result.authenticityLabel && result.authenticityLabel.toLowerCase() !== result.emotionDetected.toLowerCase() && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.textMuted }]}>
                    {result.authenticityLabel.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Tags de Capas Técnicas */}
            <View style={styles.tagsRow}>
              {result.environment && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.textMuted }]}>📍 {result.environment.toUpperCase()}</Text>
                </View>
              )}
              {result.clothingStyle && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.textMuted }]}>👕 {result.clothingStyle.toUpperCase()}</Text>
                </View>
              )}
              {result.bodyLanguage && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.textMuted }]}>🧍 {result.bodyLanguage.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Capa de Contexto Profundo (V2) */}
            <View style={[styles.tagsRow, { marginTop: -8 }]}>
              {result.energyAppearance && (
                <View style={[styles.tag, { backgroundColor: 'rgba(207, 170, 100, 0.05)' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.accent }]}>⚡ ENERGÍA {result.energyAppearance.toUpperCase()}</Text>
                </View>
              )}
              {result.timeOfDayHint && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.textMuted }]}>🕐 {result.timeOfDayHint.toUpperCase()}</Text>
                </View>
              )}
              {result.ambientMood && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.textMuted }]}>✨ {result.ambientMood.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Descripción Visual de la IA */}
            {result.description && (
              <View style={styles.descriptionBox}>
                <Text style={[styles.descriptionLabel, { color: theme.colors.accent }]}>DETECCIÓN VISUAL:</Text>
                <Text style={[styles.descriptionText, { color: theme.colors.textMuted }]}>
                  "{result.description}"
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={[styles.responseLabel, { color: theme.colors.accent }]}>CONSEJO TÁCTICO:</Text>
            <Text style={[styles.responseText, { color: theme.colors.text, fontFamily: theme.typography.bodyFont }]}>
              {result.response}
            </Text>

            <TouchableOpacity 
              style={styles.resetBtn} 
              onPress={() => { setSelectedImage(null); reset(); }}
            >
              <Text style={[styles.resetText, { color: theme.colors.textMuted }]}>NUEVA LECTURA</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: 4, marginBottom: 8 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
  previewWrapper: {
    width: width * 0.85,
    height: width * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  previewContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#000',
  },
  bracket: { position: 'absolute', width: 30, height: 30 },
  bracket_tl: { top: 0, left: 0 },
  bracket_tr: { top: 0, right: 0 },
  bracket_bl: { bottom: 0, left: 0 },
  bracket_br: { bottom: 0, right: 0 },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderRadius: (width * 0.7) / 2,
    zIndex: 1,
  },
  imageWrapper: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  imagePreview: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { marginTop: 12, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  actionRow: { flexDirection: 'row', gap: 16 },
  mainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16, gap: 8 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, gap: 8 },
  btnText: { fontSize: 16, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 68, 68, 0.1)', padding: 16, borderRadius: 12, gap: 12, marginTop: 20 },
  errorText: { color: '#FF4444', fontSize: 14, fontWeight: '600' },
  resultCard: { width: '100%', padding: 24, borderRadius: 24, borderWidth: 1, marginTop: 8 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  descriptionBox: { marginBottom: 20, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#CFAA64' },
  descriptionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  descriptionText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  responseLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  responseText: { fontSize: 17, lineHeight: 26, marginBottom: 24 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  resetBtn: { alignSelf: 'center', padding: 12 },
  resetText: { fontSize: 12, fontWeight: '800', letterSpacing: 2 }
});
