import { buildMasterPrompt } from '../src/services/promptEngine.service';

async function testPrompt() {
  const userId = '00000000-0000-0000-0000-000000000000'; 
  try {
    const messages = await buildMasterPrompt(userId, "¿Cómo puedo hablar con ella hoy que parece estar cansada?");
    console.log("--- MASTER SYSTEM PROMPT ---");
    console.log(messages[0].content);
    console.log("--- USER QUERY ---");
    console.log(messages[messages.length - 1].content);
  } catch (e: any) {
    console.error("Error generating prompt:", e.message);
  }
}

testPrompt();
