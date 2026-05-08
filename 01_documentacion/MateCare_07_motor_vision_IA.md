# MateCare — Motor de visión e inteligencia contextual

> Documento de referencia técnica. Versión 1.0 — Mayo 2026

---

## 1. Resumen del módulo

Este documento cubre la integración del **módulo de visión con DeepFace** y el modelo completo de entrega de información a la IA (GPT-5 nano). Complementa los documentos `MateCare_01_arquitectura_tecnica.md` y `MateCare_06_biblioteca_prompts.md`.

**Objetivo del módulo:** Añadir una capa de lectura visual en tiempo real que permite al `promptEngine` cruzar la biología del ciclo con el estado emocional visible de la pareja en el momento exacto, generando el consejo táctico más preciso posible.

---

## 2. Arquitectura del sistema completo

### 2.1 Flujo de una petición (diagrama guardado: `diagrama_flujo_motor.png`)

El flujo de una petición desde la app hasta GPT-5 nano sigue estas etapas en orden:

1. **Petición del usuario** — La app Expo envía el mensaje del usuario (y opcionalmente una imagen en base64) al backend via `POST /api/ai/chat` o `POST /api/ai/vision-chat`.

2. **Crisis detector** — `crisisDetector.service.ts` clasifica la petición en tres niveles: `CRITICAL`, `TENSION` o `normal`. Si es `CRITICAL` o `TENSION`, el `detectTier()` fuerza el uso de `premium` (GPT-5 nano directo, sin caché).

3. **detectInsightContext** — `insightCache.service.ts` analiza el texto con regex y clasifica el contexto en uno de seis tipos: `plan_romantico`, `conflicto_tension`, `necesita_espacio`, `sorpresa_detalle`, `comunicacion_importante`, `dia_dificil`. Este contexto forma parte de la clave de caché.

4. **Capas de caché (en orden de consulta):**
   - **Redis** — TTL de 30 días. Clave: `insight:{mbtiType}_{phase}_{context}_{affectionStyle}_{conflictStyle}`. Si hay HIT, responde inmediatamente sin tocar la IA.
   - **PostgreSQL (`PersonalityInsight`)** — Caché persistente con `expiresAt` y `hitCount`. Si hay HIT y no expiró, actualiza el contador y rellena Redis para la próxima vez.
   - **Memory cache** — `Record<string, string>` en proceso. Fallback cuando Redis está offline.

5. **MISS → buildMasterPrompt** — Si ninguna capa tiene el insight, se ensambla el contexto completo desde Prisma (ciclo + personalidad + preferencias + historial + visión si aplica).

6. **routeToAI** — Llama a `askAI()` con la cadena de fallback: `gpt-5-nano` → `gpt-4.1-mini`. El resultado se guarda en las tres capas de caché antes de devolver la respuesta.

7. **Respuesta → app** — El consejo táctico llega al cliente. Nunca se devuelve la imagen ni el JSON crudo de DeepFace.

---

### 2.2 Modelo de datos y contexto para GPT-5 nano (diagrama guardado: `diagrama_datos_modelo.png`)

#### Tablas que alimentan el motor

| Tabla | Campos clave usados | Cuándo se lee |
|---|---|---|
| `PartnerProfile` | `lastPeriodDate`, `cycleLength`, `periodDuration`, `conflictStyle`, `affectionStyle`, `socialLevel`, `privacyLevel` | Cada petición (no cacheado) |
| `PersonalityProfile` | `mbtiType`, `mbtiConfidence`, `attachmentStyle`, `preferences (JSON)` | Cada petición (no cacheado) |
| `PersonalityInsight` | `cacheKey`, `insight`, `expiresAt`, `hitCount` | Caché persistente (30 días) |
| `User` | `points` → tier label, `plan` (FREE/PREMIUM) | Para determinar el tono del prompt |
| `Mission` | `title`, `description`, `category`, `completedAt` | Misiones diarias generadas por fase |
| `AIInteraction` | `role`, `content` | Historial de conversación (últimos 6) |

#### Bloques que se ensamblan en el system prompt

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM PROMPT → GPT-5 nano                             │
│                                                         │
│  [1] Bloque ciclo                                       │
│      fase · día · días hasta siguiente fase             │
│                                                         │
│  [2] Bloque personalidad                                │
│      MBTI · descripción MBTI · apego                    │
│      conflictStyle · affectionStyle · preferencias      │
│                                                         │
│  [3] Bloque visión (NUEVO — opcional)                   │
│      emoción dominante · energía aparente · entorno     │
│      instrucción: priorizar lo visual sobre el ciclo    │
│      si hay contradicción                               │
│                                                         │
│  [4] Bloque tier + reglas                               │
│      rango del usuario · tono · límite de palabras      │
│                                                         │
│  [5] Historial (últimos 6 mensajes, máx. 3 del user)   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Módulo de visión con DeepFace

### 3.1 Decisión de implementación

Se eligió **DeepFace en VPS propio** sobre APIs externas (Google Vision, Azure Face) por el argumento de privacidad de MateCare: cero datos de imagen viajan a terceros. El JSON de resultado tampoco se almacena en base de datos — solo se usa en memoria durante el ciclo de vida de la petición.

Para el MVP se recomienda **evaluar primero con una API externa** (menor fricción de setup) y migrar a DeepFace cuando haya tracción real de usuarios.

### 3.2 Archivos nuevos creados

```
matecare-backend/
  src/
    services/
      visionAnalysis.service.ts     ← llama al VPS DeepFace, devuelve VisionContext
    controllers/
      vision.controller.ts          ← endpoint POST /api/ai/vision-chat

VPS (servidor independiente):
  deepface_server.py                ← Flask API que corre DeepFace
```

### 3.3 Archivos existentes modificados

#### `promptEngine.service.ts`

Añadir al interface `PromptContext`:

```typescript
visionContext?: {
  dominantEmotion: string;   // "alegria" | "tristeza" | "irritabilidad" | "calma"
  energyAppearance: string;  // "alta" | "media" | "baja"
  environment: string;       // "hogar" | "exterior" | "trabajo"
  style: string;
};
```

Añadir en `buildSystemPrompt`, antes de las reglas de respuesta:

```typescript
const visionBlock = ctx.visionContext
  ? `
LECTURA VISUAL DEL MOMENTO (foto en tiempo real):
- Emoción dominante detectada: ${ctx.visionContext.dominantEmotion}
- Nivel de energía aparente: ${ctx.visionContext.energyAppearance}
- Entorno donde está: ${ctx.visionContext.environment}
INSTRUCCIÓN CRÍTICA: Cruza la fase del ciclo con esta lectura visual.
Si hay contradicción (ej: fase de alta energía pero parece cansada),
prioriza lo visual.`
  : "";
```

#### `ai.routes.ts`

```typescript
import { handleVisionChat } from '../controllers/vision.controller';

router.post('/vision-chat', requireAuth, handleVisionChat);
```

#### `.env`

```env
DEEPFACE_URL="http://TU_IP_VPS:5001"
DEEPFACE_TOKEN="secreto-largo-aqui"
```

---

## 4. Instalación de DeepFace en el VPS

### 4.1 Requisitos

- Python 3.10+
- 1GB RAM mínimo (los modelos pesan ~500MB en disco)
- Puerto 5001 abierto solo para el backend (no público)

### 4.2 Setup

```bash
# Instalar dependencias
pip install flask deepface tf-keras pillow

# Setear el token de seguridad
export DEEPFACE_TOKEN="tu-secreto"

# Correr el servidor
python deepface_server.py

# Con PM2 (recomendado para producción)
pm2 start deepface_server.py --interpreter python3 --name deepface
pm2 save
```

La primera vez que corra, DeepFace descarga automáticamente los modelos de redes neuronales (~500MB). Las llamadas siguientes son rápidas (~1-3s por análisis).

### 4.3 Seguridad

- El servidor DeepFace **nunca** debe estar expuesto públicamente. Solo el backend Node.js puede llamarlo, usando el header `X-Internal-Token`.
- Añadir una regla de firewall en el VPS para que el puerto 5001 solo acepte conexiones desde la IP del backend.
- Las imágenes se procesan en memoria y no se persisten en disco.

### 4.4 Endpoint del servidor

```
POST http://VPS_IP:5001/analyze
Headers:
  X-Internal-Token: {DEEPFACE_TOKEN}
  Content-Type: application/json
Body:
  { "image": "data:image/jpeg;base64,..." }

Response:
{
  "dominantEmotion": "calma",
  "allEmotions": { "calma": 72.3, "alegria": 18.1, ... },
  "energyAppearance": "media",
  "estimatedAge": 28,
  "gender": "Woman",
  "environment": null,
  "style": null
}
```

> Los campos `environment` y `style` son `null` en la versión base de DeepFace. El backend los completa con heurísticas simples (por defecto `"hogar"`). En una v2 se puede añadir un modelo de clasificación de escena.

---

## 5. Endpoint de visión en el backend

```
POST /api/ai/vision-chat
Authorization: Bearer {jwt}
Content-Type: application/json

Body:
{
  "image": "data:image/jpeg;base64,...",   // requerido, máx 5MB
  "userMessage": "¿Cómo me acerco ahora?" // opcional
}

Response:
{
  "response": "Consejo táctico generado...",
  "visionUsed": true,
  "emotionDetected": "cansancio",
  "fromCache": false
}
```

**Garantías de privacidad del endpoint:**
- La imagen nunca se guarda en base de datos.
- El JSON de DeepFace nunca llega al cliente.
- Solo `emotionDetected` (string) se devuelve como metadata informativa.
- Si DeepFace no responde (timeout 12s), el endpoint usa `neutralVisionContext()` y continúa con el flujo normal sin fallar.

---

## 6. Componente mobile: VisionScan

Archivo: `matecare-mobile/app/(tabs)/vision-scan.tsx`

El componente incluye el hook `useVisionChat` que puede importarse en cualquier pantalla:

```typescript
import { useVisionChat } from './vision-scan';

const { analyzePhoto, loading, result, error } = useVisionChat();

// Usar en chat.tsx existente:
await analyzePhoto(imageUri, "¿Cómo me acerco ahora?");
```

**Dependencias a instalar:**

```bash
npx expo install expo-image-picker expo-camera
```

---

## 7. Lógica de caché del insight engine

### Cómo se construye la clave de caché

```typescript
// insightCache.service.ts — buildCacheKey()
function buildCacheKey(req: InsightRequest): string {
  return `${req.mbtiType}_${req.phase}_${req.context}_${req.affectionStyle}_${req.conflictStyle}`;
}

// Ejemplo:
// "INFJ_LUTEAL_conflicto_tension_VERBAL_AVOIDANT"
```

Esta clave cubre las combinaciones más relevantes para la respuesta. Las preferencias (`music`, `plans`, `stressedNeeds`) enriquecen el prompt pero no forman parte de la clave — un trade-off consciente para maximizar los hits de caché.

### Ciclo de vida del insight

```
1. Redis HIT       → respuesta inmediata (~5ms)
2. PostgreSQL HIT  → respuesta + rellena Redis (~20ms)
3. Memory HIT      → respuesta cuando Redis está offline
4. MISS            → llama a GPT-5 nano → guarda en las 3 capas → respuesta (~2-5s)
```

### Cuándo expira

- **Redis:** 30 días (TTL hardcodeado)
- **PostgreSQL:** `expiresAt` = fecha de creación + 30 días. Se puede ajustar en `DB_EXPIRY_DAYS`.
- **Memory:** Vive mientras el proceso Node.js esté activo.

### Cuándo NO se usa el caché

- Cuando el `crisisDetector` detecta `CRITICAL` o `TENSION` — en esos casos se va directo al LLM.
- Cuando el contexto es `plan_romantico` — se considera demasiado genérico para servir un insight cacheado.
- Cuando hay `visionContext` activo — la lectura visual es única por momento, el caché no aplica.

---

## 8. Cadena de fallback de modelos

`aiClient.service.ts` define el orden de intentos:

```typescript
const MODEL_FALLBACK_CHAIN = [
  "gpt-5-nano",    // Primer intento: el más rápido y barato
  "gpt-4.1-mini"  // Fallback si gpt-5-nano falla o devuelve vacío
];
```

Si todos los modelos fallan, devuelve el string hardcodeado:
```
"Lo más importante hoy es la presencia tranquila y la escucha activa."
```

Este fallback final garantiza que la app nunca muestre un error al usuario.

---

## 9. Variables de entorno requeridas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DEEPFACE_URL` | URL del servidor DeepFace en el VPS | `http://123.45.67.89:5001` |
| `DEEPFACE_TOKEN` | Token secreto compartido entre backend y VPS | `matecare-deep-secret-2026` |
| `OPENAI_API_KEY` | Para GPT-5 nano y gpt-4.1-mini | `sk-...` |
| `DATABASE_URL` | PostgreSQL (Supabase) | `postgresql://...` |
| `REDIS_URL` | Redis para caché de insights | `redis://localhost:6379` |
| `JWT_SECRET` | Firma de tokens de sesión | `cambiar-en-produccion` |

---

## 10. Checklist de integración

- [ ] Copiar `deepface_server.py` al VPS e instalar dependencias
- [ ] Configurar `DEEPFACE_URL` y `DEEPFACE_TOKEN` en `.env` del backend
- [ ] Copiar `visionAnalysis.service.ts` a `src/services/`
- [ ] Copiar `vision.controller.ts` a `src/controllers/`
- [ ] Añadir `visionContext?` al interface `PromptContext` en `promptEngine.service.ts`
- [ ] Añadir `visionBlock` al template de `buildSystemPrompt`
- [ ] Registrar `router.post('/vision-chat', requireAuth, handleVisionChat)` en `ai.routes.ts`
- [ ] Copiar `VisionScan.tsx` a `app/(tabs)/vision-scan.tsx` en la app mobile
- [ ] Instalar `expo-image-picker` y `expo-camera` en el proyecto mobile
- [ ] Verificar que el puerto 5001 del VPS solo acepta conexiones del backend
- [ ] Probar con `GET http://VPS_IP:5001/health` que el servidor responde

---

## 11. Diagramas de referencia

Los siguientes diagramas fueron generados y guardados como parte de esta documentación:

| Archivo | Descripción |
|---|---|
| `diagrama_arquitectura_general.png` | Flujo Expo → Node.js → DeepFace VPS → Supabase |
| `diagrama_prompt_engine.png` | Tres fuentes de datos → ensamblador → IA → consejo |
| `diagrama_flujo_motor.png` | Flujo completo de petición con las 3 capas de caché |
| `diagrama_datos_modelo.png` | Tablas Prisma + bloques del system prompt para GPT-5 nano |

---

*Documento generado en base al análisis del repositorio `Matecare-main` — Mayo 2026*
