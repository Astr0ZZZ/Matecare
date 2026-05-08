# Deep Search Vision v2.0 — Especificación Técnica Completa

> **Sistema de visión con IA** para análisis emocional en tiempo real a partir de fotografías.  
> Stack: React Native (Expo) · Node.js/TypeScript · DeepFace (VPS) · Prisma · Redis · PostgreSQL

---

## Tabla de contenidos

1. [Arquitectura general](#1-arquitectura-general)
2. [Capa 1 — El Ojo (Mobile)](#2-capa-1--el-ojo-mobile)
3. [Capa 2 — El Cerebro (Backend)](#3-capa-2--el-cerebro-backend)
4. [Capa 3 — La Inteligencia (AI Engine)](#4-capa-3--la-inteligencia-ai-engine)
5. [Flujo de datos end-to-end](#5-flujo-de-datos-end-to-end)
6. [Pipeline de IA para reconocimiento de foto](#6-pipeline-de-ia-para-reconocimiento-de-foto)
7. [Contratos de datos](#7-contratos-de-datos)
8. [Errores críticos y cómo evitarlos](#8-errores-críticos-y-cómo-evitarlos)
9. [Checklist de implementación](#9-checklist-de-implementación)

---

## 1. Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Mobile)                     │
│   ImagePicker → ImageManipulator → Base64 → apiFetch   │
└────────────────────────┬────────────────────────────────┘
                         │ POST /calibrate-profile
                         │ { imageBase64, userId }
┌────────────────────────▼────────────────────────────────┐
│                   BACKEND (Node.js)                     │
│   vision.controller → visionAnalysis.service            │
│   AbortController (15s) → fetch al VPS                 │
└────────────────────────┬────────────────────────────────┘
                         │ POST /analyze { image }
┌────────────────────────▼────────────────────────────────┐
│              VPS — DeepFace Engine                      │
│   Detecta: edad · género · emoción · raza · pose        │
│   Devuelve: JSON con atributos + confianzas             │
└────────────────────────┬────────────────────────────────┘
                         │ { emotion, age, gender, ... }
┌────────────────────────▼────────────────────────────────┐
│              PERSISTENCE (PostgreSQL + Prisma)          │
│   upsert en tabla User.preferences (JsonB)              │
│   merge: { ...currentPrefs, ...inferredTraits }         │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              AI ENGINE (Insight Cache)                  │
│   Redis key: [Fase + Emoción + MBTI]                   │
│   Hit → ms  |  Miss → LLM → cachea resultado           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Capa 1 — El Ojo (Mobile)

### Dependencias requeridas

```bash
npx expo install expo-image-picker
npx expo install expo-image-manipulator
npx expo install expo-file-system
```

### 2.1 `handleCapture(source, mode)`

**Propósito:** orquestador de la captura. Dispara todo el pipeline de visión.

```typescript
import * as ImagePicker from 'expo-image-picker';

async function handleCapture(source: 'camera' | 'library', mode: 'calibrate' | 'analyze') {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.6,          // ← Balanceo crítico: nitidez vs. peso de red
  });

  if (!result.canceled && result.assets[0]) {
    const optimizedUri = await optimizeImage(result.assets[0].uri);
    await calibrateProfile(optimizedUri);
  }
}
```

> **Por qué `quality: 0.6`** — valores más altos (0.8–1.0) generan archivos de 4–8MB que provocan `413 Request Entity Too Large` en el servidor. Con `0.6` la imagen resultante post-resize queda en ~200KB, suficiente para que DeepFace detecte rasgos faciales con precisión.

---

### 2.2 `optimizeImage(uri)` — ImageManipulator

**Propósito:** reducir el peso antes del transporte sin perder los rasgos faciales necesarios para DeepFace.

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

async function optimizeImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1000 } }],   // ← 1000px es el sweet spot para DeepFace
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri;
}
```

> **Por qué 1000px exactamente** — DeepFace requiere mínimo ~200px de rostro para detección confiable. Una imagen de 1000px garantiza ese mínimo incluso si el rostro ocupa solo el 20% del encuadre. Valores menores (600–700px) degradan la precisión de atributos como `emotion` y `age`.

---

### 2.3 `calibrateProfile(imageUri)` — FileSystem + Base64

**Propósito:** convertir la imagen local a Base64 para transporte JSON.

```typescript
import * as FileSystem from 'expo-file-system/legacy';  // ← /legacy obligatorio en SDK 54

async function calibrateProfile(imageUri: string): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await apiFetch('/vision/calibrate-profile', {
    method: 'POST',
    body: JSON.stringify({
      imageBase64: base64,
      userId: currentUser.id,
    }),
  });
}
```

> **Por qué `/legacy`** — en SDK 54, `expo-file-system` migró su API principal a un sistema de módulos nuevo. Usar el import sin `/legacy` lanza deprecation warnings que en versiones futuras se convertirán en errores de runtime. El path `/legacy` mantiene la API estable mientras Expo completa la transición.

---

## 3. Capa 2 — El Cerebro (Backend)

### Archivos involucrados

```
src/
├── controllers/
│   └── vision.controller.ts       ← Maneja la ruta POST /calibrate-profile
└── services/
    └── visionAnalysis.service.ts  ← Orquesta la llamada al VPS de DeepFace
```

### 3.1 `handleProfileCalibration` — vision.controller.ts

**Propósito:** recibir la imagen, analizarla y persistir los rasgos detectados sin perder datos previos.

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function handleProfileCalibration(req: Request, res: Response) {
  const { imageBase64, userId } = req.body;

  // 1. Analizar con DeepFace (ver sección 3.2)
  const inferredTraits = await analyzePartnerPhoto(imageBase64);

  // 2. Leer preferencias actuales
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  const currentPrefs = (current?.preferences as Record<string, unknown>) ?? {};

  // 3. Merge — preserva datos del Quiz, sobreescribe solo lo nuevo
  const mergedPrefs = {
    ...currentPrefs,         // ← datos anteriores (Quiz, historial)
    ...inferredTraits,       // ← rasgos detectados en esta sesión
    lastCalibratedAt: new Date().toISOString(),
  };

  // 4. Upsert atómico
  await prisma.user.upsert({
    where: { id: userId },
    update: { preferences: mergedPrefs },
    create: { id: userId, preferences: mergedPrefs },
  });

  res.json({ success: true, traits: inferredTraits });
}
```

> **Por qué spread en el merge** — si se sobrescribiera `preferences` directamente con `inferredTraits`, se perderían todos los datos del Quiz de compatibilidad. El spread garantiza que solo se actualicen los campos nuevos detectados por visión, preservando el resto.

---

### 3.2 `analyzePartnerPhoto` — visionAnalysis.service.ts

**Propósito:** llamar al VPS de DeepFace con timeout controlado.

```typescript
async function analyzePartnerPhoto(imageBase64: string): Promise<VisionTraits> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15 segundos

  try {
    const response = await fetch(`${process.env.VPS_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DeepFace error: ${response.status}`);
    }

    const data = await response.json();
    return parseDeepFaceResponse(data);

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Vision timeout: DeepFace no respondió en 15s');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

> **Por qué 15 segundos** — DeepFace en frío (sin GPU dedicada) puede tardar 8–12s en el primer análisis. El timeout de 15s da margen suficiente sin que el usuario experimente una pantalla de carga indefinida. En producción con GPU, este valor puede reducirse a 5–8s.

---

## 4. Capa 3 — La Inteligencia (AI Engine)

### Archivos involucrados

```
src/
└── services/
    ├── insightCache.service.ts    ← Cache de dos niveles: Memory + Redis
    └── prompt.service.ts          ← buildMasterPrompt con VisionContext
```

### 4.1 `getInsight` — insightCache.service.ts

**Propósito:** entregar recomendaciones de IA en milisegundos usando cache de dos niveles.

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
const memoryCache = new Map<string, string>();

async function getInsight(params: InsightParams): Promise<string> {
  const { phase, emotion, mbtiType } = params;
  const cacheKey = `insight:${phase}:${emotion}:${mbtiType}`;

  // Nivel 1 — Memory cache (sub-millisecond)
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Nivel 2 — Redis (< 5ms)
  const cached = await redis.get(cacheKey);
  if (cached) {
    memoryCache.set(cacheKey, cached); // Sube a memory para próxima vez
    return cached;
  }

  // Miss — generar con IA
  const prompt = buildMasterPrompt(params);
  const insight = await callLLM(prompt);

  // Cachear en ambos niveles
  await redis.setex(cacheKey, 86_400, insight); // TTL: 24h
  memoryCache.set(cacheKey, insight);

  return insight;
}
```

> **Por qué cache de dos niveles** — Redis agrega ~2–5ms de latencia de red. Para combinaciones [Fase+Emoción+MBTI] populares que se repiten miles de veces, el memory cache elimina esa latencia completamente. El TTL de 24h balancea frescura con costo de tokens de IA.

---

### 4.2 `buildMasterPrompt` — prompt.service.ts

**Propósito:** construir el prompt que hace que la IA priorice la foto sobre el historial de chat.

```typescript
interface VisionContext {
  dominantEmotion: string;       // "happy" | "sad" | "angry" | "neutral" | ...
  emotionConfidence: number;     // 0–100
  estimatedAge: number;
  gender: string;
  facialActionUnits?: string[];  // AU específicas si DeepFace las devuelve
}

function buildMasterPrompt(params: InsightParams): string {
  const { phase, mbtiType, visionContext, chatHistory } = params;

  return `
## CONTEXTO DE VISIÓN — VERDAD ABSOLUTA (prioridad máxima)
En este momento, la pareja muestra visualmente:
- Emoción dominante: ${visionContext.dominantEmotion} (${visionContext.emotionConfidence}% confianza)
- Edad estimada: ${visionContext.estimatedAge} años
- Señales faciales adicionales: ${visionContext.facialActionUnits?.join(', ') ?? 'no disponibles'}

**INSTRUCCIÓN CRÍTICA:** La emoción detectada visualmente SUPERA cualquier contradicción en el historial de chat. Si la persona dice "estoy bien" pero la foto muestra tristeza, responde según la foto.

## PERFIL PSICOLÓGICO
- Tipo MBTI: ${mbtiType}
- Fase de relación actual: ${phase}

## HISTORIAL DE CHAT (contexto secundario)
${chatHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

## TAREA
Genera una recomendación empática y accionable para este momento emocional específico.
Máximo 3 oraciones. Tono cálido, no clínico.
  `.trim();
}
```

---

## 5. Flujo de datos end-to-end

```
Usuario toma foto
       │
       ▼
[1] ImagePicker (quality: 0.6)
       │ uri local
       ▼
[2] ImageManipulator → resize 1000px → compress 0.7
       │ uri optimizado (~200KB)
       ▼
[3] FileSystem.readAsStringAsync → Base64 string
       │
       ▼
[4] apiFetch POST /vision/calibrate-profile
       │ { imageBase64, userId }
       ▼
[5] vision.controller → analyzePartnerPhoto
       │ fetch con AbortController 15s
       ▼
[6] VPS DeepFace → análisis facial
       │ { emotion, age, gender, race, dominant_emotion }
       ▼
[7] parseDeepFaceResponse → VisionTraits normalizado
       │
       ▼
[8] Prisma upsert → { ...currentPrefs, ...inferredTraits }
       │ PostgreSQL JsonB
       ▼
[9] insightCache.getInsight([Fase + Emoción + MBTI])
       │ Redis hit → ms | Miss → LLM → cachea
       ▼
[10] Dashboard detecta nueva calibración → refresca HUD
```

---

## 6. Pipeline de IA para reconocimiento de foto

Esta es la sección más crítica: **qué hace exactamente la IA cuando recibe una foto**.

### 6.1 Qué detecta DeepFace

DeepFace analiza la imagen y devuelve un JSON con los siguientes atributos:

| Atributo | Tipo | Ejemplo | Uso en MateCare |
|---|---|---|---|
| `dominant_emotion` | `string` | `"happy"` | Clave de cache + prompt |
| `emotion` | `object` | `{ happy: 98.2, sad: 0.3, ... }` | Confianza por emoción |
| `age` | `number` | `28` | Contexto del perfil |
| `gender` | `object` | `{ Woman: 92.1, Man: 7.9 }` | Contexto del perfil |
| `race` | `object` | `{ asian: 45.2, ... }` | No se usa en MateCare |
| `region` | `object` | `{ x, y, w, h }` | Verificar que hay rostro |

### 6.2 `parseDeepFaceResponse` — normalización

```typescript
interface VisionTraits {
  dominantEmotion: string;
  emotionConfidence: number;
  estimatedAge: number;
  gender: 'male' | 'female' | 'unknown';
  rawEmotions: Record<string, number>;
  faceDetected: boolean;
  analyzedAt: string;
}

function parseDeepFaceResponse(raw: DeepFaceResponse): VisionTraits {
  // DeepFace puede devolver array (múltiples rostros) o objeto (un rostro)
  const face = Array.isArray(raw) ? raw[0] : raw;

  if (!face || !face.region) {
    return { faceDetected: false, dominantEmotion: 'neutral', ... };
  }

  const dominant = face.dominant_emotion;
  const confidence = face.emotion?.[dominant] ?? 0;

  return {
    dominantEmotion: dominant,
    emotionConfidence: Math.round(confidence),
    estimatedAge: Math.round(face.age ?? 0),
    gender: parseGender(face.gender),
    rawEmotions: face.emotion ?? {},
    faceDetected: true,
    analyzedAt: new Date().toISOString(),
  };
}

function parseGender(genderObj: Record<string, number>): 'male' | 'female' | 'unknown' {
  if (!genderObj) return 'unknown';
  return genderObj['Woman'] > genderObj['Man'] ? 'female' : 'male';
}
```

### 6.3 Configuración del servidor DeepFace (VPS)

```python
# main.py — servidor FastAPI en el VPS
from deepface import DeepFace
from fastapi import FastAPI
import base64, cv2, numpy as np

app = FastAPI()

@app.post("/analyze")
async def analyze(body: dict):
    # Decodificar Base64
    img_bytes = base64.b64decode(body["image"])
    img_array = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    # Analizar — enforce_detection=False evita error si no hay rostro claro
    result = DeepFace.analyze(
        img_path=img,
        actions=['emotion', 'age', 'gender'],  # race es opcional, lento
        enforce_detection=False,
        detector_backend='retinaface',           # más preciso que opencv
        silent=True,
    )

    return result
```

> **Por qué `retinaface`** — es el backend de detección más preciso de DeepFace para rostros parcialmente iluminados o en ángulo, que es el caso real de fotos tomadas en contexto cotidiano. `opencv` falla frecuentemente con perfiles de 45°.

### 6.4 Emociones que reconoce DeepFace

```
angry    → enojo, frustración
disgust  → asco, rechazo
fear     → miedo, ansiedad
happy    → alegría, satisfacción
sad      → tristeza, melancolía
surprise → sorpresa
neutral  → estado basal, sin expresión marcada
```

**Cómo mapearlas a contexto de relación de pareja:**

```typescript
const EMOTION_TO_CONTEXT: Record<string, string> = {
  happy:    'momento de conexión — capitalizar con actividad compartida',
  sad:      'necesita contención emocional — priorizar escucha activa',
  angry:    'estado de activación — evitar confrontación directa',
  fear:     'ansiedad presente — ofrecer seguridad y previsibilidad',
  disgust:  'señal de desconexión — revisar dinámica reciente',
  surprise: 'apertura emocional — buen momento para conversación importante',
  neutral:  'estado basal — válido para cualquier tipo de interacción',
};
```

---

## 7. Contratos de datos

### Request — POST /vision/calibrate-profile

```typescript
interface CalibrateProfileRequest {
  imageBase64: string;   // JPEG en Base64, max ~300KB después de resize
  userId: string;        // UUID del usuario autenticado
}
```

### Response — 200 OK

```typescript
interface CalibrateProfileResponse {
  success: boolean;
  traits: VisionTraits;
  insightPreview?: string;  // Primer insight de cache si ya existe
}
```

### Schema Prisma — User.preferences (JsonB)

```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  preferences Json?    // JsonB en PostgreSQL
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Estructura esperada de `preferences`:**

```json
{
  "mbtiType": "INFP",
  "loveLanguage": "words_of_affirmation",
  "relationshipPhase": "consolidation",
  "quizCompletedAt": "2025-01-15T10:30:00Z",
  
  "dominantEmotion": "happy",
  "emotionConfidence": 94,
  "estimatedAge": 27,
  "gender": "female",
  "rawEmotions": { "happy": 94.2, "neutral": 3.1, "sad": 1.8 },
  "faceDetected": true,
  "lastCalibratedAt": "2025-06-10T18:22:00Z"
}
```

---

## 8. Errores críticos y cómo evitarlos

| Error | Causa | Solución |
|---|---|---|
| `413 Request Entity Too Large` | Imagen sin resize enviada al backend | `ImageManipulator` a 1000px antes del POST |
| `AbortError` en cliente | VPS de DeepFace tardó más de 15s | Verificar estado del VPS; considerar cola async |
| Pérdida de datos del Quiz | `preferences` sobreescrito sin merge | Usar spread `{...current, ...new}` siempre |
| Deprecation warning en SDK 54 | Import de `expo-file-system` sin `/legacy` | Cambiar a `expo-file-system/legacy` |
| `face not detected` en DeepFace | `enforce_detection=True` (default) | Siempre usar `enforce_detection=False` |
| Cache key collision | Keys sin suficiente granularidad | Key = `insight:${phase}:${emotion}:${mbti}` |
| Respuesta array vs objeto de DeepFace | Múltiples rostros detectados | `Array.isArray(raw) ? raw[0] : raw` |

---

## 9. Checklist de implementación

### Mobile (React Native / Expo)

- [ ] `expo-image-picker` instalado con `npx expo install`
- [ ] `expo-image-manipulator` instalado
- [ ] Import de FileSystem usa `/legacy`: `expo-file-system/legacy`
- [ ] `quality: 0.6` en ImagePicker
- [ ] Resize a exactamente `1000px` de ancho en ImageManipulator
- [ ] Base64 generado antes del fetch
- [ ] Manejo de `result.canceled` antes de procesar la imagen

### Backend (Node.js / TypeScript)

- [ ] `AbortController` con timeout de 15s en fetch al VPS
- [ ] `clearTimeout` en bloque `finally` para evitar memory leaks
- [ ] `findUnique` antes del `upsert` para leer preferencias actuales
- [ ] Spread merge: `{ ...currentPrefs, ...inferredTraits }`
- [ ] `lastCalibratedAt` agregado al merge con ISO timestamp
- [ ] Variables de entorno: `VPS_URL`, `REDIS_URL`, `DATABASE_URL`

### VPS DeepFace

- [ ] FastAPI o Flask corriendo en el VPS
- [ ] `enforce_detection=False` en `DeepFace.analyze`
- [ ] `detector_backend='retinaface'` para mayor precisión
- [ ] `actions=['emotion', 'age', 'gender']` — no incluir `race` si no se usa
- [ ] Endpoint `/analyze` acepta `{ image: string }` en body JSON
- [ ] CORS configurado para aceptar peticiones desde el backend

### AI Engine

- [ ] Redis corriendo y `REDIS_URL` configurada
- [ ] Cache key sigue formato `insight:${phase}:${emotion}:${mbti}`
- [ ] TTL de Redis: `86400` (24 horas)
- [ ] Memory cache (`Map`) inicializado al arrancar el servicio
- [ ] `buildMasterPrompt` incluye `VisionContext` con instrucción de prioridad
- [ ] `parseDeepFaceResponse` maneja tanto array como objeto como respuesta
- [ ] Mapping de emociones a contexto de relación implementado

---

*Estado: ✅ Especificación técnica completa — Deep Search Vision v2.0*
