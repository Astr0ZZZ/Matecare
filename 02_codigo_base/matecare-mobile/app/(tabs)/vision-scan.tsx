/**
 * VisionScan.tsx - Premium Edition
 * 
 * Pantalla de lectura visual avanzada v2.0.
 * Utiliza el sistema de temas dinámico y apiFetch centralizado.
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
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');

// ─── Hook de Interacción ───────────────────────────────────────────────────

export function useVisionChat() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    response: string;
    emotionDetected: string;
    bodyLanguage?: string;
    sceneCategory?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzePhoto = async (imageUri: string, userMessage?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Convertir URI → base64 usando FileSystem (RN compatible)
      const base64 = await FileSystem.readAsStringAsync(imageUri, { 
        encoding: 'base64' 
      });
      const base64Data = `data:image/jpeg;base64,${base64}`;

      // Llamar al backend usando apiFetch centralizado
      const data = await apiFetch('/ai/vision-chat', {
        method: 'POST',
        body: JSON.stringify({ image: base64Data, userMessage }),
      });

      setResult({
        response: data.response,
        emotionDetected: data.emotionDetected,
        bodyLanguage: data.bodyLanguage,
        sceneCategory: data.sceneCategory
      });
    } catch (e: any) {
      setError(e.message || "Error en el análisis");
      showError("Falla en el escaneo visual táctico.");
    } finally {
      setLoading(false);
    }
  };

  const calibrateProfile = async (imageUri: string) => {
    setLoading(true);
    setError(null);
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { 
        encoding: 'base64' 
      });
      const base64Data = `data:image/jpeg;base64,${base64}`;

      const data = await apiFetch('/ai/calibrate-profile', {
        method: 'POST',
        body: JSON.stringify({ image: base64Data }),
      });

      Alert.alert("Calibración Exitosa", `Se ha detectado un estilo "${data.traits.detectedStyle}" y una edad estimada de ${data.traits.estimatedAge} años.`);
    } catch (e: any) {
      setError(e.message || "Error en la calibración");
      showError("Error crítico de calibración visual.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { analyzePhoto, calibrateProfile, loading, result, error, reset };
}

// ─── Componente Principal ───────────────────────────────────────────────────

export default function VisionScanScreen() {
  const { theme } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { analyzePhoto, calibrateProfile, loading, result, error, reset } = useVisionChat();

  const handleCapture = async (source: 'camera' | 'library', mode: 'chat' | 'calibrate' = 'chat') => {
    const permission = source === 'camera' 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permiso requerido", `Necesitamos acceso a tu ${source === 'camera' ? 'cámara' : 'galería'}.`);
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.6,
    };

    const picked = source === 'camera' 
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!picked.canceled && picked.assets[0]) {
      let uri = picked.assets[0].uri;

      // Optimización: Redimensionar a max 1000px de ancho para ahorrar ancho de banda y memoria
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        uri = manipulated.uri;
      } catch (manipError) {
        console.warn("Error optimizando imagen, enviando original:", manipError);
      }

      setSelectedImage(uri);
      if (mode === 'calibrate') {
        calibrateProfile(uri);
      } else {
        analyzePhoto(uri);
      }
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
            LECTURA VISUAL
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFont }]}>
            Cruza la fase biológica con el lenguaje corporal en tiempo real.
          </Text>
        </View>

        {/* Preview o Selector */}
        <View style={styles.previewContainer}>
          {selectedImage ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              {loading && (
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark">
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                    <Text style={[styles.loadingText, { color: theme.colors.text }]}>Sincronizando capas...</Text>
                  </View>
                </BlurView>
              )}
            </View>
          ) : (
            <View style={[styles.placeholder, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
              <Ionicons name="scan-outline" size={60} color={theme.colors.border} />
              <Text style={[styles.placeholderText, { color: theme.colors.textMuted }]}>
                No hay captura activa
              </Text>
            </View>
          )}
        </View>

        {/* Botones de acción */}
        {!loading && !result && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.mainBtn, { backgroundColor: theme.colors.accent }]} 
              onPress={() => handleCapture('camera', 'chat')}
            >
              <Ionicons name="camera" size={20} color={theme.colors.background} />
              <Text style={[styles.btnText, { color: theme.colors.background }]}>Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryBtn, { borderColor: theme.colors.accent }]} 
              onPress={() => handleCapture('library', 'chat')}
            >
              <Ionicons name="images" size={20} color={theme.colors.accent} />
              <Text style={[styles.btnText, { color: theme.colors.accent }]}>Galería</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !result && (
          <TouchableOpacity 
            style={[styles.calibrateLink, { marginTop: 16 }]} 
            onPress={() => handleCapture('library', 'calibrate')}
          >
            <Ionicons name="options-outline" size={16} color={theme.colors.textMuted} />
            <Text style={[styles.calibrateText, { color: theme.colors.textMuted }]}>
              CALIBRAR GUSTOS Y ESTILO BASE
            </Text>
          </TouchableOpacity>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={24} color="#FF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Resultado Premium */}
        {result && (
          <View style={[styles.resultCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.tagsRow}>
              <View style={[styles.tag, { backgroundColor: 'rgba(207, 170, 60, 0.15)' }]}>
                <Text style={[styles.tagText, { color: theme.colors.accent }]}>
                  {result.emotionDetected.toUpperCase()}
                </Text>
              </View>
              {result.bodyLanguage && (
                <View style={[styles.tag, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                  <Text style={[styles.tagText, { color: theme.colors.text }]}>
                    {result.bodyLanguage.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.responseText, { color: theme.colors.text, fontFamily: theme.typography.bodyFont }]}>
              {result.response}
            </Text>

            <TouchableOpacity 
              style={styles.resetBtn} 
              onPress={() => {
                setSelectedImage(null);
                reset();
              }}
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
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
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    elevation: 4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 20,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  resultCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  responseText: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 24,
  },
  resetBtn: {
    alignSelf: 'center',
    padding: 12,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  calibrateLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  calibrateText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  }
});
