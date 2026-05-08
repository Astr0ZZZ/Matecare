/**
 * VisionScan.tsx
 *
 * Pantalla de lectura visual en la app Expo.
 * El usuario elige o toma una foto → se envía al backend → llega el consejo táctico.
 *
 * Ubicación sugerida: matecare-mobile/app/(tabs)/vision-scan.tsx
 * O integrar el hook useVisionChat en chat.tsx existente.
 *
 * Dependencias a instalar:
 *   npx expo install expo-image-picker expo-camera
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Hook reutilizable ──────────────────────────────────────────────────────

export function useVisionChat() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    response: string;
    emotionDetected: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth() as any;

  const analyzePhoto = async (imageUri: string, userMessage?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Convertir URI → base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Llamar al backend
      const apiRes = await fetch(`${API_BASE}/api/ai/vision-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: base64, userMessage }),
      });

      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Error del servidor");
      }

      const data = await apiRes.json();
      setResult({
        response: data.response,
        emotionDetected: data.emotionDetected,
      });
    } catch (e: any) {
      setError(e.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return { analyzePhoto, loading, result, error };
}

// ─── Pantalla completa ──────────────────────────────────────────────────────

export default function VisionScanScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { analyzePhoto, loading, result, error } = useVisionChat();

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // comprimir antes de enviar
    });

    if (!picked.canceled && picked.assets[0]) {
      const uri = picked.assets[0].uri;
      setSelectedImage(uri);
      analyzePhoto(uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitamos acceso a la cámara.");
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!photo.canceled && photo.assets[0]) {
      const uri = photo.assets[0].uri;
      setSelectedImage(uri);
      analyzePhoto(uri);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Lectura del Momento</Text>
      <Text style={styles.subtitle}>
        Sube una foto de tu pareja para obtener el consejo más preciso posible.
      </Text>

      {/* Botones */}
      {!loading && !result && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btn} onPress={takePhoto}>
            <Text style={styles.btnText}>Tomar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={pickImage}>
            <Text style={styles.btnText}>Galería</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Preview imagen */}
      {selectedImage && (
        <Image source={{ uri: selectedImage }} style={styles.preview} />
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={styles.loadingText}>Analizando el momento...</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.btn} onPress={pickImage}>
            <Text style={styles.btnText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Resultado */}
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.emotionTag}>
            Estado detectado: {result.emotionDetected}
          </Text>
          <Text style={styles.responseText}>{result.response}</Text>
          <TouchableOpacity
            style={[styles.btn, { marginTop: 20 }]}
            onPress={() => {
              setSelectedImage(null);
            }}
          >
            <Text style={styles.btnText}>Nueva lectura</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0D0D0D",
    padding: 24,
    alignItems: "center",
  },
  title: {
    color: "#C9A84C",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 40,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: "#C9A84C",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnSecondary: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#C9A84C",
  },
  btnText: {
    color: "#0D0D0D",
    fontWeight: "700",
    fontSize: 15,
  },
  preview: {
    width: 260,
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  loadingBox: {
    alignItems: "center",
    marginTop: 20,
    gap: 12,
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
  },
  errorBox: {
    alignItems: "center",
    gap: 16,
    marginTop: 20,
  },
  errorText: {
    color: "#E24B4A",
    fontSize: 14,
    textAlign: "center",
  },
  resultBox: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    width: "100%",
    alignItems: "flex-start",
    marginTop: 8,
  },
  emotionTag: {
    color: "#C9A84C",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  responseText: {
    color: "#E8E8E8",
    fontSize: 16,
    lineHeight: 24,
  },
});
