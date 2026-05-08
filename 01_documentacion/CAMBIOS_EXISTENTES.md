# Cambios en archivos existentes de MateCare

## 1. promptEngine.service.ts — agregar visionContext a PromptContext

Añade el campo opcional al interface y el bloque en buildSystemPrompt:

```typescript
// En el interface PromptContext, después de userTier?:
visionContext?: {
  dominantEmotion: string;
  energyAppearance: string;
  environment: string;
  style: string;
};
```

Y en buildSystemPrompt, antes de las REGLAS DE RESPUESTA:

```typescript
// Añadir este bloque justo después de la línea de preferencias (ctx.preferences?.stressedNeeds)
const visionBlock = ctx.visionContext
  ? `
LECTURA VISUAL DEL MOMENTO (foto en tiempo real):
- Emoción dominante detectada: ${ctx.visionContext.dominantEmotion}
- Nivel de energía aparente: ${ctx.visionContext.energyAppearance}
- Entorno donde está: ${ctx.visionContext.environment}
INSTRUCCIÓN CRÍTICA: Cruza OBLIGATORIAMENTE la fase del ciclo con esta
lectura visual para dar el consejo más preciso posible. Si hay
contradicción (ej: fase de alta energía pero parece cansada), prioriza
lo visual.`
  : "";

// Y en el template literal del return, añadir ${visionBlock} antes de REGLAS DE RESPUESTA:
return `Eres MateCare...
...
${ctx.preferences?.stressedNeeds ? `- Necesidad bajo estrés: ${ctx.preferences.stressedNeeds}` : ''}
${visionBlock}

REGLAS DE RESPUESTA:
...`;
```

---

## 2. ai.routes.ts — registrar la nueva ruta

```typescript
// Añadir al principio del archivo:
import { handleVisionChat } from '../controllers/vision.controller';

// Añadir después de las rutas existentes:
router.post('/vision-chat', requireAuth, handleVisionChat);
```

---

## 3. .env — añadir las dos variables nuevas

```env
DEEPFACE_URL="http://TU_IP_VPS:5001"
DEEPFACE_TOKEN="pon-aqui-un-secreto-largo"
```
