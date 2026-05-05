import { useState } from 'react';
import { CONFIG } from '../constants/config';

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
    // 1. Agregar mensaje del usuario a la UI
    const nuevoMensaje: Message = { 
      id: Date.now().toString(), 
      text: texto, 
      emisor: 'usuario',
      timestamp: Date.now()
    };
    
    setMensajes((prev) => [...prev, nuevoMensaje]);
    setCargando(true);

    try {
      // 2. Llamada al backend
      const response = await fetch(`${CONFIG.API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: CONFIG.TEST_USER_ID,
          message: texto, 
          history: mensajes.map(m => ({
            role: m.emisor === 'usuario' ? 'user' : 'assistant',
            content: m.text
          }))
        }),
      });

      if (!response.ok) throw new Error('Error en la matriz táctica');
      
      const data = await response.json();

      // 3. Agregar respuesta de la IA a la UI
      setMensajes((prev) => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          text: data.response, 
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
