import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function test() {
  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: "Hola, dime 'OK' si recibes esto." }] }],
      config: {
        systemInstruction: "Eres un asistente que solo responde 'OK'.",
        thinkingConfig: {
          thinkingLevel: "low",
        }
      }
    });
    console.log("RESPONSE:", response.text);
  } catch (error) {
    console.error("ERROR:", error);
  }
}

test();
