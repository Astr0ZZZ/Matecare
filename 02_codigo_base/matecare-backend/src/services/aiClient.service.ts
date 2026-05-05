import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function askAI(messages: any[]) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for Gemini

  try {
    console.log("[AI] Starting Gemini call...");
    const systemPrompt = messages.find(m => m.role === 'system')?.content || "";
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: systemPrompt,
    });
    
    // History should exclude system and the LAST user message
    const historyMessages = messages.slice(0, -1).filter(m => m.role !== 'system');
    let history = historyMessages.map(m => ({ 
      role: m.role === 'assistant' ? 'model' : 'user', 
      parts: [{ text: m.content }] 
    }));
    
    // Gemini strictly requires the first history message to be from 'user'
    if (history.length > 0 && history[0].role !== 'user') {
      history.unshift({ role: 'user', parts: [{ text: 'Inicia nuestro chat.' }] });
    }
    
    const userMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: history.length > 0 ? history : undefined,
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    clearTimeout(timeoutId);
    console.log("[AI] Gemini response received.");
    return response.text();
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("AI Error:", error.name === 'AbortError' ? 'Gemini Timeout' : error.message);
    
    // FALLBACK TÁCTICO si falla la IA o hay timeout
    return `Lo más importante hoy es la presencia tranquila. Dado que está en esta fase, evita proponer planes que requieran mucha energía social. Un pequeño gesto silencioso, como prepararle algo de comer o simplemente estar a su lado sin pedir nada, tendrá un impacto enorme. Es momento de observar más y hablar menos.`;
  }
}
export async function generarConsejoTactico(mensaje: string, faseMujer: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const systemPrompt = `
      Eres MateCare, una IA táctica que asesora a hombres sobre cómo apoyar a sus parejas.
      Contexto crítico: La pareja del usuario está en la fase ${faseMujer} de su ciclo menstrual.
      Instrucciones: Responde de forma directa, empática pero estructurada como un reporte táctico.
    `;

    const promptFinal = `${systemPrompt}\n\nConsulta del usuario: ${mensaje}`;
    const result = await model.generateContent(promptFinal);
    return result.response.text();
  } catch (error) {
    console.error("Error en Gemini:", error);
    throw new Error("Fallo en la comunicación con la matriz táctica.");
  }
}
