# MATECARE — DIAGNÓSTICO TÉCNICO v5.2
> Análisis de flujos rotos, variables huérfanas y construcciones incompletas

---

## 1. ARQUITECTURA REAL DEL SISTEMA

```
App Mobile
  ├── (tabs)/index.tsx          → Dashboard
  ├── (tabs)/chat.tsx           → Chat (agente masculino/femenino)
  ├── (tabs)/vision-scan.tsx    → Lectura Visual
  ├── (tabs)/calendar.tsx       → Calendario
  ├── (tabs)/ranking.tsx        → Ranking
  └── (tabs)/profile.tsx        → Perfil

Backend Node
  ├── ai.controller.ts          → handleChat, getDailyRecommendation
  ├── vision.controller.ts      → handleVisionChat
  ├── dashboard.controller.ts   → getDashboardSummary
  └── ai.service.ts
        ├── runUnifiedTacticalAI()   → Agente 1 (gpt-4o-mini) + Agente 2 (gpt-5-nano)
        ├── getOracleAdvice()        → Oráculo con caché 20h + genera misiones
        ├── processChat()            → Chat + visión
        └── generateMissions()       → DUPLICADO (ver sección 2.1)

Servidor Python (solo local por ahora)
  └── deepface_server_v2.py     → corre en localhost:5001
        ← visionAnalysis.service.ts apunta a DEEPFACE_URL (env var)
        ← tiene circuit breaker: 4 fallos → abre por 60s
        ← timeout por llamada: 5000ms
```

---

## 2. PROBLEMAS CRÍTICOS DE FLUJO (BACKEND)

### 2.1 — `generateMissions()` duplica exactamente lo que hace `getOracleAdvice()`
**Archivo:** `ai.service.ts` líneas ~360-395

`generateMissions` llama a `runUnifiedTacticalAI` y persiste misiones. `getOracleAdvice` hace lo mismo en las líneas ~310-340. Son dos caminos para el mismo resultado con una diferencia peligrosa en la condición de borrado:

- `generateMissions` borra: `where: { userId, isCompleted: false }`
- `getOracleAdvice` borra: `where: { userId, progress: { lt: 100 } }`

Si ambas corren, la segunda puede borrar misiones que la primera acaba de crear (o vice versa según timing). Además, `generateMissions` está importada en `dashboard.controller.ts` línea 4 pero **nunca se llama** en ese archivo — es dead import.

**Estado actual:** `dashboard.controller.ts` solo llama a `getOracleAdvice`. `generateMissions` no tiene ningún caller activo.

**Fix:** Eliminar `generateMissions` de `ai.service.ts` y su import en `dashboard.controller.ts`.

---

### 2.2 — El servidor Python falla silenciosamente y el prompt del Agente 1 recibe contexto vacío
**Archivo:** `ai.service.ts` → `getUnifiedContext()` líneas ~240-248

El circuit breaker en `visionAnalysis.service.ts` funciona correctamente. El problema es lo que pasa **después** de que falla:

```
getUnifiedContext(userId, imageBase64)
  → visionService.analyze(imageBase64)  ← falla o circuit abierto
  → .catch(() => null)                  ← silenciado
  → technicalVision = null              ← queda como {}

→ runUnifiedTacticalAI recibe:
    context.vision.technical = {}
    VISIÓN_LOCAL: {}                    ← el Agente 1 recibe esto vacío
```

El análisis visual igual funciona porque `imageBase64` se pasa directo al Agente 1 como `image_url`. Pero el campo `VISIÓN_LOCAL` del prompt siempre está vacío en Railway, degradando la calidad del análisis (el modelo recibe menos contexto técnico de pose, EAR, jaw tension que Python sí entregaría).

**En local funciona** porque Python corre en `localhost:5001`.

**Fix para producción:** En `getUnifiedContext`, cuando `visionService.analyze` falla y no hay `visionAnalysis` guardado en DB, pasar explícitamente `"Sin datos técnicos locales"` en lugar de `{}` para que el Agente 1 sepa que debe confiar solo en su análisis visual directo.

---

### 2.3 — Prefijo base64 duplicado al llamar a GPT con imagen
**Archivos:** `vision-scan.tsx` línea ~57 → `vision.controller.ts` → `ai.service.ts` línea ~155

**Cadena del bug:**

1. `vision-scan.tsx` construye: `` image: `data:image/jpeg;base64,${base64}` ``
2. Llega a `vision.controller.ts` como `req.body.image` con el prefijo incluido
3. Se pasa a `processChat(userId, msg, image, [])` — `image` ya trae el prefijo
4. En `runUnifiedTacticalAI`, se construye: `` url: `data:image/jpeg;base64,${imageBase64}` ``
5. Resultado: `data:image/jpeg;base64,data:image/jpeg;base64,/9j/4AA...`

GPT no puede leer esa URL → no hay análisis visual real → `style_analysis` retorna el fallback `"Calibrando visión táctica..."` → chips vacíos o con texto de relleno.

**Fix recomendado — en `ai.service.ts` (más defensivo):**
```ts
// runUnifiedTacticalAI, antes de construir el image_url
const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
// luego:
url: `data:image/jpeg;base64,${cleanBase64}`
```

---

### 2.4 — `handleChat` no persiste `lastInterpreterAnalysis` en DB
**Archivo:** `ai.controller.ts` → `handleChat`

`handleChat` llama a `processChat()` que retorna `{ response, vision, styleAnalysis, interpreter }`. El campo `interpreter` **nunca se guarda** en DB desde este flujo. Solo `vision.controller.ts` lo persiste.

**Consecuencia:** Los chips del Dashboard (real_state, sexual_mood, hidden_need) solo se actualizan cuando el usuario usa Lectura Visual. Si el usuario solo usa el Chat, los chips muestran el último análisis de visión o `null`.

**Fix — en `ai.controller.ts` después de `processChat`:**
```ts
const { response: aiResponse, interpreter } = await processChat(...);

if (interpreter) {
  await prisma.partnerProfile.update({
    where: { userId },
    data: { lastInterpreterAnalysis: interpreter } as any
  }).catch(() => {});
}
```

---

### 2.5 — `cleanTacticalResponse` no cubre todas las variantes de saludos robóticos antes de guardar en DB
**Archivo:** `ai.service.ts` → `getOracleAdvice` + `dashboard.controller.ts` líneas ~38-44

`cleanTacticalResponse` se aplica dentro de `runUnifiedTacticalAI` antes de retornar, así que el valor guardado debería estar limpio. Sin embargo, `dashboard.controller.ts` tiene una segunda limpieza sobre `cachedAdvice` que filtra `"Aquí está el reporte diario"`. Esto indica que esa string llegó a la DB en algún momento, lo que significa que `cleanTacticalResponse` no la cubría.

**Riesgo:** Si el modelo genera una nueva variante de saludo, pasa el filtro de `cleanTacticalResponse`, queda guardada en DB sucia. La limpieza del controller solo aplica al servir, no al guardar.

**Fix:** Mover las strings extra al `cleanTacticalResponse` central en `ai.service.ts`:
```ts
.replace(/Aquí está el reporte diario\.? ?/gi, '')
```

---

### 2.6 — `getDailyRecommendation` es ruta activa sin caller en el mobile
**Archivo:** `ai.controller.ts` → `getDailyRecommendation`
**Ruta registrada:** `GET /api/ai/recommendation/:userId`

Llama a `getOracleAdvice(userId)` y retorna el resultado. El Dashboard **no usa esta ruta** — usa `GET /api/dashboard/summary/:userId` que internamente hace lo mismo. No tiene caller en la app mobile.

No causa daño activo, pero es superficie de API muerta que duplica responsabilidades.

---

## 3. PROBLEMAS DE UI (FRONTEND)

### 3.1 — Chips del Intérprete no se actualizan en el Dashboard tras procesar foto
**Causa raíz:** Dos problemas encadenados:
1. El base64 llega duplicado a GPT (bug 2.3) → `interpreter.style_analysis` viene como fallback
2. Aunque `vision.controller` persiste `lastInterpreterAnalysis` correctamente en DB, el Dashboard no se invalida al volver desde `vision-scan.tsx` — el polling solo se activa cuando `isGenerating: true`, flag que visión nunca setea

**Fix:** En `vision-scan.tsx`, tras `processPhoto` exitoso, registrar un timestamp en `AsyncStorage`. En `Dashboard`, usar `useFocusEffect` para comparar ese timestamp y forzar re-fetch al volver a la pantalla:
```ts
// vision-scan.tsx tras éxito
await AsyncStorage.setItem('lastVisionUpdate', Date.now().toString());

// index.tsx (Dashboard)
useFocusEffect(useCallback(() => {
  AsyncStorage.getItem('lastVisionUpdate').then(ts => {
    if (ts && Number(ts) > lastFetchTime.current) fetchData();
  });
}, []));
```

---

### 3.2 — `style_analysis` en `RecommendationCard` muestra texto de fallback como si fuera análisis real
**Archivo:** `RecommendationCard.tsx` línea ~44

La condición actual solo filtra la string `"Sin contexto visual"`. Cuando el base64 falla (bug 2.3), `runUnifiedTacticalAI` retorna desde su `catch`:
```ts
styleAnalysis: "Calibrando visión táctica..."
```
Esa string no es filtrada → el chip azul aparece con `"📸 LECTURA TÁCTICA: Calibrando visión táctica..."`.

**Fix:**
```tsx
const VISION_FALLBACKS = ["Sin contexto visual", "Calibrando visión", "Análisis visual completado"];
const showVision = interpreter?.style_analysis &&
  !VISION_FALLBACKS.some(p => interpreter.style_analysis.includes(p));
```

---

### 3.3 — `MissionCard` llama a un endpoint que no existe y con ruta duplicada
**Archivo:** `MissionCard.tsx` línea ~95

**Problema A — ruta duplicada:** `apiFetch` en `api.ts` agrega `/api` automáticamente al base URL. La llamada en `MissionCard` usa:
```ts
apiFetch('/api/missions/evidence', ...)
```
URL final construida: `.../api/api/missions/evidence` → 404.

**Problema B — endpoint inexistente:** `missions.routes.ts` no tiene ningún `router.post('/evidence', ...)` ni `router.post('/:id/evidence', ...)`. La feature de captura de evidencia está construida en el frontend pero el backend no tiene el endpoint.

**Fix frontend** — `MissionCard.tsx`:
```ts
await apiFetch(`/missions/${id}/evidence`, { method: 'POST', body: JSON.stringify({...}) })
```

**Fix backend** — agregar en `missions.routes.ts`:
```ts
router.post('/:id/evidence', requireAuth, submitMissionEvidence);
```
Y crear el handler `submitMissionEvidence` en `missions.controller.ts`.

---

### 3.4 — Tarjeta HOT puede no activarse si el modelo retorna `intensity` en minúscula o variante
**Archivo:** `ai.service.ts` → `getOracleAdvice` al persistir misiones

El check en `MissionCard.tsx` es `intensity === 'HOT'` (exacto, case-sensitive). El prompt del Copiloto especifica `"intensity": "HOT"` pero GPT puede devolver `"hot"`, `"Hot"` o `"HEAT"`.

**Fix — normalizar al persistir en `getOracleAdvice`:**
```ts
intensity: ['HOT', 'HEAT', 'hot', 'heat'].includes(m.intensity) ? 'HOT' : 'NORMAL'
```

---

### 3.5 — Polling del Dashboard no tiene límite máximo de iteraciones
**Archivo:** `index.tsx` línea ~62

El polling se detiene cuando `summaryData.recommendation.isGenerating === false`. Si la generación background falla (el `.catch` en `dashboard.controller.ts` la silencia), `cachedAdvice` queda `null` → el controller siempre retorna `isGenerating: true` → el interval corre indefinidamente cada 5s.

**Fix:**
```ts
let pollCount = 0;
pollInterval.current = setInterval(() => {
  pollCount++;
  if (pollCount > 12) { // máximo 60s
    clearInterval(pollInterval.current);
    pollInterval.current = null;
    setIsWaitingForAI(false);
    return;
  }
  fetchData(true);
}, 5000);
```

---

## 4. MAPA DE VARIABLES EN DB — ESTADO REAL

| Campo en `PartnerProfile` | Quién escribe | Quién lee | Estado |
|---|---|---|---|
| `lastAdvice` | `getOracleAdvice`, `vision.controller` | `dashboard.controller` | ✅ Activo |
| `adviceUpdatedAt` | `getOracleAdvice` | Caché check interno | ✅ Activo |
| `lastInterpreterAnalysis` | `vision.controller`, `getOracleAdvice` | `dashboard.controller` → chips en `RecommendationCard` | ⚠️ Solo actualiza si usó visión o se regeneró el oráculo — chat no lo actualiza (bug 2.4) |
| `lastVisionDescription` | `vision.controller` | No se lee en ningún componente | 🔴 Guardado pero nunca consumido |
| `visualStyle` | `vision.controller` via `humanize()` | No se lee en ningún componente | 🔴 Guardado pero nunca consumido |
| `visionAnalysis` | `vision.controller` | `getUnifiedContext` como `technicalVision` | ⚠️ En Railway siempre `{}` porque Python está offline; en local sí funciona |

---

## 5. FLUJO CORRECTO DE REFERENCIA

```
LECTURA VISUAL
  vision-scan.tsx
    → base64 puro (sin prefijo) → POST /api/ai/vision-chat
    → vision.controller → processChat(userId, msg, base64puro, [])
    → getUnifiedContext: lee visionAnalysis de DB como contexto base técnico
    → runUnifiedTacticalAI:
        Agente 1 recibe image_url correcto ✅ + VISIÓN_LOCAL de DB si existe
        Retorna interpreter con style_analysis real
        Agente 2 genera response + missions con intensity normalizada a 'HOT'/'NORMAL'
    → Persistir: lastInterpreterAnalysis, lastVisionDescription, lastAdvice
    → Respuesta al móvil: { response, interpreter, vision }
    → Mobile: escribir timestamp en AsyncStorage
    → Dashboard al enfocar: detecta timestamp nuevo → re-fetch → chips actualizados

DASHBOARD (carga)
  GET /api/dashboard/summary/:userId
    → profile.lastInterpreterAnalysis (fresco si hubo visión o chat reciente)
    → profile.lastAdvice (caché 20h)
    → Si no hay caché: background getOracleAdvice() → persiste → polling detecta (máx 60s)
    → Retorno inmediato con lo que haya en DB

CHAT
  POST /api/ai/chat { mensaje, history, image? }
    → processChat → runUnifiedTacticalAI
    → Persistir lastInterpreterAnalysis ← FALTA HOY (bug 2.4)
    → Respuesta al móvil
```

---

## 6. PRIORIDAD DE FIXES

| # | Fix | Impacto | Dificultad |
|---|---|---|---|
| 1 | Limpiar prefijo base64 en `ai.service.ts` (bug 2.3) | 🔴 Visión completamente rota en prod | Muy bajo |
| 2 | Normalizar `intensity` HOT al persistir misiones (bug 3.4) | 🔴 Tarjeta roja nunca aparece | Muy bajo |
| 3 | Corregir ruta en `MissionCard` + crear endpoint evidence (bug 3.3) | 🔴 Feature evidencia es 404 | Bajo |
| 4 | Persistir `lastInterpreterAnalysis` en `handleChat` (bug 2.4) | 🟡 Chips obsoletos al usar solo chat | Bajo |
| 5 | Filtrar strings de fallback en `RecommendationCard` (bug 3.2) | 🟡 Ruido visual con texto de relleno | Muy bajo |
| 6 | Timeout máximo al polling en Dashboard (bug 3.5) | 🟡 Loop infinito si IA falla | Bajo |
| 7 | Invalidar Dashboard desde VisionScan con AsyncStorage (bug 3.1) | 🟡 Chips no sincronizan entre pantallas | Medio |
| 8 | Mover limpieza extra a `cleanTacticalResponse` central (bug 2.5) | ⚪ Prevención de saludos futuros | Muy bajo |
| 9 | Eliminar `generateMissions` dead code (bug 2.1) | ⚪ Limpieza de código | Muy bajo |
| 10 | Eliminar o documentar `getDailyRecommendation` (bug 2.6) | ⚪ Limpieza de API | Muy bajo |

---

*Generado desde inspección de código fuente — MateCare v5.2 — Mayo 2026*
