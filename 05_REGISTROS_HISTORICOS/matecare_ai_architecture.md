# MateCare AI — Arquitectura del Sistema de Doble Agente

## Flujo Completo: Desde el "Hola" hasta la Respuesta

```mermaid
sequenceDiagram
    participant App as 📱 App Móvil<br/>(useAIChat.ts)
    participant Ctrl as 🔀 Controlador<br/>(ai.controller.ts)
    participant A1 as 🧠 Agente 1<br/>"La Intérprete"
    participant A2 as 💬 Agente 2<br/>"El Copiloto"
    participant DB as 🗄️ Base de Datos<br/>(Prisma/PostgreSQL)
    participant GPT as 🤖 OpenAI<br/>(gpt-5-nano)

    App->>Ctrl: POST /api/ai/chat/stream<br/>{ mensaje: "Hola", history: [] }
    Ctrl->>DB: Busca PartnerProfile del usuario
    DB-->>Ctrl: Perfil encontrado (ciclo, MBTI, visión)
    Ctrl->>Ctrl: Configura headers SSE
    Ctrl-->>App: data: {"status":"Analizando..."}
    
    Ctrl->>A1: getUnifiedContext() + interpreterInput
    Note over A1: Lee: Fase del ciclo, MBTI,<br/>apego, visión técnica, mensaje del usuario<br/>DEVUELVE: JSON técnico interno
    A1->>GPT: [system: INTERPRETER_PROMPT]<br/>[user: BIOLOGÍA + PERFIL + MENSAJE]
    GPT-->>A1: {"real_state":"...","sexual_mood":"...","hidden_need":"..."}
    A1-->>Ctrl: interpreterAnalysis (JSON)
    
    Ctrl-->>App: (tokens van llegando en stream)
    
    Ctrl->>A2: copilotInstructions + copilotInput
    Note over A2: Lee: Mensaje del usuario (PRIMERO),<br/>análisis de A1 (como contexto),<br/>memoria visual<br/>DEVUELVE: texto legible para el usuario
    A2->>GPT: [system: COPILOT_PROMPT]<br/>[user: "Hola" + contexto interno]
    GPT-->>A2: "¡Hola! Soy tu Coach..." (stream token a token)
    A2-->>Ctrl: token por token
    Ctrl-->>App: data: {"token":"¡Hola"}... data: {"token":"!"}...
    
    Ctrl->>DB: Guarda lastInterpreterAnalysis + lastVisionDescription
    Ctrl-->>App: data: {"done": true}
    App->>App: Renderiza mensaje completo en burbuja
```

---

## Roles de Cada Agente

| Agente | Nombre | Función | ¿Ve el mensaje del usuario? | Responde al usuario |
|--------|--------|---------|---------------------------|---------------------|
| **Agente 1** | La Intérprete | Psicóloga experta en mujeres. Analiza el estado emocional, hormonal y de apego de la pareja. | Sí (como contexto extra) | ❌ NO. Solo genera JSON interno. |
| **Agente 2** | El Copiloto | Coach masculino. Le habla directamente al usuario. Usa el análisis de A1 como "inteligencia secreta". | Sí (PRIMERO y con prioridad) | ✅ SÍ. Genera la respuesta visible. |

---

## Qué Lee Cada Agente

### Agente 1 — La Intérprete (`INTERPRETER_SYSTEM_PROMPT`)
```
BIOLOGÍA: Fase Luteal, Día 19
CONTEXTO BIOLÓGICO: [descripción de la fase]
PERFIL PSICOLÓGICO:
  - MBTI: ESTP (descripción)
  - APEGO: SECURE (descripción)
VISIÓN_LOCAL: {"style": "casual", "emotion": "neutral"}
MENSAJE/ORDEN: "Hola"           ← el mensaje va, pero es baja prioridad para A1
```

### Agente 2 — El Copiloto (`COPILOT_SYSTEM_PROMPT`)
```
MENSAJE DEL USUARIO: "Hola"     ← PRIMERO Y CON ÉNFASIS

CONTEXTO INTERNO (solo referencia):
- Estado emocional: [output de A1]
- Necesidad oculta: [output de A1]
- Nota táctica: [output de A1]
- Memoria visual: "Estilo casual, proyecta..."
```

---

## Flujo del Escáner de Visión (Separado del Chat)

```mermaid
graph LR
    A[👤 Usuario sube foto] --> B[POST /api/ai/vision-chat]
    B --> C[Python DeepFace<br/>Puerto 5001]
    C --> D[Análisis técnico:<br/>emoción, tensión facial]
    D --> E[OpenAI GPT<br/>Análisis estético:<br/>ropa, estilo, entorno]
    E --> F[🗄️ DB: lastVisionDescription<br/>= 'Estilo coquette, vestido rojo...']
    F --> G[Próximo chat usa esta<br/>memoria visual]
```

**El Escáner NO forma parte del chat.** Solo escribe en `lastVisionDescription` del perfil. El chat la lee en cada consulta.

---

## Campos de DB Relevantes (PartnerProfile)

| Campo | Escrito por | Leído por | Descripción |
|-------|-------------|-----------|-------------|
| `lastVisionDescription` | Escáner de Visión | Chat (A2) | "Lleva vestido rojo, estilo coquette..." |
| `lastInterpreterAnalysis` | Chat (A1) | — | JSON técnico del último análisis |
| `visionAnalysis` | Escáner Python | Chat (A1) | Datos técnicos: emoción, tensión facial |
| `lastAdvice` | Dashboard/Oracle | Dashboard | Consejo del día |

---

## ⚠️ Problema Actual Diagnosticado

El Copiloto (A2) está ignorando el saludo porque:
1. El `COPILOT_SYSTEM_PROMPT` base + las instrucciones extra crean reglas **contradictorias**
2. El modelo prioriza el análisis táctico denso sobre el simple "Hola"

**Fix aplicado:** El `copilotInput` ahora pone `MENSAJE DEL USUARIO` **primero**, y el análisis interno es marcado como "solo de referencia". El log `[DEBUG] RESPUESTA COPILOTO: "..."` revelará exactamente qué dice la IA.
