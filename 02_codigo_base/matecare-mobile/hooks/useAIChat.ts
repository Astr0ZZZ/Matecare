import { useState } from 'react';
import { apiFetch } from '../services/api';

export interface Message {
  id: string;
  text: string;
  emisor: 'usuario' | 'ia';
  timestamp: number;
}

export const useAIChat = () => {
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [cargando, setCargando] = useState(false);

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
      const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          mensaje: texto, 
          faseActual: faseActual,
          history: mensajes.map(m => ({
            role: m.emisor === 'usuario' ? 'user' : 'assistant',
            content: m.text
          }))
        }),
      });

      if (!response.ok) throw new Error('Error en la matriz táctica');
      
      const data = await response.json();

      setMensajes((prev) => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          text: data.respuesta, 
          emisor: 'ia',
          timestamp: Date.now()
        }
      ]);
    } catch (error) {
      console.error(error);
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

  return { mensajes, enviarMensaje, cargando };
};
