import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function test() {
  console.log("Iniciando prueba de Gemini 2.0...");
  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ role: 'user', parts: [{ text: "Hola, dime 'OK' si recibes esto." }] }],
      config: {
        systemInstruction: "Eres un asistente que solo responde 'OK'.",
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: ThinkingLevel.LOW
        }
      }
    });
    console.log("RESPONSE:", response.text);
  } catch (error: any) {
    console.error("ERROR:", error.message || error);
    if (error.status === 429) {
      console.warn("TIP: Estás excediendo el límite de cuota. Revisa tu consola de Google AI Studio.");
    }
  }
}

test();
