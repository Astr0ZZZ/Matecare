import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { fetch as fetchStream } from 'react-native-fetch-api';

export interface Message {
  id: string;
  text: string;
  emisor: 'usuario' | 'ia';
  timestamp: number;
}

const STORAGE_KEY = '@matecare_chat_history';

// Safe Storage Fallback para evitar el error "Native module is null"
const SafeStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn("[Storage] Usando fallback en memoria para lectura");
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn("[Storage] Usando fallback en memoria para escritura");
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn("[Storage] Fallback en memoria para borrado");
    }
  }
};

export const useAIChat = () => {
  const { showError } = useToast();
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cargar historial al iniciar
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await SafeStorage.getItem(STORAGE_KEY);
        if (stored) {
          setMensajes(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Error al cargar historial:", e);
      }
    };
    loadHistory();
  }, []);

  // Guardar historial cuando cambie
  useEffect(() => {
    const saveHistory = async () => {
      try {
        await SafeStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes));
      } catch (e) {
        console.error("Error al guardar historial:", e);
      }
    };
    if (mensajes.length > 0) {
      saveHistory();
    }
  }, [mensajes]);

  const enviarMensaje = async (texto: string, faseActual: string) => {
    const nuevoMensaje: Message = {
      id: Date.now().toString(),
      text: texto,
      emisor: 'usuario',
      timestamp: Date.now()
    };

    setMensajes((prev) => [...prev, nuevoMensaje]);
    setCargando(true);

    // Placeholder del mensaje IA que se va llenando
    const aiMsgId = (Date.now() + 1).toString();
    setMensajes((prev) => [...prev, {
      id: aiMsgId,
      text: '',
      emisor: 'ia',
      timestamp: Date.now()
    }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
      const baseUrl = API_URL?.endsWith('/api') ? API_URL : `${API_URL}/api`;

      const response = await fetchStream(`${baseUrl}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          mensaje: texto,
          faseActual,
          history: mensajes.slice(-6).map(m => ({
            role: m.emisor === 'usuario' ? 'user' : 'assistant',
            content: m.text.slice(0, 150)
          }))
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // [FALLBACK PARA REACT NATIVE / HERMES]
      // Hermes no soporta ReadableStream de forma nativa. Esperamos el texto completo.
      const text = await response.text();
      const lines = text.split('\n').filter((l: string) => l.startsWith('data: '));

      let mensajeFinalIA = '';
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(6));

          // Solo acumulamos los tokens que son parte de la respuesta
          if (parsed.token && parsed.token !== "Límite táctico alcanzado. Reflexiona sobre las tácticas entregadas.") {
            mensajeFinalIA += parsed.token;
          }
          
          if (parsed.error) {
            mensajeFinalIA = parsed.token || "Error de conexión.";
          }
        } catch (e) {
          // Ignorar
        }
      }

      // Actualizamos la UI una sola vez con el mensaje limpio
      setMensajes((prev) => prev.map(m =>
        m.id === aiMsgId ? { ...m, text: mensajeFinalIA || "Táctica establecida." } : m
      ));

    } catch (error) {
      console.error(error);
      showError("Se perdió el enlace con el Oráculo AI.");
      setMensajes((prev) => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, text: "⚠️ Error de conexión con el centro de mando. Por favor, reintenta." }
          : m
      ));
    } finally {
      setCargando(false);
    }
  };

  const limpiarHistorial = async () => {
    setMensajes([]);
    await SafeStorage.removeItem(STORAGE_KEY);
  };

  return { mensajes, enviarMensaje, cargando, limpiarHistorial };
};
