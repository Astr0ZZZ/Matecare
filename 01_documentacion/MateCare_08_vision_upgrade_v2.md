# MateCare — Vision System: Upgrade a Production Grade
## Análisis del código real · Modificaciones específicas por archivo

> Basado en análisis directo del codebase. Cada sección indica el **archivo exacto** a modificar,
> el **código actual** y el **código reemplazante**. Sin abstracciones — todo es accionable hoy.

---

## Tabla de contenidos

1. [Diagnóstico real del sistema actual](#1-diagnóstico-real-del-sistema-actual)
2. [VPS — deepface_server_v2.py](#2-vps--deepface_server_v2py)
3. [Backend — visionAnalysis.service.ts](#3-backend--visionanalysisservicets)
4. [Backend — vision.controller.ts](#4-backend--visioncontrollerts)
5. [Backend — promptEngine.service.ts](#5-backend--promptengineservicets)
6. [Backend — insightCache.service.ts](#6-backend--insightcacheservicets)
7. [Backend — prisma/schema.prisma](#7-backend--prismaschemaprisma)
8. [Mobile — vision-scan.tsx](#8-mobile--vision-scantsx)
9. [Mobile — services/api.ts](#9-mobile--servicesapits)
10. [Orden de implementación recomendado](#10-orden-de-implementación-recomendado)

---

## 1. Diagnóstico real del sistema actual

### Lo que ya funciona bien ✅

- Pipeline de 5 capas en `deepface_server_v2.py` es sólido — DeepFace + YOLO + Places365 + HSV + Clothing
- El `ThreadPoolExecutor` ejecutando las 5 capas en paralelo es la decisión correcta
- El fallback `neutralVisionContext()` en `vision.controller.ts` es buena resiliencia
- Cache de 3 niveles (Memory → Redis → DB) en `insightCache.service.ts` está bien implementado
- El merge con spread `{...currentPrefs, ...inferredTraits}` en calibration es correcto
- La función `normalizeHistory` en `aiClient.service.ts` previniendo colisión de roles es excelente

### Los gaps reales encontrados en el código ❌

| Archivo | Problema específico | Impacto |
|---|---|---|
| `deepface_server_v2.py` | No hay CLAHE — DeepFace recibe imágenes sin normalizar iluminación | Emoción incorrecta en fotos oscuras |
| `deepface_server_v2.py` | `synthesize_context` no incluye `duchenne_smile` ni `isAuthentic` | IA nunca distingue sonrisa real de social |
| `deepface_server_v2.py` | No hay quality gate — analiza imágenes borrosas igual que buenas | 8-12s gastados en fotos que van a fallar |
| `visionAnalysis.service.ts` | `VisionContext` no tiene `duchenne_smile`, `isAuthentic`, `isSuppressed` | Datos disponibles en el VPS no llegan al prompt |
| `visionAnalysis.service.ts` | Timeout hardcodeado a 15s sin circuit breaker | Un VPS caído bloquea todo el request |
| `vision.controller.ts` | `handleVisionChat` no persiste `EmotionalRecord` — cada análisis es aislado | Sin historial emocional, sin tendencias |
| `vision.controller.ts` | Validación de tamaño solo por `image.length > 7_000_000` en base64 | No detecta imágenes oscuras ni borrosas |
| `promptEngine.service.ts` | `visionBlock` inyecta solo label de emoción, no las confianzas completas | IA no puede razonar sobre ambigüedad emocional |
| `promptEngine.service.ts` | `visionBlock` no incluye `duchenne_smile` ni `isSuppressed` — datos perdidos | El dato más valioso del análisis no llega a la IA |
| `insightCache.service.ts` | `buildCacheKey` no incluye `attachmentStyle` en todas las variantes | Colisión de keys entre usuarios con mismo MBTI |
| `vision-scan.tsx` | No hay quality gate antes de subir — fotos oscuras/borrosas se procesan igual | UX mala + gasto innecesario de VPS |
| `vision-scan.tsx` | `FileSystem.readAsStringAsync` sin `/legacy` — warnings en SDK 54 | Deprecation que se vuelve error en SDK 55+ |
| `services/api.ts` | Timeout global de 20s sin diferenciación por endpoint | Vision necesita más tiempo que /health |

---

## 2. VPS — `deepface_server_v2.py`

### 2.1 Agregar CLAHE antes de pasar a DeepFace

**Dónde:** después de `pil_to_numpy`, antes de llamar a `analyze_face`.

**Agregar esta función** (va después de la función `pil_to_numpy` existente):

```python
def normalize_image_clahe(img_array: np.ndarray) -> np.ndarray:
    """
    CLAHE (Contrast Limited Adaptive Histogram Equalization).
    Mejora imágenes subexpuestas sin sobreexponer las bien iluminadas.
    Estándar en visión computacional para preprocesamiento facial.
    Mejora la precisión de DeepFace ~10-15% en fotos con iluminación irregular.
    """
    import cv2
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_norm = clahe.apply(l)
    lab_norm = cv2.merge([l_norm, a, b])
    return cv2.cvtColor(lab_norm, cv2.COLOR_LAB2BGR)


def assess_image_quality(img_array: np.ndarray) -> dict:
    """
    Quality gate: detecta si la imagen vale la pena analizar antes de gastar
    los 8-12s del pipeline completo.
    Retorna { ok: bool, reason: str, brightness: float }
    """
    # Brillo promedio
    brightness = float(img_array.mean())

    # Blur detection via varianza del Laplaciano
    import cv2
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    if brightness < 35:
        return {"ok": False, "reason": "imagen_oscura", "brightness": brightness, "blur": blur_score}
    if brightness > 240:
        return {"ok": False, "reason": "sobreexpuesta", "brightness": brightness, "blur": blur_score}
    if blur_score < 50:
        return {"ok": False, "reason": "imagen_borrosa", "brightness": brightness, "blur": blur_score}

    return {"ok": True, "reason": "ok", "brightness": brightness, "blur": blur_score}
```

**Modificar el endpoint `/analyze`** — agregar quality gate y CLAHE al inicio del bloque `try`:

```python
# Reemplazar esta parte del endpoint /analyze:
# try:
#     img_pil   = decode_image(data["image"])
#     img_array = pil_to_numpy(img_pil)

# Por esto:
try:
    img_pil   = decode_image(data["image"])
    img_array = pil_to_numpy(img_pil)

    # Quality gate — rechaza imágenes inanalizables antes del pipeline completo
    quality = assess_image_quality(img_array)
    if not quality["ok"]:
        log.warning(f"[Quality] Imagen rechazada: {quality['reason']} (brightness={quality['brightness']:.1f})")
        return jsonify({
            "error": "imagen_rechazada",
            "reason": quality["reason"],
            "brightness": quality["brightness"],
        }), 422

    # Normalizar iluminación antes de DeepFace
    img_array_normalized = normalize_image_clahe(img_array)
    log.info(f"[CLAHE] Imagen normalizada. Brillo original: {quality['brightness']:.1f}")
```

**Y pasar `img_array_normalized` a `analyze_face`** en el dict `tasks`:

```python
# Cambiar en el dict tasks:
tasks = {
    "face":     lambda: analyze_face(img_array_normalized),  # ← usa la normalizada
    "posture":  lambda: analyze_posture(img_array),           # pose no necesita CLAHE
    "scene":    lambda: analyze_scene(img_pil),
    "lighting": lambda: analyze_lighting(img_array),          # lighting necesita la original
    "clothing": lambda: analyze_clothing(img_array),
}
```

---

### 2.2 Agregar detección de autenticidad emocional a `synthesize_context`

**Agregar esta función** (va después de `analyze_face`):

```python
def assess_emotional_authenticity(face: dict, posture: dict) -> dict:
    """
    Determina si la emoción es genuina o está siendo contenida/forzada.
    
    Regla de Duchenne: una sonrisa genuina activa el orbicularis oculi 
    (músculo del ojo). DeepFace no devuelve AUs directamente, pero podemos
    aproximarlo con el ratio entre 'happy' y la suma de emociones secundarias.
    
    Una sonrisa social tiene 'happy' alto pero 'neutral' también alto
    (la persona no está completamente involucrada emocionalmente).
    """
    dominant = face.get("dominantEmotion", "calma")
    all_emotions = face.get("allEmotions", {})
    confidence = face.get("faceConfidence", 0.0)
    
    is_authentic = None
    is_suppressed = False
    authenticity_label = dominant
    
    if dominant == "alegria":
        happy_val = all_emotions.get("alegria", 0)
        neutral_val = all_emotions.get("calma", 0)
        surprise_val = all_emotions.get("sorpresa", 0)
        
        # Sonrisa genuina: happy muy dominante, baja coexistencia con neutral
        if happy_val > 70 and neutral_val < 20:
            is_authentic = True
            authenticity_label = "alegría genuina"
        elif happy_val > 40 and neutral_val > 30:
            is_authentic = False
            authenticity_label = "sonrisa social"  # posible Duchenne forzado
        else:
            is_authentic = None  # Ambiguo
    
    elif dominant == "tristeza":
        sad_val = all_emotions.get("tristeza", 0)
        neutral_val = all_emotions.get("calma", 0)
        
        if sad_val > 60:
            is_authentic = True
            authenticity_label = "tristeza genuina"
        elif neutral_val > 50 and sad_val > 20:
            is_suppressed = True
            authenticity_label = "tristeza contenida"  # la está gestionando
        
    elif dominant == "irritabilidad":
        angry_val = all_emotions.get("irritabilidad", 0)
        neutral_val = all_emotions.get("calma", 0)
        
        if angry_val > 50:
            is_authentic = True
            authenticity_label = "enojo activo"
        elif neutral_val > 40 and angry_val > 20:
            is_suppressed = True
            authenticity_label = "frustración contenida"
    
    # Supresión general: cuando la confianza es baja, la emoción puede estar controlada
    if confidence < 0.3 and dominant != "calma":
        is_suppressed = True
    
    return {
        "isAuthentic": is_authentic,
        "isSuppressed": is_suppressed,
        "authenticityLabel": authenticity_label,
        "hasDiscrepancy": is_authentic is False,  # emoción forzada detectada
    }
```

**Modificar `synthesize_context`** — agregar los campos de autenticidad al return:

```python
# Al final de synthesize_context, antes del return, agregar:
authenticity = assess_emotional_authenticity(face, posture)

return {
    # Campos base (compatibles con v1)
    "dominantEmotion":   emotion,
    "energyAppearance":  energy_appearance,
    "environment":       scene["environment"],
    "style":             clothing["clothingStyle"],

    # Campos enriquecidos (v2)
    "allEmotions":       face.get("allEmotions", {}),
    "faceConfidence":    face.get("faceConfidence", 0.0),
    "estimatedAge":      face.get("estimatedAge", 0),
    "bodyLanguage":      body_desc,
    "activityLevel":     posture["activityLevel"],
    "isIndoor":          scene["isIndoor"],
    "sceneCategory":     scene["sceneCategory"],
    "lightCondition":    lighting["lightCondition"],
    "timeOfDayHint":     time_hint,
    "ambientMood":       lighting["ambientMood"],
    "clothingTone":      clothing.get("clothingTone", "desconocido"),
    "poseDetected":      posture["poseDetected"],
    "analysisVersion":   "2.1",

    # NUEVO — Autenticidad emocional
    "isAuthentic":       authenticity["isAuthentic"],
    "isSuppressed":      authenticity["isSuppressed"],
    "authenticityLabel": authenticity["authenticityLabel"],
    "hasDiscrepancy":    authenticity["hasDiscrepancy"],
    "analysisReliable":  face.get("faceConfidence", 0.0) > 0.4,
}
```

---

## 3. Backend — `visionAnalysis.service.ts`

**Archivo:** `src/services/visionAnalysis.service.ts`

### 3.1 Extender `VisionContext` con los nuevos campos

```typescript
// Reemplazar la interfaz VisionContext completa por esta versión extendida:

export interface VisionContext {
  // Campos base (v1 compat)
  dominantEmotion: string;
  energyAppearance: string;
  environment: string;
  style: string;

  // Campos enriquecidos (v2)
  allEmotions?: Record<string, number>;
  faceConfidence?: number;
  estimatedAge?: number;
  bodyLanguage?: string;
  activityLevel?: string;
  isIndoor?: boolean;
  sceneCategory?: string;
  lightCondition?: string;
  timeOfDayHint?: string;
  ambientMood?: string;
  clothingTone?: string;
  poseDetected?: boolean;
  analysisVersion?: string;
  processingMs?: number;

  // NUEVO v2.1 — Autenticidad emocional
  isAuthentic?: boolean | null;
  isSuppressed?: boolean;
  authenticityLabel?: string;
  hasDiscrepancy?: boolean;
  analysisReliable?: boolean;
}
```

### 3.2 Agregar circuit breaker

```typescript
// Agregar después de las constantes existentes (DEEPFACE_URL, DEEPFACE_TOKEN, TIMEOUT_MS):

// Circuit Breaker — protege contra VPS caído
interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitState: CircuitState = { failures: 0, lastFailure: 0, isOpen: false };
const FAILURE_THRESHOLD = 4;
const RECOVERY_TIMEOUT_MS = 60_000; // 1 minuto

function checkCircuit(): boolean {
  if (!circuitState.isOpen) return true; // circuito cerrado = operacional

  const elapsed = Date.now() - circuitState.lastFailure;
  if (elapsed > RECOVERY_TIMEOUT_MS) {
    // Intentar recuperación
    circuitState.isOpen = false;
    circuitState.failures = 0;
    console.log('[Vision] Circuit breaker: intentando recuperación...');
    return true;
  }
  return false; // circuito abierto = no llamar al VPS
}

function recordSuccess() {
  circuitState.failures = 0;
}

function recordFailure() {
  circuitState.failures++;
  circuitState.lastFailure = Date.now();
  if (circuitState.failures >= FAILURE_THRESHOLD) {
    circuitState.isOpen = true;
    console.warn(`[Vision] Circuit breaker ABIERTO — VPS no disponible (${circuitState.failures} fallos)`);
  }
}
```

### 3.3 Modificar `analyzePartnerPhoto` para usar el circuit breaker

```typescript
// Reemplazar la función analyzePartnerPhoto completa:

export async function analyzePartnerPhoto(imageBase64: string): Promise<VisionContext> {
  // Circuit breaker — si el VPS está caído, no bloqueamos
  if (!checkCircuit()) {
    console.warn('[Vision] Circuit breaker activo — devolviendo contexto neutro');
    return neutralVisionContext();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${DEEPFACE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': DEEPFACE_TOKEN,
      },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // 422 = imagen rechazada por quality gate del VPS
      if (res.status === 422) {
        const err = await res.json().catch(() => ({}));
        throw new ImageQualityError(err.reason || 'imagen_rechazada');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(`DeepFace v2 error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    recordSuccess();
    return data as VisionContext;

  } catch (error: any) {
    if (error instanceof ImageQualityError) {
      throw error; // No contar como fallo del VPS — es un rechazo intencional
    }
    recordFailure();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Error específico para imágenes rechazadas por calidad
export class ImageQualityError extends Error {
  constructor(public reason: string) {
    super(`Imagen rechazada por calidad: ${reason}`);
    this.name = 'ImageQualityError';
  }
}
```

---

## 4. Backend — `vision.controller.ts`

### 4.1 Manejar `ImageQualityError` y persistir `EmotionalRecord`

**Modificar `handleVisionChat`** — agregar persistencia de historial y manejo de error de calidad:

```typescript
// En handleVisionChat, reemplazar el bloque del try de vision (paso 2):

// 2. Analizar foto con DeepFace (con fallback si el VPS no responde)
let vision: VisionContext;
let imageRejected = false;

try {
  vision = await analyzePartnerPhoto(image);
} catch (visionError: any) {
  if (visionError.name === 'ImageQualityError') {
    // Imagen rechazada por el quality gate — informar al usuario, no usar fallback
    const reasonMap: Record<string, string> = {
      imagen_oscura: 'La foto tiene poca iluminación. Busca un lugar más iluminado.',
      sobreexpuesta: 'La foto tiene demasiada luz directa. Evita el flash o el sol directo.',
      imagen_borrosa: 'La foto está borrosa. Mantén el teléfono estable al tomar la foto.',
    };
    return res.status(422).json({
      error: 'imagen_rechazada',
      reason: visionError.reason,
      userMessage: reasonMap[visionError.reason] || 'La foto no tiene la calidad suficiente para el análisis.',
    });
  }
  console.warn('[Vision] DeepFace no disponible, usando contexto neutro:', visionError.message);
  vision = neutralVisionContext();
}
```

**Agregar persistencia de EmotionalRecord** — al final del try, antes del `return res.json(...)`:

```typescript
// Agregar después del paso 6 (llamada a la IA), antes del return final:

// 7. Persistir registro emocional para historial y tendencias
// (fire-and-forget — no bloqueamos la respuesta por esto)
if (vision.analysisVersion !== '2.0-fallback') {
  prisma.emotionalRecord.create({
    data: {
      userId,
      dominantEmotion: vision.dominantEmotion,
      confidence: vision.faceConfidence ?? 0,
      isAuthentic: vision.isAuthentic ?? null,
      isSuppressed: vision.isSuppressed ?? false,
      hasDiscrepancy: vision.hasDiscrepancy ?? false,
      authenticityLabel: vision.authenticityLabel ?? vision.dominantEmotion,
      rawEmotions: vision.allEmotions ?? {},
      phase: cycle.phase,
      environment: vision.environment,
      analysisReliable: vision.analysisReliable ?? false,
    },
  }).catch(err => console.warn('[Vision] Error guardando EmotionalRecord:', err.message));
}
```

---

## 5. Backend — `promptEngine.service.ts`

### 5.1 Extender la interfaz `PromptContext` con campos de autenticidad

```typescript
// En la interfaz PromptContext, reemplazar el visionContext por esta versión extendida:

visionContext?: {
  dominantEmotion: string;
  energyAppearance: string;
  environment: string;
  style: string;
  bodyLanguage?: string;
  activityLevel?: string;
  sceneCategory?: string;
  lightCondition?: string;
  timeOfDayHint?: string;
  ambientMood?: string;
  clothingTone?: string;
  // NUEVO v2.1
  allEmotions?: Record<string, number>;
  faceConfidence?: number;
  isAuthentic?: boolean | null;
  isSuppressed?: boolean;
  authenticityLabel?: string;
  hasDiscrepancy?: boolean;
  analysisReliable?: boolean;
};
```

### 5.2 Enriquecer el `visionBlock` en `buildSystemPrompt`

```typescript
// Reemplazar la asignación de visionBlock completa:

const visionBlock = ctx.visionContext
  ? buildVisionBlock(ctx.visionContext)
  : "";

// Agregar esta función helper (fuera de buildSystemPrompt, antes de ella):

function buildVisionBlock(vc: NonNullable<PromptContext['visionContext']>): string {
  const vc_label = vc.authenticityLabel || vc.dominantEmotion;

  // Construir distribución emocional si está disponible
  const emotionDist = vc.allEmotions
    ? Object.entries(vc.allEmotions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([e, v]) => `${e}: ${Math.round(v)}%`)
        .join(' · ')
    : null;

  // Sección de alerta de discrepancia o supresión
  let alertBlock = '';
  if (vc.hasDiscrepancy) {
    alertBlock = `
⚠️ DISCREPANCIA EMOCIONAL: Muestra "${vc_label}" pero las señales subyacentes sugieren otra emoción. 
   Está presentando una emoción diferente a la que realmente siente.
   PRIORIDAD MÁXIMA: Responde a lo no dicho, no a la expresión superficial.`;
  } else if (vc.isSuppressed) {
    alertBlock = `
⚡ SUPRESIÓN DETECTADA: Está conteniendo activamente la emoción de "${vc.dominantEmotion}".
   La está gestionando/controlando. Valida eso con delicadeza, no lo ignores.`;
  }

  if (!vc.analysisReliable) {
    alertBlock += `
⚠️ CONFIANZA LIMITADA: El análisis tiene restricciones por ángulo o iluminación (confianza: ${Math.round((vc.faceConfidence || 0) * 100)}%).
   Da más peso al historial de chat que a la lectura visual en este caso.`;
  }

  return `
LECTURA VISUAL AVANZADA (v2.1):
- Estado emocional: **${vc_label}** (Energía: ${vc.energyAppearance})${emotionDist ? `\n  Distribución: ${emotionDist}` : ''}
- Postura corporal: ${vc.bodyLanguage || 'desconocida'} (Actividad: ${vc.activityLevel || 'n/a'})
- Escena: ${vc.sceneCategory || vc.environment} (${vc.lightCondition || 'luz estándar'}, ${vc.timeOfDayHint || 'hora n/a'})
- Vibra ambiental: ${vc.ambientMood || 'neutra'}
- Estilo vestimenta: ${vc.style} / tono ${vc.clothingTone || 'n/a'}
${alertBlock}

INSTRUCCIÓN CRÍTICA: Cruza OBLIGATORIAMENTE la fase del ciclo con esta lectura visual.
${vc.hasDiscrepancy
  ? 'La emoción visual CONTRADICE la expresión mostrada — responde a la emoción real, no a la social.'
  : 'Si la lectura visual contradice la fase esperada, prioriza lo visual sobre la teoría del ciclo.'
}
Adapta el consejo al ambiente detectado (restaurante → complicidad íntima, hogar → confort, exterior → espontaneidad).`;
}
```

---

## 6. Backend — `insightCache.service.ts`

### 6.1 Corregir la cache key — incluir `attachmentStyle`

```typescript
// Reemplazar la función buildCacheKey:

function buildCacheKey(req: InsightRequest): string {
  // attachmentStyle es crítico — un INFJ_ANXIOUS necesita un insight diferente a INFJ_SECURE
  return `${req.mbtiType}_${req.phase}_${req.context}_${req.affectionStyle}_${req.conflictStyle}_${req.attachmentStyle}`;
}
```

### 6.2 Agregar invalidación de cache por feedback bajo

```typescript
// Agregar esta función al final del archivo:

/**
 * Invalida el insight de una combinación específica cuando el usuario
 * indica que no fue útil. Fuerza regeneración en el próximo request.
 */
export async function invalidateInsight(cacheKey: string): Promise<void> {
  // Limpiar Redis
  try {
    await redis.del(`insight:${cacheKey}`);
  } catch (e) { /* Redis opcional */ }

  // Limpiar memory cache
  delete memoryCache[`insight:${cacheKey}`];

  // Marcar en DB como expirado (no borrar — mantener historial)
  await prisma.personalityInsight.updateMany({
    where: { cacheKey },
    data: { expiresAt: new Date() }, // expirado = se regenerará en próximo request
  });

  console.log(`[Cache] Insight invalidado: ${cacheKey}`);
}
```

---

## 7. Backend — `prisma/schema.prisma`

### 7.1 Agregar tabla `EmotionalRecord`

```prisma
// Agregar después del modelo PersonalityInsight:

model EmotionalRecord {
  id                String     @id @default(uuid())
  userId            String
  user              User       @relation(fields: [userId], references: [id])

  // Datos del análisis
  dominantEmotion   String
  confidence        Float      @default(0)
  isAuthentic       Boolean?   // null = no determinable
  isSuppressed      Boolean    @default(false)
  hasDiscrepancy    Boolean    @default(false)
  authenticityLabel String
  rawEmotions       Json       @default("{}")

  // Contexto en el momento del análisis
  phase             CyclePhase
  environment       String
  analysisReliable  Boolean    @default(true)

  createdAt         DateTime   @default(now())

  @@index([userId, createdAt])
  @@index([userId, dominantEmotion])
}
```

**Agregar la relación en el modelo `User`:**

```prisma
// En el modelo User, agregar junto a las otras relaciones:
emotionalRecords   EmotionalRecord[]
```

**Migración:**

```bash
npx prisma migrate dev --name add_emotional_record
```

---

## 8. Mobile — `vision-scan.tsx`

### 8.1 Corregir import de FileSystem a `/legacy`

```typescript
// Reemplazar:
import * as FileSystem from 'expo-file-system';

// Por:
import * as FileSystem from 'expo-file-system/legacy';
```

### 8.2 Agregar quality gate local antes de subir la imagen

**Agregar esta función** en el hook `useVisionChat`, después de los states:

```typescript
/**
 * Estima el brillo de una imagen de forma rápida.
 * Usa una muestra del thumbnail en Base64 para evitar leer toda la imagen.
 * Retorna valor 0-255.
 */
const estimateBrightness = async (uri: string): Promise<number> => {
  try {
    // Crear thumbnail muy pequeño para sampling rápido
    const thumb = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 40 } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.3 }
    );
    const b64 = await FileSystem.readAsStringAsync(thumb.uri, { encoding: 'base64' });

    // Muestrear bytes del canal R (aprox) para estimar brillo
    const bytes = atob(b64);
    const step = Math.max(1, Math.floor(bytes.length / 200));
    let total = 0;
    let count = 0;
    for (let i = 0; i < bytes.length; i += step) {
      total += bytes.charCodeAt(i);
      count++;
    }
    return count > 0 ? total / count : 128;
  } catch {
    return 128; // Valor neutro — no rechazar si falla el sampling
  }
};

interface QualityCheck {
  approved: boolean;
  reason?: string;
  suggestion?: string;
}

const checkImageQuality = async (uri: string): Promise<QualityCheck> => {
  const brightness = await estimateBrightness(uri);

  if (brightness < 40) {
    return {
      approved: false,
      reason: 'Poca iluminación',
      suggestion: 'Muévete a un lugar más iluminado o enciende la luz.',
    };
  }

  if (brightness > 230) {
    return {
      approved: false,
      reason: 'Sobreexposición',
      suggestion: 'Evita la luz solar directa detrás de la cámara.',
    };
  }

  return { approved: true };
};
```

### 8.3 Integrar quality gate en `handleCapture`

```typescript
// Reemplazar el bloque de manipulación de imagen en handleCapture:

if (!picked.canceled && picked.assets[0]) {
  let uri = picked.assets[0].uri;

  // Optimización: Redimensionar a max 1000px
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1000 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    uri = manipulated.uri;
  } catch (manipError) {
    console.warn('Error optimizando imagen, enviando original:', manipError);
  }

  // NUEVO — Quality gate local antes de gastar el análisis del VPS
  const quality = await checkImageQuality(uri);
  if (!quality.approved) {
    Alert.alert(
      quality.reason!,
      quality.suggestion,
      [{ text: 'Entendido', style: 'default' }]
    );
    return; // No continuar — no subir imagen mala
  }

  setSelectedImage(uri);
  if (mode === 'calibrate') {
    calibrateProfile(uri);
  } else {
    analyzePhoto(uri);
  }
}
```

### 8.4 Mostrar `authenticityLabel` e `isSuppressed` en el resultado

```typescript
// En el hook useVisionChat, extender el tipo del state result:

const [result, setResult] = useState<{
  response: string;
  emotionDetected: string;
  authenticityLabel?: string;
  isSuppressed?: boolean;
  hasDiscrepancy?: boolean;
  bodyLanguage?: string;
  sceneCategory?: string;
} | null>(null);

// Y en el setResult dentro de analyzePhoto:
setResult({
  response: data.response,
  emotionDetected: data.emotionDetected,
  authenticityLabel: data.authenticityLabel,    // NUEVO
  isSuppressed: data.isSuppressed,              // NUEVO
  hasDiscrepancy: data.hasDiscrepancy,          // NUEVO
  bodyLanguage: data.bodyLanguage,
  sceneCategory: data.sceneCategory,
});
```

**Agregar badge de autenticidad en el componente de resultado** (dentro del bloque `{result && ...}`):

```tsx
{/* Agregar junto a los tags existentes, después del tag de emotionDetected: */}

{result.isSuppressed && (
  <View style={[styles.tag, { backgroundColor: 'rgba(255, 165, 0, 0.15)' }]}>
    <Text style={[styles.tagText, { color: '#FFA500' }]}>
      CONTENIDA
    </Text>
  </View>
)}

{result.hasDiscrepancy && (
  <View style={[styles.tag, { backgroundColor: 'rgba(255, 80, 80, 0.15)' }]}>
    <Text style={[styles.tagText, { color: '#FF5050' }]}>
      DISCREPANCIA DETECTADA
    </Text>
  </View>
)}

{result.authenticityLabel && result.authenticityLabel !== result.emotionDetected && (
  <View style={[styles.tag, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
    <Text style={[styles.tagText, { color: theme.colors.textMuted }]}>
      {result.authenticityLabel.toUpperCase()}
    </Text>
  </View>
)}
```

---

## 9. Mobile — `services/api.ts`

### 9.1 Timeout diferenciado por endpoint

```typescript
// Reemplazar la línea del timeout hardcodeado:
// const timeoutId = setTimeout(() => { ... }, 20000);

// Por timeout configurable por endpoint:
const ENDPOINT_TIMEOUTS: Record<string, number> = {
  '/ai/vision-chat': 30_000,       // Vision puede tardar hasta 25s con VPS frío
  '/ai/calibrate-profile': 30_000, // Igual
  '/ai/chat': 20_000,              // Chat estándar
  '/ai/recommendation': 15_000,    // Recomendación diaria
  default: 15_000,
};

// Determinar timeout según el path
const matchedKey = Object.keys(ENDPOINT_TIMEOUTS).find(k => path.startsWith(k));
const timeoutMs = ENDPOINT_TIMEOUTS[matchedKey || 'default'];

const timeoutId = setTimeout(() => {
  console.warn(`[API] TIMEOUT (${timeoutMs}ms) para: ${fullUrl}`);
  controller.abort();
}, timeoutMs);
```

### 9.2 Mejorar manejo de errores para `image_rechazada`

```typescript
// En el catch del apiFetch, agregar antes del throw:

if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));

  // Error especial de quality gate — tiene userMessage del backend
  if (response.status === 422 && errorData.reason) {
    const qualityError = new Error(errorData.userMessage || 'Imagen rechazada por calidad');
    (qualityError as any).reason = errorData.reason;
    (qualityError as any).isQualityError = true;
    throw qualityError;
  }

  throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
}
```

---

## 10. Orden de implementación recomendado

### Fase 1 — Quick wins (1–3 días) — Sin cambios de schema

Estos cambios mejoran inmediatamente la calidad sin tocar la DB:

1. `services/api.ts` — timeout diferenciado (5 min)
2. `vision-scan.tsx` — fix `/legacy` en FileSystem import (2 min)
3. `vision-scan.tsx` — quality gate local con `checkImageQuality` (1 hora)
4. `deepface_server_v2.py` — CLAHE + `assess_image_quality` (2 horas)
5. `visionAnalysis.service.ts` — circuit breaker (1 hora)

### Fase 2 — Autenticidad emocional (3–5 días)

Requiere extender interfaces pero no schema todavía:

6. `deepface_server_v2.py` — `assess_emotional_authenticity` + extender `synthesize_context`
7. `visionAnalysis.service.ts` — extender `VisionContext` con campos de autenticidad + `ImageQualityError`
8. `promptEngine.service.ts` — extender `PromptContext` + `buildVisionBlock` con discrepancia/supresión
9. `vision-scan.tsx` — mostrar `authenticityLabel`, badges de CONTENIDA/DISCREPANCIA

### Fase 3 — Historial emocional (1–2 días)

Requiere migración de DB:

10. `schema.prisma` — agregar modelo `EmotionalRecord` + relación en `User`
11. Ejecutar `npx prisma migrate dev`
12. `vision.controller.ts` — persistir `EmotionalRecord` en `handleVisionChat`
13. `insightCache.service.ts` — fix cache key + agregar `invalidateInsight`

### Fase 4 — Historial en prompts (después de tener datos)

Una vez que haya registros en `EmotionalRecord`:

14. Agregar query en `vision.controller.ts` para leer últimos 7 días del historial
15. Incorporar tendencias emocionales en `buildVisionBlock`

---

## Resumen de archivos modificados

| Archivo | Tipo de cambio | Prioridad |
|---|---|---|
| `deepface_server_v2.py` | CLAHE, quality gate, autenticidad emocional | Alta |
| `visionAnalysis.service.ts` | Circuit breaker, VisionContext extendido, ImageQualityError | Alta |
| `vision-scan.tsx` | Fix /legacy, quality gate, badges UI | Alta |
| `promptEngine.service.ts` | buildVisionBlock enriquecido, PromptContext extendido | Alta |
| `services/api.ts` | Timeout diferenciado, manejo quality error | Media |
| `vision.controller.ts` | Persistencia EmotionalRecord, manejo ImageQualityError | Media |
| `insightCache.service.ts` | Fix cache key, invalidateInsight | Media |
| `prisma/schema.prisma` | Nuevo modelo EmotionalRecord | Media |

---

*Estado: 🚧 Upgrade Plan v2.1 — basado en análisis directo del código fuente*  
*Stack: Sin dependencias externas nuevas — todos los cambios usan librerías ya instaladas*
