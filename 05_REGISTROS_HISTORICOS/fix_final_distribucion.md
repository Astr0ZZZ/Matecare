# 🎯 FIX FINAL — Separar correctamente la data de IA en la app

## Investigación OpenAI (Resumen)

De la doc oficial de GPT-5 Nano:
- **API ID:** `gpt-5-nano` (resuelve a `gpt-5-nano-2025-08-07`)
- **Tipo:** Modelo de razonamiento (reasoning) — NO acepta `max_tokens`, solo `max_completion_tokens`
- **Structured Output:** Soporta `response_format: { type: "json_object" }` ✅
- **Vision:** Soporta imágenes en el input ✅
- **Recomendación OpenAI:** Para workloads nuevos cost-sensitive, recomiendan GPT-5.4 nano, pero GPT-5 nano sigue funcionando

## 🔴 PROBLEMA PRINCIPAL: El Dashboard muestra datos internos del Agente 1

Tu `RecommendationCard.tsx` recibe `interpreter` y renderiza **cada campo** como un chip de color:

| Chip | Color | Dato | ¿Debería verse en Dashboard? |
|---|---|---|---|
| 🧠 `real_state` | gris | Estado emocional crudo | ❌ NO — Es dato interno para el Agente 2 |
| 🔥 `sexual_mood` | rosa | Análisis sexual | ❌ NO — Es dato interno |
| ✨ `hidden_need` | dorado | Necesidad oculta | ❌ NO — Es dato interno |
| 📸 `style_analysis` | azul | Lectura visual | ❌ NO — Solo si Vision Control está activo |

**Resultado:** El usuario ve 4 tarjetas de colores con texto largo que son datos INTERNOS del análisis psicológico. Solo debería ver el **texto del oráculo** (la `response` del Copiloto) y las **3 misiones**.

---

## ✅ FIXES EXACTOS (3 archivos, nada nuevo)

### FIX 1: `RecommendationCard.tsx` — Ocultar chips internos en Dashboard

El `interpreter` tiene datos valiosos, pero **no van en la tarjeta del oráculo**. Son para el perfil/Vision Control.

Abrir [RecommendationCard.tsx](file:///c:/Users/juanp/Desktop/Matecare%20antigravity/matecare_ordenado/02_codigo_base/matecare-mobile/components/RecommendationCard.tsx)

**Reemplazar líneas 26-56** (todo el bloque de chips) con:

```tsx
        {/* Los datos del interpreter son internos — se muestran solo en Vision Control */}
```

Es decir, ELIMINAR completamente los chips `interpreter.real_state`, `interpreter.sexual_mood`, `interpreter.hidden_need` y `interpreter.style_analysis` de esta tarjeta. La tarjeta solo debe mostrar el `content` (texto del oráculo).

### FIX 2: `ai.service.ts` — Limpiar el `interpreter` que se guarda

El `getOracleAdvice` (línea 321-329) guarda el `interpreter` completo en el perfil. Esto está bien para Vision Control, pero el Dashboard no debería enviarlo al `RecommendationCard`.

Abrir [dashboard.controller.ts](file:///c:/Users/juanp/Desktop/Matecare%20antigravity/matecare_ordenado/02_codigo_base/matecare-backend/src/controllers/dashboard.controller.ts)

**Línea 70** — cambiar el `interpreter` que se envía al móvil para que sea mínimo:

```diff
       recommendation: {
         text: (cachedAdvice && cachedAdvice.trim().length > 0) ? cachedAdvice.trim() : "Sincronizando reporte táctico...",
-        interpreter: finalInterpreter, 
+        interpreter: null,  // Los chips internos van en Vision Control, no en el Dashboard
         isGenerating: !cachedAdvice
       }
```

### FIX 3: `copilot.prompt.ts` — Ya está bien actualizado

Los prompts que pusiste ya están correctos con los límites. El problema visual era que los chips del `interpreter` se mostraban en la tarjeta, no que el Copiloto generara texto largo.

---

## 📊 SEPARACIÓN CORRECTA DE DATOS

| Dato | ¿Dónde se muestra? | Fuente |
|---|---|---|
| `response` del Copiloto (30-40 palabras) | **Dashboard → RecommendationCard** | `getOracleAdvice` → `lastAdvice` |
| 3 misiones (title, description, intensity) | **Dashboard → MissionCards** | `getOracleAdvice` → `Mission` table |
| `interpreter.real_state` | **Vision Control** (su propio menú) | `lastInterpreterAnalysis` en perfil |
| `interpreter.sexual_mood` | **Vision Control** | Perfil → visionAnalysis |
| `interpreter.style_analysis` | **Vision Control** | Perfil → lastVisionDescription |
| `response` del Copiloto (25 palabras) | **Chat** | `processChat` |
| Vision Python (ear, jaw, posture) | **Vision Control** | localhost:5001 |

---

## 📋 CHECKLIST

1. ☐ **RecommendationCard.tsx** → Borrar líneas 26-56 (los chips del interpreter)
2. ☐ **dashboard.controller.ts** → Cambiar `interpreter: finalInterpreter` a `interpreter: null`
3. ☐ Reiniciar backend
4. ☐ Recargar app → El Dashboard solo debe mostrar: texto oráculo + 3 misiones + tarjeta HOT roja

> [!TIP]
> Cuando implementes Vision Control en su propio menú, AHII sí usas el `interpreter` del perfil (`lastInterpreterAnalysis`) para mostrar los chips de estado emocional, mood sexual, etc.
