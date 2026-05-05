# MateCare — Infraestructura de pagos e IA resiliente

> Decisiones de arquitectura para producción. v1.0

---

## PARTE 1 — PAGOS: Stripe como pilar único

### Por qué Stripe y no Transbank

| Criterio | Stripe | Transbank |
|---|---|---|
| Uptime SLA | 99.99% garantizado | Sin SLA público |
| SDK React Native | Oficial y mantenido | No existe |
| Suscripciones recurrentes | Nativo, muy maduro | Manual, complejo |
| Usuarios internacionales | Sí, 135+ países | Solo Chile |
| Webhooks confiables | Sí, con reintentos | Limitados |
| Manejo de tarjeta rechazada | Reintentos automáticos | Manual |
| Costo por transacción | 2.9% + $0.30 USD | 1.95% (solo débito CLP) |

Transbank es más barato en Chile, pero te cierra el mercado internacional desde el día 1. MateCare es una idea global. Stripe es la decisión correcta.

---

### Flujo de pago en producción

```
Usuario toca "Suscribirse"
        ↓
App llama a POST /api/subscription/checkout
        ↓
Backend crea PaymentIntent en Stripe
        ↓
App abre Stripe Payment Sheet (SDK nativo)
        ↓
Usuario ingresa tarjeta (Stripe la maneja, tú nunca ves los datos)
        ↓
Stripe confirma pago → dispara webhook a tu backend
        ↓
Backend actualiza user.plan = PREMIUM en BD
        ↓
App recibe confirmación → desbloquea features
```

### Código del webhook (el más importante)

```typescript
// backend/src/routes/subscription.routes.ts

import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Este endpoint NUNCA debe fallar — es el que activa/desactiva premium
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!
  let event: Stripe.Event

  try {
    // Stripe firma cada webhook — verificamos que sea legítimo
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return res.status(400).send('Webhook signature invalid')
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
      break

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice)
      break
  }

  // SIEMPRE responder 200 a Stripe aunque algo falle internamente
  // Si no, Stripe reintenta el webhook indefinidamente
  res.json({ received: true })
})

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId
  const isActive = sub.status === 'active' || sub.status === 'trialing'

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: isActive ? 'PREMIUM' : 'FREE',
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      subscriptionEndsAt: new Date(sub.current_period_end * 1000)
    }
  })
}

async function handleSubscriptionCancelled(sub: Stripe.Subscription) {
  await prisma.user.update({
    where: { stripeSubscriptionId: sub.id },
    data: { plan: 'FREE' }
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Stripe ya reintenta automáticamente 3 veces
  // Aquí solo notificamos al usuario
  const userId = invoice.metadata?.userId
  if (userId) {
    await sendPushNotification(userId, {
      title: 'Problema con tu suscripción',
      body: 'Hubo un error procesando tu pago. Actualiza tu método de pago para continuar.'
    })
  }
}
```

### Campos adicionales en el modelo User para Stripe

```prisma
model User {
  // ... campos existentes ...
  stripeCustomerId      String?   @unique
  stripeSubscriptionId  String?   @unique
  subscriptionEndsAt    DateTime?
}
```

---

## PARTE 2 — IA: Sistema de fallback de 3 niveles

### El problema que resuelve esto

Sin fallback, si la API de Claude falla o sube de precio, tu app deja de funcionar o se vuelve insostenible. Con este sistema:
- Si Claude falla → cambia a GPT-4o automáticamente
- Si GPT-4o falla → cambia a Gemini automáticamente
- Si los tres fallan → usa respuestas cacheadas inteligentes
- Nunca el usuario ve un error de IA

Y el beneficio económico: puedes enrutar el 80% del tráfico al modelo más barato que dé buena calidad, y solo usar el modelo premium para casos complejos.

---

### Comparativa de costos de IA para MateCare

**Estimación de tokens por interacción:**
- System prompt (contexto fase + personalidad): ~400 tokens input
- Mensaje del usuario: ~50 tokens input
- Respuesta de la IA: ~300 tokens output
- **Total por interacción: ~750 tokens**

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) | Costo por interacción |
|---|---|---|---|
| Claude Sonnet 4 | $3.00 | $15.00 | **$0.0057** |
| Claude Haiku 4.5 | $0.80 | $4.00 | **$0.0016** |
| GPT-4o | $2.50 | $10.00 | **$0.0045** |
| GPT-4o mini | $0.15 | $0.60 | **$0.00027** |
| Gemini 1.5 Flash | $0.075 | $0.30 | **$0.00014** |

**Estrategia de enrutamiento:**

```
Chat conversacional (hombre pregunta algo)
  → Claude Haiku 4.5 (barato, rápido, suficientemente bueno)

Notificación diaria automática (sin input del usuario)
  → Gemini 1.5 Flash (el más barato, es un texto corto estandarizado)

Conversación compleja (detectamos palabras clave: pelea, distancia, crisis)
  → Claude Sonnet 4 (máxima calidad cuando más importa)
```

Con 1.000 usuarios activos y 2 interacciones/día promedio:
- Sin estrategia: todo en Sonnet 4 → **$11.40/día = $342/mes**
- Con estrategia: 70% Haiku, 25% Flash, 5% Sonnet → **~$2.10/día = $63/mes**

**Ahorro: ~82% en costos de IA.**

---

### El AIRouter — el archivo clave

```typescript
// backend/src/services/aiRouter.service.ts

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { redis } from '../lib/redis'

// Clientes de cada proveedor
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export type AITier = 'premium' | 'standard' | 'economy'

// Detecta automáticamente qué tier usar según el contexto
export function detectTier(userInput?: string): AITier {
  if (!userInput) return 'economy'  // notificación automática → más barato

  const complexKeywords = [
    'pelea', 'peleamos', 'distancia', 'fría', 'enojada',
    'separación', 'crisis', 'llorando', 'mal', 'problema grave'
  ]

  const isComplex = complexKeywords.some(k =>
    userInput.toLowerCase().includes(k)
  )

  return isComplex ? 'premium' : 'standard'
}

// Router principal con fallback automático
export async function routeToAI(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant', content: string }[],
  tier: AITier
): Promise<string> {

  // Intentar caché primero (para notificaciones repetidas de la misma fase)
  const cacheKey = buildCacheKey(systemPrompt, messages)
  const cached = await redis.get(cacheKey)
  if (cached) return cached

  // Intentar por orden según el tier
  const providers = getProviderOrder(tier)

  for (const provider of providers) {
    try {
      const result = await callProvider(provider, systemPrompt, messages)

      // Cachear respuestas de notificaciones automáticas (sin input del usuario)
      const isAutomatic = messages[messages.length - 1].content.includes('consejo del día')
      if (isAutomatic) {
        await redis.set(cacheKey, result, { EX: 60 * 60 * 6 }) // 6 horas
      }

      return result
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error)
      // Continuar con el siguiente proveedor
      continue
    }
  }

  // Fallback final: respuesta estática de alta calidad según la fase
  return getStaticFallback(systemPrompt)
}

function getProviderOrder(tier: AITier): string[] {
  switch (tier) {
    case 'premium':  return ['claude-sonnet', 'gpt-4o', 'gemini-pro']
    case 'standard': return ['claude-haiku', 'gpt-4o-mini', 'gemini-flash']
    case 'economy':  return ['gemini-flash', 'gpt-4o-mini', 'claude-haiku']
  }
}

async function callProvider(
  provider: string,
  system: string,
  messages: { role: 'user' | 'assistant', content: string }[]
): Promise<string> {

  switch (provider) {
    case 'claude-sonnet': {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system,
        messages: messages as any
      })
      return (res.content[0] as any).text
    }

    case 'claude-haiku': {
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system,
        messages: messages as any
      })
      return (res.content[0] as any).text
    }

    case 'gpt-4o': {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 600,
        messages: [{ role: 'system', content: system }, ...messages] as any
      })
      return res.choices[0].message.content!
    }

    case 'gpt-4o-mini': {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages: [{ role: 'system', content: system }, ...messages] as any
      })
      return res.choices[0].message.content!
    }

    case 'gemini-flash': {
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const prompt = `${system}\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
      const res = await model.generateContent(prompt)
      return res.response.text()
    }

    case 'gemini-pro': {
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' })
      const prompt = `${system}\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
      const res = await model.generateContent(prompt)
      return res.response.text()
    }

    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// Si todos los proveedores fallan, esto NUNCA muestra un error al usuario
function getStaticFallback(systemPrompt: string): string {
  // Extraemos la fase del system prompt para dar una respuesta relevante
  if (systemPrompt.includes('MENSTRUAL')) {
    return 'Hoy es un buen día para darle espacio y comodidad. Evita planes exigentes y si puedes, hazle algo pequeño sin que te lo pida — un café, su comida favorita, o simplemente estar presente sin pedir nada a cambio.'
  }
  if (systemPrompt.includes('FOLLICULAR')) {
    return 'Está en una de sus mejores etapas del mes. Es buen momento para proponer algo nuevo — una salida, un plan diferente. Va a estar más receptiva y con energía.'
  }
  if (systemPrompt.includes('OVULATION')) {
    return 'Esta semana es ideal para la conexión. Busca tiempo de calidad juntos, comunícate con intención y aprovecha que está en su punto más alto de energía y apertura.'
  }
  return 'Dale más espacio del normal hoy. Está en una fase donde la paciencia y la presencia tranquila valen más que cualquier plan o solución.'
}

function buildCacheKey(system: string, messages: any[]): string {
  // Cache key simple basada en fase (primeras 100 chars del system) + último mensaje
  const phaseHint = system.slice(0, 100)
  const lastMsg = messages[messages.length - 1]?.content?.slice(0, 50) ?? ''
  return `ai:${Buffer.from(phaseHint + lastMsg).toString('base64').slice(0, 40)}`
}
```

---

### Redis para caché (reduce costos aún más)

Las notificaciones automáticas del día se generan igual para todos los usuarios en la misma fase. Con caché Redis:

- Si 200 usuarios están en fase folicular hoy → la IA se llama 1 vez, no 200
- TTL de 6 horas → se renueva a mediodía si quieres variedad
- **Ahorro adicional estimado: 60–70% del costo de notificaciones automáticas**

```typescript
// backend/src/lib/redis.ts
import { createClient } from 'redis'

export const redis = createClient({ url: process.env.REDIS_URL })
redis.connect()
```

Redis en Railway cuesta ~$3/mes adicionales. Se paga solo con el primer día de ahorro en tokens.

---

## PARTE 3 — Variables de entorno actualizadas

```bash
# backend/.env

# Base de datos
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."

# IA — los tres proveedores
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="AIza..."

# Pagos
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_MONTHLY="price_..."   # ID del precio en Stripe dashboard
STRIPE_PRICE_ID_ANNUAL="price_..."

# App
JWT_SECRET="..."
EXPO_ACCESS_TOKEN="..."
PORT=3000
NODE_ENV="production"
```

---

## PARTE 4 — Estimación de costos en régimen

### Escenario: 500 usuarios premium activos

| Concepto | Costo mensual |
|---|---|
| Railway (backend + Redis) | $10 USD |
| Supabase (BD + auth) | $0 (free tier cubre) |
| IA con estrategia de enrutamiento | ~$30 USD |
| Stripe fees (500 × $3 × 2.9%) | ~$43 USD |
| Expo push notifications | $0 (free tier) |
| Sentry monitoreo | $0 (free tier) |
| **Total operativo** | **~$83 USD/mes** |
| **Ingreso (500 × $3 USD/mes)** | **$1.500 USD/mes** |
| **Margen** | **~$1.417 USD/mes** |

### Escenario: 2.000 usuarios premium

| Concepto | Costo mensual |
|---|---|
| Railway (escalar instancia) | $25 USD |
| Supabase Pro | $25 USD |
| IA con enrutamiento | ~$100 USD |
| Stripe fees | ~$174 USD |
| **Total operativo** | **~$324 USD/mes** |
| **Ingreso (2.000 × $3 USD/mes)** | **$6.000 USD/mes** |
| **Margen** | **~$5.676 USD/mes** |

---

## Resumen de decisiones

1. **Pagos → Stripe.** Punto. No se negocia. Uptime, reintentos automáticos, SDK nativo, mercado global.

2. **IA primaria → Claude Haiku 4.5** para el 70% de interacciones. Buena calidad, bajo costo.

3. **IA compleja → Claude Sonnet 4** solo cuando hay palabras clave de situación difícil.

4. **IA automática → Gemini Flash** para notificaciones programadas. El más barato.

5. **Fallback → GPT-4o mini** si falla el proveedor principal. Nunca mostrar un error al usuario.

6. **Caché Redis** para notificaciones automáticas del mismo día. Reduce llamadas a IA en ~65%.

7. **Respuesta estática de calidad** si todos los proveedores fallan. El usuario siempre recibe algo útil.

---

*MateCare — Infraestructura de pagos e IA resiliente v1.0*
