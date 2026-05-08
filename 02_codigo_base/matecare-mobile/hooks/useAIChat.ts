import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../context/ToastContext';

export interface Message {
  id: string;
  text: string;
  emisor: 'usuario' | 'ia';
  timestamp: number;
}

const STORAGE_KEY = '@matecare_chat_history';

export const useAIChat = () => {
  const { showError } = useToast();
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cargar historial al iniciar
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
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
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes));
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

    try {
      const data = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          mensaje: texto, 
          faseActual: faseActual,
          history: mensajes.slice(-10).map(m => ({ // Enviar solo últimos 10 para contexto
            role: m.emisor === 'usuario' ? 'user' : 'assistant',
            content: m.text
          }))
        }),
      });

      setMensajes((prev) => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          text: data.response || data.respuesta, 
          emisor: 'ia',
          timestamp: Date.now()
        }
      ]);
    } catch (error) {
      console.error(error);
      showError("Se perdió el enlace con el Oráculo AI.");
      setMensajes((prev) => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          text: "⚠️ Error de conexión con el centro de mando. Por favor, reintenta.", 
          emisor: 'ia',
          timestamp: Date.now()
        }
      ]);
    } finally {
      setCargando(false);
    }
  };

  const limpiarHistorial = async () => {
    setMensajes([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return { mensajes, enviarMensaje, cargando, limpiarHistorial };
};
