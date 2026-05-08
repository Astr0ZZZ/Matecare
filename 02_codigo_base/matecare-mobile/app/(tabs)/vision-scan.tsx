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
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');

// ─── Hook de Interacción Unificada ──────────────────────────────────────────

export function useVisionChat() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    response: string;
    emotionDetected: string;
    authenticityLabel?: string;
    isSuppressed?: boolean;
    hasDiscrepancy?: boolean;
    bodyLanguage?: string;
    sceneCategory?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processPhoto = async (imageUri: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      
      // 1. Calibración atómica
      const data = await apiFetch('/ai/calibrate-profile', {
        method: 'POST',
        body: JSON.stringify({ imageBase64: base64 }),
      });

      // 2. Análisis táctico
      const chatData = await apiFetch('/ai/vision-chat', {
        method: 'POST',
        body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }),
      });

      setResult({
        response: chatData.response,
        emotionDetected: chatData.emotionDetected || data.traits?.dominantEmotion || "Neutral",
        authenticityLabel: chatData.authenticityLabel,
        isSuppressed: chatData.isSuppressed,
        hasDiscrepancy: chatData.hasDiscrepancy,
        bodyLanguage: chatData.bodyLanguage,
        sceneCategory: chatData.sceneCategory,
      });

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
            LECTURA TÁCTICA
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFont }]}>
            Sincroniza el perfil visual de tu pareja con la inteligencia de MateCare.
          </Text>
        </View>

        <View style={styles.previewContainer}>
          {selectedImage ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              {loading && (
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark">
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                    <Text style={[styles.loadingText, { color: theme.colors.text }]}>Calibrando Perfil...</Text>
                  </View>
                </BlurView>
              )}
            </View>
          ) : (
            <View style={[styles.placeholder, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
              <Ionicons name="scan-outline" size={60} color={theme.colors.border} />
              <Text style={[styles.placeholderText, { color: theme.colors.textMuted }]}>
                Esperando captura
              </Text>
            </View>
          )}
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
  title: { fontSize: 24, fontWeight: '800', letterSpacing: 3, marginBottom: 8 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
  previewContainer: {
    width: width - 48,
    height: width - 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  imageWrapper: { width: '100%', height: '100%' },
  imagePreview: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 14, fontWeight: '600', letterSpacing: 1 },
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
  responseText: { fontSize: 17, lineHeight: 26, marginBottom: 24 },
  resetBtn: { alignSelf: 'center', padding: 12 },
  resetText: { fontSize: 12, fontWeight: '800', letterSpacing: 2 }
});
