# MATECARE — CONTEXTO MAESTRO PARA IA ASISTENTE v5.2
> Este documento es la fuente de verdad única. Léelo completo antes de tocar cualquier archivo.

---

## 1. QUÉ ES MATECARE

App mobile (React Native + Expo) para hombres que quieren entender mejor a su pareja femenina. Analiza el ciclo menstrual, personalidad MBTI y fotos para dar consejos tácticos diarios, misiones y un chat con IA.

---

## 2. STACK EXACTO

| Capa | Tecnología |
|---|---|
| Mobile | React Native + Expo Router |
| Backend | Node.js + Express + TypeScript + Prisma |
| Base de datos | PostgreSQL en Supabase |
| Auth | Supabase Auth (JWT) |
| IA Agente 1 | gpt-4o-mini (con visión) |
| IA Agente 2 | gpt-5-nano (decisión táctica) |
| Visión local | Python / DeepFace + MediaPipe (`deepface_server_v2.py` en `localhost:5001`) — **solo corre en local, NO en Railway** |
| Pagos | Stripe (pendiente) |
| Deploy backend | Railway |

---

## 3. ARQUITECTURA DE IA — SISTEMA DE DOBLE AGENTE

**Archivo central:** `matecare-backend/src/services/ai.service.ts`

```
Agente 1 — La Intérprete (gpt-4o-mini)
  Input:  contexto del ciclo + MBTI + VISIÓN_LOCAL (datos Python) + imagen en base64 si hay
  Output: JSON { real_state, sexual_mood, hidden_need, risk_flag, tactical_note, style_analysis, synergy_index }

Agente 2 — El Copiloto (gpt-5-nano)
  Input:  JSON del Agente 1 + mensaje del usuario
  Output: JSON { response, missions: [{ title, description, category, intensity }] }
```

**Función orquestadora:** `runUnifiedTacticalAI(context, userMessage, type, imageBase64?)`
**Función de caché/oráculo:** `getOracleAdvice(userId, onlyCache?)` — caché de 20 horas en DB
**Función de chat:** `processChat(userId, userMessage, imageBase64?, history[])`
**Función muerta (NO usar):** `generateMissions()` — eliminar, duplica `getOracleAdvice`

---

## 4. FLUJO DE DATOS POR PANTALLA

### Dashboard (`index.tsx`)
- Llama: `GET /api/dashboard/summary/:userId`
- Recibe: `{ profile, cycle, missions, recommendation: { text, interpreter, isGenerating } }`
- `interpreter` viene de `profile.lastInterpreterAnalysis` (DB) — puede tener horas de antigüedad
- Polling suave cada 5s cuando `isGenerating: true` — **tiene bug de loop infinito si IA falla, agregar límite de 12 iteraciones**

### Chat (`chat.tsx` + `useAIChat.ts`)
- Llama: `POST /api/ai/chat { mensaje, history }`
- **NO enviar `faseActual`** — el backend la ignora, la calcula solo desde DB
- Límite backend: 3 mensajes de usuario por sesión, luego retorna mensaje de límite
- Historial guardado en AsyncStorage — máximo útil 6 entradas (lo que el backend usa)
- **Agente femenino: NO EXISTE** — no construir ni mencionar hasta que se implemente

### Lectura Visual (`vision-scan.tsx`)
- Llama: `POST /api/ai/vision-chat { image: base64_puro_SIN_prefijo }`
- **IMPORTANTE:** enviar base64 puro, sin `data:image/jpeg;base64,` — el backend lo agrega
- Recibe: `{ response, interpreter, vision, state }`
- `interpreter` debe usarse para actualizar chips del Dashboard (via AsyncStorage timestamp)

### Calendario (`calendar.tsx`)
- Cálculo 100% local — no llama al backend
- No se invalida al actualizar ciclo — conocer esta limitación, no agregar calls innecesarios

### Ranking (`ranking.tsx`)
- Llama: `GET /api/profile/leaderboard/all`
- **ALERTA:** el archivo `ranking.tsx` actual tiene código de `profile.tsx` duplicado encima — al editar este archivo, borrar todo hasta el componente `RankingScreen`

### Perfil (`profile.tsx`)
- Solo maneja temas visuales y navegación a sub-páginas
- Footer dice "GEMINI 3 ENGINE" — debe decir "GPT-5 NANO"

### Perfil → Personalidad (`profile_partner.tsx`)
- Llama: `GET /api/profile` (sin userId, usa auth token)
- La respuesta tiene estructura: `{ ...partnerProfile, visualStyle, lastEmotion, mbti: { mbtiType, attachmentStyle, preferences: { preferredPlans, musicMood, stressedNeeds } } }`
- **NUNCA leer** `mbti.preferences.dominantEmotion`, `mbti.preferences.style`, `mbti.preferences.estimatedAge` — no existen
- Los datos de visión correctos son: `data.lastEmotion` y `data.visualStyle`
- `estimatedAge` y `lastCalibration` no existen en el schema — no mostrarlos

### Perfil → Ciclo (`profile_cycle.tsx`)
- Llama: `GET /api/profile`
- `data.isIrregular` **no existe en el schema** — no usarlo

---

## 5. BASE DE DATOS — CAMPOS REALES EN `PartnerProfile`

| Campo | Tipo | Quién escribe | Quién lee |
|---|---|---|---|
| `lastAdvice` | String | `getOracleAdvice`, `vision.controller` | `dashboard.controller` |
| `adviceUpdatedAt` | DateTime | `getOracleAdvice` | caché check interno |
| `lastInterpreterAnalysis` | JSON | `vision.controller`, `getOracleAdvice` | `dashboard.controller` → chips |
| `lastVisionDescription` | String | `vision.controller` | No expuesto en ningún endpoint aún |
| `visualStyle` | String | `vision.controller` | `getProfile` → retornado humanizado |
| `visionAnalysis` | JSON | `vision.controller` | `getUnifiedContext` como contexto técnico |
| `lastPeriodDate` | DateTime | `saveProfile` | `calculateCycleState` en todo el backend |
| `cycleLength` | Int | `saveProfile` | `calculateCycleState` |
| `periodDuration` | Int | `saveProfile` | `calculateCycleState` |

**Campos que NO existen:** `isIrregular`, `estimatedAge`, `lastCalibration`

---

## 6. RUTAS BACKEND — MAPA COMPLETO

Base URL mobile: `EXPO_PUBLIC_API_URL` + `/api` (lo agrega `apiFetch` automáticamente)
→ En `apiFetch`, usar siempre paths SIN `/api/`: `/profile`, `/ai/chat`, `/missions/reset`

| Método | Ruta | Controller | Estado |
|---|---|---|---|
| POST | `/api/profile` | saveProfile | ✅ |
| GET | `/api/profile` | getProfile | ✅ |
| GET | `/api/profile/current/:userId` | getCycleStatus | ✅ (redundante con dashboard) |
| GET | `/api/profile/leaderboard/all` | getRanking | ✅ |
| POST | `/api/profile/push-token` | updatePushToken | ✅ |
| POST | `/api/ai/chat` | handleChat | ✅ |
| POST | `/api/ai/vision-chat` | handleVisionChat | ✅ |
| GET | `/api/ai/recommendation/:userId` | getDailyRecommendation | ⚠️ Sin caller en mobile — no usar |
| GET | `/api/dashboard/summary/:userId` | getDashboardSummary | ✅ |
| GET | `/api/missions/:userId` | getSuggestedMissions | ✅ |
| PATCH | `/api/missions/:id/progress` | updateMissionProgress | ✅ |
| POST | `/api/missions/reset` | resetMissions | ✅ |
| GET | `/api/missions/history/:userId` | getMissionHistory | ✅ |
| POST | `/api/missions/:id/evidence` | submitMissionEvidence | 🔴 NO EXISTE AÚN — endpoint pendiente |

---

## 7. CAMBIOS EN CURSO (aplicar en este orden, no saltear)

### Paso 1 — `ai.service.ts` (aplicar todo junto en una sola pasada)
1. **Migrar fetch manual a SDK oficial de OpenAI** — instanciar `const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })` y reemplazar los dos bloques `fetch` por `openai.chat.completions.create()`
2. **Fix base64 duplicado** — antes de construir `image_url`, limpiar: `imageBase64.replace(/^data:image\/\w+;base64,/, '')`
3. **Eliminar `generateMissions()`** — función dead code que duplica `getOracleAdvice` con condición de borrado distinta (borra por `isCompleted: false` vs `progress < 100`)
4. **Persistir `lastInterpreterAnalysis` en `processChat`** — después de `runUnifiedTacticalAI`, hacer `prisma.partnerProfile.update({ lastInterpreterAnalysis: result.interpreter })`
5. **Normalizar `intensity` HOT** — al mapear misiones: `['HOT','HEAT','hot','heat'].includes(m.intensity) ? 'HOT' : 'NORMAL'`
6. **Agregar a `cleanTacticalResponse`**: `.replace(/Aquí está el reporte diario\.? ?/gi, '')`

### Paso 2 — `dashboard.controller.ts`
- Eliminar el import de `generateMissions` (quedó huérfano tras el Paso 1)

### Paso 3 — `vision-scan.tsx`
- El base64 puede enviarse con o sin prefijo — el Paso 1 ya lo limpia en el backend. No es necesario cambiar el frontend, pero si se cambia, enviar sin prefijo

### Paso 4 — `index.tsx` (Dashboard)
- Agregar límite al polling: máximo 12 iteraciones (60s), luego limpiar interval y setear `isWaitingForAI(false)`
- Agregar `useFocusEffect` que detecte timestamp de `AsyncStorage` para invalidar tras Lectura Visual

### Paso 5 — `RecommendationCard.tsx`
- Filtrar strings de fallback de visión: `["Sin contexto visual", "Calibrando visión", "Análisis visual completado"]`

### Paso 6 — `MissionCard.tsx`
- Cambiar ruta de evidencia: `/api/missions/evidence` → `/missions/${id}/evidence`

### Paso 7 — `ranking.tsx`
- Borrar todo el código duplicado de `Profile` — dejar solo el componente `RankingScreen`

### Paso 8 — `profile_partner.tsx`
- Reemplazar `prefs.dominantEmotion` por `data?.lastEmotion`
- Reemplazar `prefs.style` por `data?.visualStyle`
- Eliminar filas de `estimatedAge` y `lastCalibration` (no existen en DB)

### Paso 9 — `profile_cycle.tsx`
- Eliminar o calcular `isIrregular` localmente: `data?.cycleLength < 21 || data?.cycleLength > 35`

### Paso 10 — `profile.tsx`
- Cambiar footer: `"GEMINI 3 ENGINE"` → `"GPT-5 NANO"`

### Paso 11 — `.env.example` (backend)
- Agregar: `DEEPFACE_URL=http://localhost:5001` y `DEEPFACE_TOKEN=matecare-internal-secret`

### Paso 12 — `missions.routes.ts` + `missions.controller.ts`
- Crear endpoint `POST /:id/evidence` con handler `submitMissionEvidence`

---

## 8. REGLAS QUE NO SE DEBEN ROMPER

1. **El modelo del Agente 2 es `gpt-5-nano`** — no cambiar sin autorización explícita
2. **El modelo del Agente 1 es `gpt-4o-mini`** — tiene capacidad de visión, no sustituir por otro
3. **`apiFetch` ya agrega `/api`** — nunca usar `/api/` al inicio de los paths en el mobile
4. **No crear controladores nuevos** si la lógica puede absorberse en los existentes
5. **`getOracleAdvice` es el único generador de misiones** — no crear otras funciones que también generen misiones
6. **El servidor Python es opcional** — su fallo debe silenciarse y el flujo debe continuar degradado, no romperse
7. **`cleanTacticalResponse` debe aplicarse ANTES de guardar en DB**, no solo al servir
8. **El agente femenino no existe** — no construir UI ni lógica para él hasta que se indique
9. **`lastVisionDescription`** está guardado en DB pero no expuesto aún — no leerlo en el frontend hasta que se agregue a `getProfile`
10. **`response_format: { type: "json_object" }`** debe mantenerse en ambos agentes — garantiza JSON limpio

---

## 9. CONTEXTO DE PYTHON / VISIÓN LOCAL

- Corre en `localhost:5001`, endpoint `/analyze`
- Autenticación: header `X-Internal-Token: matecare-internal-secret`
- Circuit breaker: 4 fallos consecutivos → abre por 60 segundos
- Timeout por llamada: 5000ms
- **En Railway: siempre offline** → `visionAnalysis` siempre será `{}` → el Agente 1 trabaja solo con la imagen
- Datos que entrega Python: `emotional_tone`, `ear`, `jaw_tension`, `head_tilt`, `posture`, `suppression_detected`, `tactical_confidence`, `environment_context`, `estimated_style`
- Estos datos van al campo `VISIÓN_LOCAL` del prompt del Agente 1 — corroboran o contradicen lo que GPT ve en la imagen

---

## 10. LO QUE ESTÁ PENDIENTE (no construido aún)

| Feature | Estado |
|---|---|
| Agente femenino en Chat | No existe — no tiene prompt, UI ni lógica |
| Endpoint evidencia de misión (`/missions/:id/evidence`) | Frontend listo, backend pendiente |
| `lastVisionDescription` expuesto en perfil | Guardado en DB, no retornado por ningún endpoint |
| Invalidación del Dashboard desde VisionScan | Pendiente AsyncStorage timestamp |
| Google Auth | Falla — no investigado aún |
| Stripe / Pagos | Pendiente completo |

---

*Documento generado para uso de IA asistente — MateCare v5.2 — Mayo 2026*
*Fuentes: código fuente inspeccionado, MATECARE_TECH_SPEC.md, MATECARE_DIAGNOSTICO_v5.2.md, MATECARE_CABOS_ILOGICOS_v5.2.md*
