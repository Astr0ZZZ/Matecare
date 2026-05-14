# 🛠️ INSTRUCTIVO DE FIXES — MateCare v5.2

> [!IMPORTANT]
> Sigue estos fixes en orden. Son 5 cambios en 4 archivos. Nada nuevo, solo ediciones.

---

## FIX 1: Timeouts del Móvil (evita los "Aborted")

**Archivo:** `matecare-mobile/services/api.ts`  
**Problema:** El timeout de `/ai/chat` es 30s y el de `/ai/vision-chat` es 45s. El doble agente tarda ~15-25s POR agente (total ~30-50s), así que el móvil aborta antes de que termine.

**Líneas 5-11** — Reemplazar el bloque `ENDPOINT_TIMEOUTS` con:

```typescript
const ENDPOINT_TIMEOUTS: Record<string, number> = {
  '/ai/vision-chat': 75_000,       // Vision + 2 agentes = ~50-60s  
  '/ai/chat': 60_000,              // Chat con 2 agentes = ~30-45s
  '/ai/recommendation': 60_000,    
  '/dashboard': 45_000,            
  '/missions/reset': 60_000,       // Reset regenera misiones con IA
  default: 25_000,
};
```

> [!TIP]
> Agregamos `/missions/reset` porque también llama al doble agente para generar 3 misiones nuevas.

---

## FIX 2: Botón "Limpiar Chat" en el header

**Archivo:** `matecare-mobile/app/(tabs)/chat.tsx`

**Problema:** El historial se queda guardado en AsyncStorage y no hay forma de limpiarlo. La función `limpiarHistorial` YA existe en `useAIChat.ts` (línea 124), solo falta conectarla.

**Paso A** — En **línea 15**, agregar `limpiarHistorial`:

```typescript
const { mensajes, enviarMensaje, cargando, limpiarHistorial } = useAIChat();
```

**Paso B** — En **líneas 67-71** (el bloque del header), reemplazar con:

```tsx
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>MateCare AI</Text>
            <Text style={[styles.subtitle, { color: theme?.colors?.textMuted || '#8F8F8F', fontFamily: theme?.typography?.boldFont }]}>Sistema Táctico</Text>
          </View>
          <TouchableOpacity onPress={limpiarHistorial} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={20} color={theme?.colors?.textMuted || '#8F8F8F'} />
          </TouchableOpacity>
        </View>
```

> [!NOTE]
> Esto reemplaza la bolita verde por un ícono de basura que limpia todo el chat.

---

## FIX 3: NO agregar `max_completion_tokens` en `ai.service.ts`

**Archivo:** `matecare-backend/src/services/ai.service.ts`

**Problema:** En la sesión anterior ya quitamos `max_completion_tokens` porque GPT-5 Nano devolvía `content: null`. Si volviste a agregarlo, **quítalo** de las dos llamadas:

Busca estas dos secciones y asegúrate que NO tengan `max_completion_tokens`:

```typescript
// AGENTE 1 (~línea 156)
const interpreterRes = await openai.chat.completions.create({
  model: MODEL,
  messages: [...],
  response_format: { type: "json_object" }
  // ❌ NO poner max_completion_tokens aquí
});

// AGENTE 2 (~línea 210)
const copilotRes = await openai.chat.completions.create({
  model: MODEL,
  messages: copilotMessages,
  response_format: { type: "json_object" }
  // ❌ NO poner max_completion_tokens aquí
});
```

> [!CAUTION]
> `max_completion_tokens` en GPT-5 Nano causa respuestas `null` → JSON parse error → misiones no se generan. Los límites se controlan con el PROMPT, no con parámetros de la API.

---

## FIX 4: Prompt del Copiloto — SIN saludos en Dashboard

**Archivo:** `matecare-backend/src/services/ai.service.ts`

**Problema:** El prompt inline dice "saludando de forma táctica" → el modelo pone "A sus órdenes" en el Dashboard.

Busca el bloque del Copiloto (~línea 174) y asegúrate que el `copilotInstructions` diga exactamente:

```typescript
    const copilotInstructions = `
    ${COPILOT_SYSTEM_PROMPT}
    
    ESTRATEGIA: Estás en modo ${type}.
    RECIBES EL ANÁLISIS DE LA INTÉRPRETE Y DEBES ACTUAR COMO MATECARE COACH.
    
    LIMITANTES DE RESPUESTA (ESTRICTO):
    - Cada "description" de misión: MÁXIMO 12 PALABRAS.
    - Si mode=DASHBOARD: "response" = consejo táctico de MÁXIMO 40 PALABRAS. SIN saludos, SIN "A sus órdenes", SIN introducciones. Ve DIRECTO al consejo.
    - Si mode=CHAT: "response" = MÁXIMO 25 PALABRAS. Una frase precisa.

    FORMATO DE SALIDA (JSON ESTRICTO, sin texto fuera del JSON):
    {
      "response": "consejo táctico directo sin saludo",
      "missions": [
        {"title": "PHYSICAL", "description": "acción concreta max 12 palabras", "category": "PHYSICAL", "intensity": "NORMAL"},
        {"title": "HOT_TACTIC", "description": "misión audaz max 12 palabras", "category": "ROMANTIC", "intensity": "HOT"},
        {"title": "QUALITY", "description": "acción concreta max 12 palabras", "category": "QUALITY", "intensity": "NORMAL"}
      ]
    }
    `.trim();
```

> [!NOTE]
> Si ya hiciste este cambio en la sesión anterior, está bien. Solo verifica que el texto diga **"SIN saludos, SIN 'A sus órdenes'"**.

---

## FIX 5: Confirmar que `copilot.prompt.ts` dice "Sin saludos"

**Archivo:** `matecare-backend/src/prompts/copilot.prompt.ts`

Abre el archivo y en la regla `DINAMISMO` (línea 11), cambia:

```diff
- 2. DINAMISMO: Saluda de forma variada y breve (ej: "A sus órdenes", "Calibrando táctica...", "Escucha esto:"). Ve directo al valor táctico. No repitas frases robóticas.
+ 2. DINAMISMO: NO saludes en modo DASHBOARD. En modo CHAT puedes saludar brevemente solo la primera vez. Ve directo al valor táctico.
```

---

## 📊 RESUMEN VISUAL

| Archivo | Qué cambiar | Efecto |
|---|---|---|
| `api.ts` | Subir timeouts | No más "Aborted" |
| `chat.tsx` | Botón limpiar + desestructurar `limpiarHistorial` | Limpiar historial viejo |
| `ai.service.ts` | Quitar `max_completion_tokens` + prompt sin saludos | Respuestas sin null + sin "A sus órdenes" |
| `copilot.prompt.ts` | "NO saludes en Dashboard" | Oráculo directo |

---

## ✅ SOBRE VISION CONTROL

Lo revisé: `vision.controller.ts` está correcto. El flujo funciona así:

```
1. Foto sube → POST /api/ai/vision-chat
2. vision.controller.ts → processChat(userId, msg, IMAGE, [])
3. processChat → runUnifiedTacticalAI con tipo 'CHAT' + imagen
4. Agente 1 analiza imagen + contexto biológico
5. Agente 2 da consejo táctico
6. Se persiste: visionAnalysis, lastVisionDescription, lastInterpreterAnalysis
```

El Vision Control YA funciona. Solo necesita más timeout (Fix 1) porque con imagen son 2 agentes + visión Python = ~50-60s.

---

## 📋 CHECKLIST FINAL

1. ☐ `api.ts` — Subir timeouts + agregar `/missions/reset`
2. ☐ `chat.tsx` — Agregar `limpiarHistorial` + botón basura
3. ☐ `ai.service.ts` — Verificar SIN `max_completion_tokens` + prompt sin saludos
4. ☐ `copilot.prompt.ts` — "NO saludes en Dashboard"
5. ☐ Reiniciar backend
6. ☐ Reiniciar Expo (`npx expo start -c`)
