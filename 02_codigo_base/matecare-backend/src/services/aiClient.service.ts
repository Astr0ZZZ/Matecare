import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import dotenv from 'dotenv';
import { detectCrisisTier, getCrisisInstructions } from './crisisDetector.service';

dotenv.config();

// Inicializamos el cliente con la clase correcta de 2026
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

const MODEL_FALLBACK_CHAIN = [
  "gpt-4o-mini", // Cambiado de 4.1-mini a o-mini (nombre real 2026)
  "gpt-4o"
];

async function generateWithFallback(params: { contents: any[]; config: any }): Promise<string> {
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`[AI] Intentando modelo: ${model}`);
      // Caso OpenAI (GPT-5.5)
      if (model.startsWith('gpt')) {
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'pendiente') {
          console.warn(`[AI] Saltando ${model}: Key no configurada.`);
          continue;
        }

        // Convertir formato Gemini -> OpenAI
        const messages: any[] = params.contents.map(c => ({
          role: c.role === 'model' ? 'assistant' : 'user',
          content: c.parts[0].text
        }));

        if (params.config.systemInstruction) {
          messages.unshift({ role: 'system', content: params.config.systemInstruction });
        }

        const response = await openai.chat.completions.create({
          model,
          messages: messages,
          max_tokens: 800,
          temperature: 0.7
        }, { timeout: 15000 }); // 15s timeout interno para saltar al siguiente modelo si este falla

        const content = response.choices[0]?.message?.content;
        if (content && content.trim() !== "") {
          console.log(`[AI] Éxito con ${model}`);
          return content;
        }
        console.warn(`[AI] ${model} devolvió contenido vacío`);
        continue;
      }

      // Caso Google (Gemini/Gemma)
      const cleanConfig = model.startsWith('gemma')
        ? { ...params.config, thinkingConfig: undefined }
        : params.config;

      const response = await client.models.generateContent({
        model,
        contents: params.contents,
        config: cleanConfig
      });

      const text = response.text;
      if (text && text.trim() !== "") {
        console.log(`[AI] Éxito con ${model}`);
        return text;
      }
      console.warn(`[AI] ${model} devolvió respuesta vacía (¿safety filter?)`);
      continue;
    } catch (err: any) {
      console.error(`[AI] Error en ${model}:`, err.status || 'ERR', err.message);
      continue;
    }
  }
  console.error("[AI] Todos los modelos fallaron. Usando fallback táctico.");
  return "Lo más importante hoy es la presencia tranquila y la escucha activa.";
}

/**
 * UTILERÍA: Formatea el historial para que empiece por 'user' y alterne roles correctamente,
 * fusionando mensajes consecutivos en lugar de eliminarlos.
 */
function normalizeHistory(rawMessages: any[]) {
  const contents: any[] = [];

  for (const m of rawMessages) {
    const role = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
    const text = m.content || m.text || "";

    if (contents.length === 0) {
      if (role === 'user') {
        contents.push({ role, parts: [{ text }] });
      }
    } else {
      const last = contents[contents.length - 1];
      if (last.role === role) {
        // En lugar de borrar el mensaje, fusionamos el texto
        last.parts[0].text += `\n\n${text}`;
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }
  }
  return contents;
}

// ==========================================
// 1. askAI
// ==========================================
export async function askAI(messages: any[]) {
  try {
    const systemPrompt = messages.find(m => m.role === 'system')?.content || "";
    const rawContents = messages.filter(m => m.role !== 'system');

    const contents = normalizeHistory(rawContents);

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Dame el consejo del día.' }] });
    }

    // Preparamos la configuración condicionalmente para no enviar un systemInstruction vacío
    const config: any = {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    };
    if (systemPrompt.trim() !== "") {
      config.systemInstruction = systemPrompt;
    }

    return await generateWithFallback({ contents, config });
  } catch (error: any) {
    console.error("AI Error (Gen 3):", error.message);
    return `Lo más importante hoy es la presencia tranquila.`;
  }
}

// ==========================================
// 2. generarConsejoTactico
// ==========================================
export async function generarConsejoTactico(mensaje: string, faseMujer: string, historial: any[] = []) {
  try {
    const tier = detectCrisisTier(mensaje);
    const crisisAddon = getCrisisInstructions(tier);

    // Tomamos los últimos 6 mensajes y los normalizamos
    const recentHistory = historial.slice(-6);
    const contents = normalizeHistory(recentHistory);

    // Manejo seguro del nuevo mensaje para evitar colisión de roles
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${mensaje}`;
    } else {
      contents.push({ role: 'user', parts: [{ text: mensaje }] });
    }

    return await generateWithFallback({
      contents,
      config: {
        systemInstruction: `Eres MateCare, una IA táctica.\nContexto: Fase ${faseMujer}.\n${crisisAddon}\nResponde de forma directa y estructurada.`,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      }
    });
  } catch (error: any) {
    console.error("Error en Gemini 3 (Tactical):", error.message);
    throw new Error("Fallo en la comunicación con la matriz táctica.");
  }
}

// ==========================================
// 3. FALLBACKS Y generarMisionesTactica
// ==========================================
const FALLBACK_MISSIONS: Record<string, any[]> = {
  MENSTRUAL: [
    { title: 'Kit de Confort', description: 'Prepara su manta favorita y algo caliente sin que lo pida.', category: 'ACTS' },
    { title: 'Espacio Seguro', description: 'Evita planes sociales ruidosos hoy. Prioriza el descanso.', category: 'QUALITY' },
    { title: 'Validación Táctica', description: 'Escucha sin intentar resolver. Valida su sentir.', category: 'VERBAL' }
  ],
  FOLLICULAR: [
    { title: 'Aventura Ligera', description: 'Propón una caminata o salida al aire libre.', category: 'QUALITY' },
    { title: 'Elogio Estratégico', description: 'Reconoce su brillo y energía renovada.', category: 'VERBAL' },
    { title: 'Apoyo Proactivo', description: 'Ayúdala con una tarea pendiente para liberar su agenda.', category: 'ACTS' }
  ],
  OVULATION: [
    { title: 'Cita de Alto Impacto', description: 'Es su momento de mayor energía social. Salgan a lucirse.', category: 'QUALITY' },
    { title: 'Conexión Profunda', description: 'Busca una conversación significativa sobre el futuro.', category: 'VERBAL' },
    { title: 'Detalle Físico', description: 'El contacto físico es clave en esta fase.', category: 'PHYSICAL' }
  ],
  LUTEAL: [
    { title: 'Paciencia Blindada', description: 'Cualquier roce es por la fase. Sé su roca de calma.', category: 'ACTS' },
    { title: 'Snack de Emergencia', description: 'Ten a mano su comida reconfortante favorita.', category: 'ACTS' },
    { title: 'Refuerzo Positivo', description: 'Recuérdale lo increíble que es, especialmente si se siente insegura.', category: 'VERBAL' }
  ]
};

export async function generarMisionesTactica(contexto: any) {
  const phase = (contexto.phase || 'MENSTRUAL').toUpperCase();
  try {
    const text = await generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: `Actúa como MateCare. Genera 3 misiones tácticas para un hombre cuya pareja está en fase ${phase}. Formato JSON: [{title, description, category}].` }] }],
      config: {
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW
        }
      }
    });
    if (!text) throw new Error("Respuesta vacía o bloqueada por seguridad");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text;

    const parsed = JSON.parse(cleanJson);
    return Array.isArray(parsed) ? parsed : FALLBACK_MISSIONS[phase];
  } catch (error) {
    console.error("Error generando misiones G3:", error);
    return FALLBACK_MISSIONS[phase] || FALLBACK_MISSIONS.MENSTRUAL;
  }
}
