# MateCare — Arquitectura técnica completa

> Documento de referencia para desarrollo. Versión 1.0

---

## 1. Visión del producto

**MateCare** es la primera app diseñada desde la perspectiva del hombre como usuario principal. No es un tracker menstrual: es un sistema de inteligencia contextual que combina datos del ciclo + perfil de personalidad para generar recomendaciones de comportamiento en tiempo real.

**Diferencial técnico clave:** La IA no trabaja con datos crudos del ciclo — trabaja con un perfil construido del carácter de la mujer. Eso es lo que ninguna app de ciclo hace hoy.

---

## 2. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| App móvil | React Native + Expo | iOS + Android desde un solo código |
| Backend | Node.js + Express | Liviano, rápido de iterar, gran ecosistema |
| Base de datos | PostgreSQL (Supabase) | Relacional, gratuito hasta cierto uso, auth incluida |
| ORM | Prisma | Tipos seguros, migraciones fáciles |
| IA | Anthropic Claude API (claude-sonnet) | Mejor razonamiento contextual, ideal para prompts largos |
| Push notifications | Expo Notifications + FCM/APNs | Integración nativa con React Native |
| Auth | Supabase Auth (JWT) | Gratis, seguro, gestión de sesiones incluida |
| Hosting backend | Railway | Deploy automático desde GitHub, $5/mes |
| Pagos | Stripe | API robusta, soporte para suscripciones recurrentes |
| Monitoreo | Sentry | Errores en tiempo real, gratis en tier básico |

---

## 3. Estructura de carpetas

```
matecare/
│
├── mobile/                          # App React Native (Expo)
│   ├── app/                         # Expo Router (file-based routing)
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (onboarding)/
│   │   │   ├── cycle-setup.tsx      # Paso 1: datos del ciclo
│   │   │   ├── personality-quiz.tsx # Paso 2: perfil de personalidad
│   │   │   └── confirm.tsx          # Paso 3: resumen y confirmación
│   │   ├── (tabs)/
│   │   │   ├── index.tsx            # Dashboard principal (fase actual)
│   │   │   ├── chat.tsx             # Chat con IA reactiva
│   │   │   ├── calendar.tsx         # Vista del ciclo en calendario
│   │   │   └── profile.tsx          # Configuración del perfil
│   │   └── _layout.tsx
│   │
│   ├── components/
│   │   ├── PhaseCard.tsx            # Tarjeta con la fase actual
│   │   ├── RecommendationCard.tsx   # Tarjeta de recomendación IA
│   │   ├── PersonalityBadge.tsx     # Muestra el tipo de personalidad
│   │   ├── CycleProgressBar.tsx     # Barra de progreso del ciclo
│   │   └── ChatBubble.tsx           # Burbuja de chat
│   │
│   ├── hooks/
│   │   ├── usePartnerProfile.ts     # Fetch y cache del perfil
│   │   ├── useCurrentPhase.ts       # Fase calculada localmente
│   │   └── useAIChat.ts             # Lógica del chat con IA
│   │
│   ├── services/
│   │   ├── api.ts                   # Cliente HTTP (fetch + auth headers)
│   │   └── notifications.ts         # Registro y permisos de notifs
│   │
│   └── constants/
│       ├── phases.ts                # Descripciones de las 4 fases
│       └── personality.ts           # Tipos de personalidad y etiquetas
│
├── backend/                         # Node.js + Express
│   ├── src/
│   │   ├── index.ts                 # Entry point, middlewares
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── profile.routes.ts
│   │   │   ├── cycle.routes.ts
│   │   │   ├── ai.routes.ts
│   │   │   └── notifications.routes.ts
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── profile.controller.ts
│   │   │   ├── cycle.controller.ts
│   │   │   ├── ai.controller.ts
│   │   │   └── notifications.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── cycleEngine.service.ts     ← NÚCLEO: calcula fase del ciclo
│   │   │   ├── promptEngine.service.ts    ← NÚCLEO: construye el prompt IA
│   │   │   ├── aiClient.service.ts        ← Llama a la API de Claude
│   │   │   ├── notificationScheduler.service.ts
│   │   │   └── personalityMapper.service.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── subscription.middleware.ts  # Bloquea features premium
│   │   │
│   │   └── lib/
│   │       └── prisma.ts                  # Instancia compartida de Prisma
│   │
│   ├── prisma/
│   │   ├── schema.prisma              # Esquema de la BD
│   │   └── migrations/
│   │
│   └── jobs/
│       └── dailyPhaseCheck.job.ts     # Cron job: genera notif diaria
│
└── shared/                            # Tipos compartidos mobile ↔ backend
    └── types/
        ├── cycle.types.ts
        ├── personality.types.ts
        └── ai.types.ts
```

---

## 4. Esquema de base de datos (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  plan          Plan      @default(FREE)
  createdAt     DateTime  @default(now())

  partnerProfile  PartnerProfile?
  aiInteractions  AIInteraction[]
  notifications   Notification[]
}

enum Plan {
  FREE
  PREMIUM
}

model PartnerProfile {
  id               String    @id @default(uuid())
  userId           String    @unique
  user             User      @relation(fields: [userId], references: [id])

  // Datos del ciclo
  cycleLength      Int       // días (ej: 28)
  periodDuration   Int       // días (ej: 5)
  lastPeriodDate   DateTime
  isIrregular      Boolean   @default(false)
  irregularRange   Int?      // variación en días si es irregular

  // Perfil de personalidad
  personalityType  PersonalityType
  socialLevel      SocialLevel
  privacyLevel     PrivacyLevel
  conflictStyle    ConflictStyle
  affectionStyle   AffectionStyle

  cycleLogs        CycleLog[]
  updatedAt        DateTime  @updatedAt
}

enum PersonalityType {
  INTROVERTED
  EXTROVERTED
  AMBIVERT
}

enum SocialLevel {
  LOW     // poco uso de redes, vida privada
  MEDIUM
  HIGH    // muy activa en redes, social
}

enum PrivacyLevel {
  VERY_PRIVATE
  MODERATE
  OPEN
}

enum ConflictStyle {
  AVOIDANT    // evita conflictos, necesita tiempo
  DIRECT      // prefiere hablar de frente
  PASSIVE     // lo deja pasar pero lo siente
}

enum AffectionStyle {
  PHYSICAL    // contacto físico
  VERBAL      // palabras de afirmación
  ACTS        // actos de servicio
  QUALITY     // tiempo de calidad
}

model CycleLog {
  id             String    @id @default(uuid())
  profileId      String
  profile        PartnerProfile @relation(fields: [profileId], references: [id])
  logDate        DateTime
  phase          CyclePhase
  dayOfCycle     Int
  notes          String?
}

enum CyclePhase {
  MENSTRUAL     // días 1-5
  FOLLICULAR    // días 6-13
  OVULATION     // días 14-16
  LUTEAL        // días 17-28
}

model AIInteraction {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  userInput     String?   // null si fue automática (notif)
  aiResponse    String
  phaseContext  CyclePhase
  promptTokens  Int
  createdAt     DateTime  @default(now())
}

model Notification {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  message       String
  type          NotifType
  scheduledAt   DateTime
  sentAt        DateTime?
  opened        Boolean   @default(false)
}

enum NotifType {
  PHASE_CHANGE    // cambió de fase
  DAILY_TIP       // consejo del día
  PERIOD_SOON     // aviso 2 días antes
  CUSTOM          // enviada por el usuario
}
```

---

## 5. El motor de ciclo (`cycleEngine.service.ts`)

Este archivo no usa IA. Es pura matemática de fechas.

```typescript
// backend/src/services/cycleEngine.service.ts

import { CyclePhase } from '@prisma/client'

interface CycleState {
  dayOfCycle: number
  phase: CyclePhase
  daysUntilNextPhase: number
  daysUntilNextPeriod: number
  isIrregular: boolean
}

export function calculateCycleState(
  lastPeriodDate: Date,
  cycleLength: number,
  periodDuration: number,
  isIrregular: boolean = false
): CycleState {
  const today = new Date()
  const diffMs = today.getTime() - lastPeriodDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Día actual dentro del ciclo (1-based, se reinicia cada cicleLength días)
  const dayOfCycle = (diffDays % cycleLength) + 1

  // Determinar fase según día del ciclo
  const phase = getPhaseFromDay(dayOfCycle, periodDuration, cycleLength)

  // Días hasta cambio de fase
  const daysUntilNextPhase = getDaysUntilNextPhase(dayOfCycle, periodDuration, cycleLength)

  // Días hasta próximo período
  const daysUntilNextPeriod = cycleLength - dayOfCycle + 1

  return {
    dayOfCycle,
    phase,
    daysUntilNextPhase,
    daysUntilNextPeriod,
    isIrregular
  }
}

function getPhaseFromDay(
  day: number,
  periodDuration: number,
  cycleLength: number
): CyclePhase {
  if (day <= periodDuration) return CyclePhase.MENSTRUAL

  // Ovulación aproximada: día 14 en ciclo de 28. Escala proporcionalmente.
  const ovulationDay = Math.round((14 / 28) * cycleLength)
  const follicularEnd = ovulationDay - 1
  const ovulationEnd = ovulationDay + 2

  if (day <= follicularEnd) return CyclePhase.FOLLICULAR
  if (day <= ovulationEnd) return CyclePhase.OVULATION
  return CyclePhase.LUTEAL
}

function getDaysUntilNextPhase(
  day: number,
  periodDuration: number,
  cycleLength: number
): number {
  const ovulationDay = Math.round((14 / 28) * cycleLength)

  if (day <= periodDuration) return periodDuration - day + 1
  if (day < ovulationDay - 1) return (ovulationDay - 1) - day
  if (day <= ovulationDay + 2) return (ovulationDay + 2) - day + 1
  return cycleLength - day + 1
}
```

---

## 6. El prompt engine (`promptEngine.service.ts`)

Este es el archivo más importante del proyecto. Genera el prompt dinámico que recibe la IA.

```typescript
// backend/src/services/promptEngine.service.ts

import {
  CyclePhase, PersonalityType, SocialLevel,
  PrivacyLevel, ConflictStyle, AffectionStyle
} from '@prisma/client'

interface PromptContext {
  phase: CyclePhase
  dayOfCycle: number
  daysUntilNextPhase: number
  personalityType: PersonalityType
  socialLevel: SocialLevel
  privacyLevel: PrivacyLevel
  conflictStyle: ConflictStyle
  affectionStyle: AffectionStyle
  userInput?: string        // pregunta del hombre (puede ser null para notifs automáticas)
  interactionHistory?: { role: 'user' | 'assistant', content: string }[]
}

// Descripciones de cada fase para el prompt
const PHASE_DESCRIPTIONS: Record<CyclePhase, string> = {
  MENSTRUAL: `Su cuerpo está en fase menstrual (días ${1}-${5} aprox). 
Hormonas en su punto más bajo (estrógeno y progesterona bajas). 
Puede sentir cansancio, dolores, necesidad de calor y descanso. 
Emocionalmente puede estar más sensible, introspectiva o irritable. 
Necesita comodidad, no estímulos.`,

  FOLLICULAR: `Está en fase folicular (días 6-13 aprox). 
El estrógeno está subiendo. Energía y ánimo en aumento progresivo. 
Es social, creativa, optimista. Buena disposición para planes, conversaciones y novedad. 
Es el mejor momento para proponer cosas nuevas.`,

  OVULATION: `Está en fase de ovulación (días 14-16 aprox). 
Pico máximo de estrógeno y testosterona. Energía y libido en su punto más alto. 
Está comunicativa, cálida, muy social y atractiva. 
Es el mejor momento para conexión romántica y conversaciones importantes.`,

  LUTEAL: `Está en fase lútea (días 17-28 aprox). 
La progesterona sube y el estrógeno baja gradualmente. 
Puede volverse más sensible, necesitar más validación emocional. 
En los últimos días puede tener PMS: irritabilidad, ansiedad, necesidad de espacio. 
Necesita paciencia y presencia sin presión.`
}

const PERSONALITY_DESCRIPTIONS: Record<PersonalityType, string> = {
  INTROVERTED: 'Es una persona introvertida: recarga energía en soledad, prefiere planes tranquilos y en privado, le afecta más el caos social.',
  EXTROVERTED: 'Es extrovertida: recarga energía con gente, disfruta planes sociales, se apaga si está mucho tiempo sin interacción.',
  AMBIVERT: 'Es una persona mixta: puede disfrutar tanto momentos sociales como de quietud según cómo se sienta.'
}

const CONFLICT_DESCRIPTIONS: Record<ConflictStyle, string> = {
  AVOIDANT: 'Frente al conflicto tiende a cerrarse y necesita tiempo antes de hablar. No presionarla es fundamental.',
  DIRECT: 'Prefiere hablar los problemas de frente aunque sea incómodo. Valora la honestidad directa.',
  PASSIVE: 'Tenderá a no decir que algo le molesta pero sí lo sentirá. Hay que leer sus señales.'
}

const AFFECTION_DESCRIPTIONS: Record<AffectionStyle, string> = {
  PHYSICAL: 'Su lenguaje de amor principal es el contacto físico: abrazos, caricias, presencia física.',
  VERBAL: 'Lo que más le llega son las palabras de afirmación: decirle cosas bonitas, reconocerla, expresarle lo que sientes.',
  ACTS: 'Valora más los actos de servicio: que hagas cosas por ella sin que te lo pida.',
  QUALITY: 'Lo que más valora es el tiempo de calidad: estar presentes, sin distracciones, haciendo algo juntos.'
}

export function buildSystemPrompt(ctx: PromptContext): string {
  return `Eres MateCare, un asistente de inteligencia emocional diseñado para ayudar a hombres a entender y conectar mejor con su pareja a través de su ciclo hormonal.

Tu rol es dar consejos concretos, empáticos y accionables. No eres un médico. No diagnosticas. No juzgas. Ayudas al hombre a saber cómo actuar HOY con su pareja.

ESTADO ACTUAL DE SU PAREJA:
${PHASE_DESCRIPTIONS[ctx.phase]}
Lleva ${ctx.dayOfCycle} días en el ciclo. Faltan aproximadamente ${ctx.daysUntilNextPhase} días para que cambie de fase.

PERFIL DE PERSONALIDAD DE SU PAREJA:
- ${PERSONALITY_DESCRIPTIONS[ctx.personalityType]}
- ${CONFLICT_DESCRIPTIONS[ctx.conflictStyle]}
- ${AFFECTION_DESCRIPTIONS[ctx.affectionStyle]}

REGLAS DE RESPUESTA:
1. Sé directo. Da acciones concretas, no solo teoría.
2. Usa un tono cercano y de compañero, no de manual médico.
3. Si el hombre hace una pregunta específica, respóndela con ese contexto.
4. Cuando sugieras algo, explica brevemente POR QUÉ funciona dada la fase.
5. Máximo 3-4 recomendaciones por respuesta. Menos es más.
6. Si la situación es delicada (pelea, distancia), sé más cuidadoso y empático.
7. Responde siempre en español.`
}

export function buildMessages(ctx: PromptContext) {
  const messages = []

  // Historial de conversación si existe
  if (ctx.interactionHistory?.length) {
    messages.push(...ctx.interactionHistory)
  }

  // Mensaje del usuario o trigger automático
  const userMessage = ctx.userInput
    ? ctx.userInput
    : `Dame el consejo del día para hoy, considerando la fase y el perfil de mi pareja.`

  messages.push({ role: 'user', content: userMessage })

  return messages
}
```

---

## 7. El cliente de IA (`aiClient.service.ts`)

```typescript
// backend/src/services/aiClient.service.ts

import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt, buildMessages } from './promptEngine.service'
import type { PromptContext } from './promptEngine.service'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function getAIRecommendation(ctx: PromptContext): Promise<string> {
  const systemPrompt = buildSystemPrompt(ctx)
  const messages = buildMessages(ctx)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,          // suficiente para 3-4 recomendaciones
    system: systemPrompt,
    messages: messages as any
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  return content.text
}
```

---

## 8. El job de notificaciones diarias

```typescript
// backend/jobs/dailyPhaseCheck.job.ts
// Se ejecuta con node-cron todos los días a las 8:00 AM

import cron from 'node-cron'
import { prisma } from '../src/lib/prisma'
import { calculateCycleState } from '../src/services/cycleEngine.service'
import { getAIRecommendation } from '../src/services/aiClient.service'
import { sendPushNotification } from '../src/services/push.service'

// Todos los días a las 8:00 AM hora del servidor
cron.schedule('0 8 * * *', async () => {
  const profiles = await prisma.partnerProfile.findMany({
    include: { user: true }
  })

  for (const profile of profiles) {
    const cycleState = calculateCycleState(
      profile.lastPeriodDate,
      profile.cycleLength,
      profile.periodDuration,
      profile.isIrregular
    )

    const recommendation = await getAIRecommendation({
      phase: cycleState.phase,
      dayOfCycle: cycleState.dayOfCycle,
      daysUntilNextPhase: cycleState.daysUntilNextPhase,
      personalityType: profile.personalityType,
      socialLevel: profile.socialLevel,
      privacyLevel: profile.privacyLevel,
      conflictStyle: profile.conflictStyle,
      affectionStyle: profile.affectionStyle
      // sin userInput → genera el consejo del día automáticamente
    })

    // Guardar en BD
    await prisma.aIInteraction.create({
      data: {
        userId: profile.userId,
        aiResponse: recommendation,
        phaseContext: cycleState.phase,
        promptTokens: 0  // puedes capturar del response
      }
    })

    // Enviar push
    await sendPushNotification(profile.userId, {
      title: 'Consejo del día',
      body: recommendation.slice(0, 120) + '...',  // preview corto
      data: { screen: 'chat', full: recommendation }
    })
  }
})
```

---

## 9. Flujo del onboarding (paso a paso en la app)

### Paso 1 — Datos del ciclo (`cycle-setup.tsx`)
Preguntas en pantalla:
- ¿Cuándo fue su último período? → DatePicker
- ¿Cuántos días dura su ciclo normalmente? → Slider (21–35, default 28)
- ¿Cuántos días le dura la regla? → Slider (2–8, default 5)
- ¿Su ciclo es irregular? → Toggle → si sí, preguntar variación aproximada

### Paso 2 — Perfil de personalidad (`personality-quiz.tsx`)
5 preguntas de opción múltiple, una por pantalla con animación:

**P1:** "Después de un día social largo, tu pareja prefiere…"
- A) Estar sola y recargar → INTROVERTED
- B) Seguir viendo gente, le da energía → EXTROVERTED
- C) Depende del día → AMBIVERT

**P2:** "Cuando algo le molesta, ella suele…"
- A) No decir nada pero se nota → PASSIVE
- B) Prefiere esperar y hablar cuando se calme → AVOIDANT
- C) Prefiere hablarlo aunque sea incómodo → DIRECT

**P3:** "Lo que más la hace sentir amada es…"
- A) Un abrazo o toque físico → PHYSICAL
- B) Que le digas cosas bonitas → VERBAL
- C) Que hagas cosas por ella sin pedírtelo → ACTS
- D) Tiempo presente, sin el teléfono → QUALITY

**P4:** "Su presencia en redes sociales es…"
- A) Casi no las usa, es muy privada → LOW
- B) Las usa con moderación → MEDIUM
- C) Muy activa, comparte mucho → HIGH

**P5:** "En general su nivel de privacidad es…"
- A) Muy privada, no le gusta que la gente sepa de su vida → VERY_PRIVATE
- B) Normal, comparte lo que quiere → MODERATE
- C) Abierta, no tiene problema que la gente sepa cosas → OPEN

### Paso 3 — Confirmación (`confirm.tsx`)
Mostrar resumen del perfil construido como "tarjeta de su pareja" antes de guardar. No se usan nombres reales — solo el perfil.

---

## 10. Endpoints del backend

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh

GET    /api/profile                  → perfil de la pareja
POST   /api/profile                  → crear perfil (onboarding)
PATCH  /api/profile                  → actualizar perfil

GET    /api/cycle/current            → fase actual + días
GET    /api/cycle/forecast           → próximas 4 semanas

POST   /api/ai/recommend             → recomendación a pedido del hombre
POST   /api/ai/chat                  → mensaje al chat IA (conversación)
GET    /api/ai/history               → historial de conversaciones

GET    /api/notifications            → notificaciones del usuario
PATCH  /api/notifications/:id/open   → marcar como leída

POST   /api/subscription/checkout    → crear sesión de pago Stripe
POST   /api/subscription/webhook     → webhook Stripe (cambios de plan)
```

---

## 11. Variables de entorno

```bash
# backend/.env

DATABASE_URL="postgresql://user:pass@host:5432/matecare"
ANTHROPIC_API_KEY="sk-ant-..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
JWT_SECRET="..."
EXPO_ACCESS_TOKEN="..."   # para push notifications
PORT=3000
```

```bash
# mobile/.env

EXPO_PUBLIC_API_URL="https://tu-backend.railway.app"
```

---

## 12. Orden de desarrollo recomendado

### Semana 1–2: Base
1. Configurar Supabase + PostgreSQL + Prisma schema
2. Endpoints de auth (register, login, JWT)
3. Endpoint de perfil (POST, GET)
4. `cycleEngine.service.ts` con tests unitarios

### Semana 3–4: Núcleo IA
5. `promptEngine.service.ts` — el archivo más importante
6. `aiClient.service.ts` — integración con Claude
7. Endpoint `/api/ai/recommend`
8. Endpoint `/api/ai/chat` con historial

### Semana 5–6: App móvil
9. Pantallas de auth (login / register)
10. Onboarding completo (3 pasos)
11. Dashboard con fase actual
12. Pantalla de chat con IA

### Semana 7: Notificaciones
13. Expo Notifications setup
14. `dailyPhaseCheck.job.ts` (cron diario)
15. Notificaciones de cambio de fase

### Semana 8: Monetización
16. Integración Stripe (checkout + webhook)
17. Middleware de suscripción en endpoints premium
18. Pantalla de paywall en la app

---

## 13. Decisiones de diseño importantes

**¿Por qué no guardar el nombre de la pareja?**
Privacidad. El perfil es anónimo. Esto elimina fricciones legales y hace la app más confortable para los dos.

**¿Por qué Claude y no GPT-4?**
Claude maneja mejor el razonamiento con contexto largo (el system prompt es denso) y tiene menos tendencia a respuestas genéricas. Para recomendaciones de comportamiento, la calidad de razonamiento importa más que la velocidad.

**¿Por qué React Native y no Flutter?**
El ecosistema JS/TS es más consistente con Node.js en backend. Compartes tipos con la carpeta `/shared`. Expo acelera el desarrollo inicial enormemente.

**¿Por qué Supabase y no Firebase?**
PostgreSQL es relacional — el esquema de perfil + ciclo + personalidad se beneficia enormemente de las relaciones. Firebase es document-store y modelar esto en NoSQL sería más complejo. Además Supabase tiene auth y storage incluidos en el tier gratuito.

---

*MateCare — Documento interno v1.0*
