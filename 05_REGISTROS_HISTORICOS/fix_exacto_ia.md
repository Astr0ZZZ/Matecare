# 🛠️ FIX EXACTO — LA IA NO LLEGA A LA APP

## Estado real del sistema (verificado)

| Componente | Estado |
|---|---|
| Backend corriendo en `:3001` | ✅ ONLINE |
| IP local `192.168.1.116` | ✅ Correcta (coincide con `.env` mobile) |
| OpenAI API Key | ✅ Válida |
| Modelo `gpt-5-nano` | ✅ Existe y responde |
| Flujo doble agente (Intérprete + Copiloto) | ✅ Funciona |
| Rutas backend `/api/dashboard/summary`, `/api/ai/chat`, `/api/ai/vision-chat` | ✅ Registradas |
| Ruta mobile → backend | ✅ Path correcto |

> [!IMPORTANT]
> **La conexión, la API y el modelo funcionan.** El problema es que el **Agente 2 (El Copiloto)** no respeta los límites de longitud, las respuestas tardan ~52 segundos en Railway, y los datos de misiones/oráculo se generan en background pero no llegan bien al Dashboard porque el polling se rinde antes de que la IA termine.

---

## 🔴 PROBLEMA RAÍZ: LA IA ES DEMASIADO LENTA + RESPUESTAS GIGANTES

El flujo actual hace esto:

```
Dashboard carga → getOracleAdvice en BACKGROUND → Agente 1 (28s) → Agente 2 (23s)
                                                   ────────────── 52 segundos ───────
```

El Dashboard hace polling cada 5s, máximo 12 veces (60s). La IA tarda 52s → **encaja justo en el borde**. En Railway con latencia de red, probablemente excede los 60s y el oráculo nunca se muestra.

Además, GPT-5 Nano produce respuestas de 100-200 palabras cuando el prompt dice "30-45 palabras" → la UI se ve rota con textos genéricos.

---

## ✅ FIXES EXACTOS (Copiar y pegar, en este orden)

### FIX 1: `ai.service.ts` — Agregar `max_tokens` y usar constante `MODEL`

Abre [ai.service.ts](file:///c:/Users/juanp/Desktop/Matecare%20antigravity/matecare_ordenado/02_codigo_base/matecare-backend/src/services/ai.service.ts)

**Cambio A** — Línea 156-163, reemplazar el bloque del Agente 1:
```diff
     const interpreterRes = await openai.chat.completions.create({
-      model: "gpt-5-nano", // Modelo con soporte de visión real
+      model: MODEL,
       messages: [
         { role: "system", content: interpreterInstructions },
         { role: "user", content: userContent }
       ],
-      response_format: { type: "json_object" }
+      response_format: { type: "json_object" },
+      max_tokens: 500
     });
```

**Cambio B** — Línea 210-214, reemplazar el bloque del Agente 2:
```diff
     const copilotRes = await openai.chat.completions.create({
       model: MODEL,
       messages: copilotMessages,
-      response_format: { type: "json_object" }
+      response_format: { type: "json_object" },
+      max_tokens: 400
     });
```

**Cambio C** — Línea 226-234, mejorar el error logging:
```diff
   } catch (error: any) {
-    console.error("[GPT-5-NANO] Error Crítico:", error);
+    console.error("[GPT-5-NANO] Error Crítico:", error?.message || error);
+    console.error("[GPT-5-NANO] Status:", error?.status, "Code:", error?.code);
     return {
```

---

### FIX 2: `copilot.prompt.ts` — Forzar respuestas cortas

Abre [copilot.prompt.ts](file:///c:/Users/juanp/Desktop/Matecare%20antigravity/matecare_ordenado/02_codigo_base/matecare-backend/src/prompts/copilot.prompt.ts)

Reemplazar **TODO** el contenido del archivo con:
```typescript
export const COPILOT_SYSTEM_PROMPT = `
Eres MateCare Coach, el mentor masculino definitivo en psicología femenina. 
Tu misión es guiar al usuario para que domine su relación usando la inteligencia de "La Intérprete".

PERSONALIDAD:
- Coach Masculino: Eres el hermano mayor que ya descifró a las mujeres. Hablas con autoridad, seguridad y cero rodeos.
- Tono: Alfa elegante, empático con el hombre, protector de la relación.

REGLAS DE ORO:
1. RESPONDE DIRECTO: Si el usuario pregunta, responde usando la "Lectura Interna" como tu propia memoria.
2. DINAMISMO: Saluda de forma variada y breve (ej: "A sus órdenes", "Calibrando táctica...", "Escucha esto:"). Ve directo al valor táctico. No repitas frases robóticas.
3. PROHIBIDO LOS CORCHETES: No uses corchetes, ni etiquetas como "Estado:". Entrega el mensaje limpio.
4. MISIONES "HEAT": Una misión debe ser audaz, pervertida pero con clase.

LÍMITES DE LONGITUD (OBLIGATORIO — INCUMPLIR ESTO ES UN FALLO CRÍTICO):
- Si mode=DASHBOARD: "response" = MÁXIMO 40 palabras. Sé táctico, directo, sin introducciones.
- Si mode=CHAT: "response" = MÁXIMO 25 palabras. Una frase precisa.
- Cada "description" de misión = MÁXIMO 12 palabras. Acción concreta.
- NUNCA escribas "REPORTE DIARIO", "PLAN DEL DÍA", ni encabezados en tu response.
- NUNCA repitas textualmente lo que dice la Intérprete. Tradúcelo a acción.

CONCEPTO: "No le preguntes qué tiene, dale lo que su biología necesita".
`.trim();
```

---

### FIX 3: `interpreter.prompt.ts` — Compactar output del Agente 1

Abre [interpreter.prompt.ts](file:///c:/Users/juanp/Desktop/Matecare%20antigravity/matecare_ordenado/02_codigo_base/matecare-backend/src/prompts/interpreter.prompt.ts)

Reemplazar **TODO** el contenido con:
```typescript
export const INTERPRETER_SYSTEM_PROMPT = `
Eres La Intérprete, psicóloga experta en la psique femenina. Decodifica su estado analizando:

1. HORMONAL: Cómo su fase afecta energía y libido.
2. EMOCIONAL: Cruce MBTI con necesidad de validación o espacio.
3. SEXUAL/HOT: Nivel de apertura erótica y tipo de seducción efectiva hoy.

REGLAS:
- Si detectas ventana de oportunidad (ovulación/pico), avisa al Coach.
- Si VISIÓN_LOCAL tiene datos técnicos (ear, jaw_tension), úsalos para corroborar la imagen.
- Sé CONCISO. Cada campo máximo 20 palabras.

OUTPUT (JSON ESTRICTO):
{
  "real_state": "máx 20 palabras",
  "sexual_mood": "máx 20 palabras",
  "hidden_need": "máx 15 palabras",
  "risk_flag": "ninguno | conflicto_latente | agotamiento | necesita_espacio | crisis",
  "tactical_note": "máx 20 palabras",
  "style_analysis": "máx 25 palabras",
  "synergy_index": 75
}
`.trim();
```

---

### FIX 4 (OPCIONAL): Aumentar timeout del polling en Dashboard

Abre [index.tsx](file:///c:/Users/juanp/Desktop/Matecare%20antigravity/matecare_ordenado/02_codigo_base/matecare-mobile/app/%28tabs%29/index.tsx)

Línea 63, cambiar el límite de polling de 12 a 20 (100 segundos en vez de 60):
```diff
-              if (pollCount.current >= 12) {
+              if (pollCount.current >= 20) {
```

---

## 📋 CHECKLIST DE EJECUCIÓN

1. ☐ Editar `ai.service.ts` (3 cambios: A, B, C)
2. ☐ Reemplazar `copilot.prompt.ts` completo
3. ☐ Reemplazar `interpreter.prompt.ts` completo
4. ☐ (Opcional) Cambiar polling limit en `index.tsx`
5. ☐ Reiniciar el backend: matar el proceso en puerto 3001 y volver a correr `npx ts-node src/index.ts`
6. ☐ Probar desde la app: abrir Dashboard → esperar 30-40 segundos → debería llegar el oráculo y las misiones

---

> [!CAUTION]
> Después de estos fixes, la primera carga del Dashboard seguirá tardando ~20-30 segundos (son 2 llamadas secuenciales a GPT-5 Nano). Esto es NORMAL. Las siguientes cargas usarán el caché de 20 horas y serán instantáneas.
