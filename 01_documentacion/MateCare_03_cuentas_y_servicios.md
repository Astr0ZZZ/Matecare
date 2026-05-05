# MateCare — Cuentas y servicios necesarios

> Referencia completa de todo lo que necesitas crear/activar antes de lanzar.
> Orden: urgente primero.

---

## BLOQUE 0 — Riesgo inmediato (hacer HOY)

### ⚠️ Rotar claves del env.json
El proyecto Flutter tiene un `env.json` en el repo. Si alguna clave fue real (Anthropic, Supabase, etc.), está expuesta en cualquier fork o clone.
- Ir a cada servicio y revocar/regenerar las API keys
- Nunca commitear `.env` o `env.json` — agregar al `.gitignore` desde ahora

---

## BLOQUE 1 — Infraestructura base (semana 1)

### 1. Supabase — Base de datos + Auth + Storage
- **URL:** supabase.com
- **Cuenta:** gratuita (free tier cubre el MVP completo)
- **Qué activas:**
  - Proyecto nuevo → región más cercana (São Paulo para latencia en Chile)
  - **RLS (Row Level Security) — activar desde el primer `migrate`**, no después
  - Auth por email/password (viene activado por defecto)
  - Storage para futuros assets (activar pero no usar aún)
- **Qué copias al `.env`:**
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (solo en backend, nunca en el cliente)
- **Costo:** $0 hasta 500MB BD y 50.000 usuarios activos/mes

### 2. Railway — Hosting del backend Node.js
- **URL:** railway.app
- **Cuenta:** gratuita con límite de $5 crédito/mes (suficiente para desarrollo)
- **Qué haces:**
  - Crear proyecto nuevo
  - Conectar con GitHub repo del backend
  - Agregar plugin Redis (para caché IA) — $0 en dev
  - Configurar variables de entorno directamente en el dashboard
- **Costo producción:** ~$10–15 USD/mes con uso real
- **Alternativa si Railway falla:** Render.com (misma estructura)

### 3. GitHub — Control de versiones
- **URL:** github.com
- **Estructura de repos recomendada:**
  ```
  matecare-backend/     (Node.js + Express)
  matecare-mobile/      (React Native + Expo)
  ```
- **Reglas desde el día 1:**
  - `.gitignore` con `node_modules`, `.env`, `env.json`, `*.local`
  - Rama `main` protegida — solo merge desde `dev`
  - Rama `dev` para desarrollo activo

---

## BLOQUE 2 — IA (semana 1-2)

### 4. Anthropic — Claude API (IA principal)
- **URL:** console.anthropic.com
- **Cuenta:** requiere tarjeta de crédito para activar
- **Plan inicial:** Pay-as-you-go (sin compromiso mensual)
- **Modelos a usar:**
  - `claude-haiku-4-5-20251001` → 70% de las interacciones (barato)
  - `claude-sonnet-4-20250514` → solo modo crisis (premium)
- **Costo estimado MVP (100 usuarios):** ~$5–15 USD/mes
- **Qué copias al `.env`:** `ANTHROPIC_API_KEY`

### 5. OpenAI — Fallback IA #1
- **URL:** platform.openai.com
- **Cuenta:** pay-as-you-go, requiere tarjeta
- **Modelos a usar:**
  - `gpt-4o-mini` → fallback standard
  - `gpt-4o` → fallback premium
- **Solo se usa si Claude falla** — costo marginal en MVP
- **Qué copias al `.env`:** `OPENAI_API_KEY`

### 6. Google AI Studio — Fallback IA #2 (Gemini)
- **URL:** aistudio.google.com
- **Cuenta:** Google account normal
- **Plan:** Free tier muy generoso (suficiente para fallback)
- **Modelo:** `gemini-1.5-flash` → notificaciones automáticas + fallback economy
- **Qué copias al `.env`:** `GEMINI_API_KEY`

---

## BLOQUE 3 — Pagos (antes de lanzar)

### 7. Stripe — Procesador de pagos
- **URL:** stripe.com
- **Cuenta:** gratuita, activación requiere datos bancarios chilenos
- **Qué configuras:**
  - Crear producto "MateCare Premium"
  - Crear precio mensual: $2.990 CLP (o ~$3 USD)
  - Crear precio anual: $24.990 CLP (o ~$25 USD)
  - Activar webhook → apunta a `https://tu-backend.railway.app/api/subscription/webhook`
  - Eventos a escuchar: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- **Qué copias al `.env`:**
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_MONTHLY`
  - `STRIPE_PRICE_ID_ANNUAL`
- **Costo:** 2.9% + $0.30 USD por transacción (sin costo fijo mensual)
- **Modo test disponible:** sí, usar `sk_test_...` durante desarrollo

---

## BLOQUE 4 — App móvil (semana 3-4)

### 8. Expo — Build y distribución React Native
- **URL:** expo.dev
- **Cuenta:** gratuita para desarrollo
- **Qué activas:**
  - Expo Application Services (EAS) para builds
  - Expo Push Notifications (gratis hasta 500 dispositivos)
- **Comandos clave:**
  ```bash
  npm install -g eas-cli
  eas login
  eas build:configure
  eas build --platform android   # genera .aab para Play Store
  eas build --platform ios       # genera .ipa para App Store
  ```
- **Costo:** $0 en free tier (3 builds/mes), $29/mes si necesitas más

### 9. Google Play Console — Distribución Android
- **URL:** play.google.com/console
- **Cuenta:** Google account con pago único de **$25 USD**
- **Proceso:**
  1. Crear app → subir `.aab` generado por EAS
  2. Completar ficha: descripción, screenshots, política de privacidad
  3. Configurar precios (Stripe maneja el cobro, no Google si usas web checkout)
  4. Enviar a revisión (tarda 1-3 días)
- **⚠️ Nota privacidad:** declarar que la app maneja "datos de salud sensibles"

### 10. Apple Developer Program — Distribución iOS
- **URL:** developer.apple.com
- **Cuenta:** $99 USD/año (renovación anual)
- **Proceso:**
  1. Enroll en Apple Developer Program (tarjeta + 48h de aprobación)
  2. Crear App ID y provisioning profile
  3. Subir `.ipa` via EAS o Transporter
  4. App Store Connect → llenar metadata + screenshots
  5. Enviar a revisión (1-7 días, más estricto que Google)
- **⚠️ Apple exige:** política de privacidad URL pública antes de aprobar
- **⚠️ Salud y sensibilidad:** Apple revisa apps con datos de salud muy cuidadosamente

---

## BLOQUE 5 — Monitoreo y analytics (antes de lanzar)

### 11. Sentry — Monitoreo de errores
- **URL:** sentry.io
- **Cuenta:** gratuita hasta 5.000 errores/mes
- **Instalar en backend:**
  ```bash
  npm install @sentry/node
  ```
- **Instalar en React Native:**
  ```bash
  npx expo install @sentry/react-native
  ```
- **Qué te da:** stack traces cuando algo falla en producción, sin que lo veas por otro lado

### 12. Mixpanel o PostHog — Analytics de producto
- **URL:** mixpanel.com / posthog.com
- **Cuenta:** gratuita (PostHog es open source y más generoso)
- **Eventos clave a trackear:**
  - `onboarding_completed`
  - `ai_message_sent`
  - `ai_tier_used` (economy/standard/premium)
  - `phase_changed`
  - `subscription_started`
  - `subscription_cancelled`
- **Por qué importa:** sin esto no sabes qué paso del onboarding pierde usuarios

---

## BLOQUE 6 — Legal (antes del lanzamiento público)

### 13. Política de privacidad — URL pública obligatoria
- **Opciones:**
  - Generarla con termsfeed.com o iubenda.com (~$10 USD/año)
  - Hospedarla en una página simple (GitHub Pages gratis)
- **Debe mencionar:**
  - Qué datos se recopilan (ciclo, perfil de personalidad)
  - Que son datos de salud sensibles
  - Cómo se almacenan y protegen
  - Que no son datos médicos ni diagnósticos
  - Que la mujer no tiene cuenta en la app (dato ingresado por el hombre)
- **Requerida por:** Apple App Store, Google Play, GDPR básico

### 14. Términos de servicio
- Similar a la política de privacidad
- Incluir cláusula explícita: "MateCare no es un servicio médico, no provee diagnósticos ni recomendaciones médicas"

---

## Resumen de costos para lanzar

| Servicio | Costo inicial | Costo mensual |
|---|---|---|
| Supabase | $0 | $0 (free tier) |
| Railway | $0 | ~$10 USD |
| GitHub | $0 | $0 |
| Anthropic API | $0 | ~$15–30 USD |
| OpenAI API | $0 | ~$0 (solo fallback) |
| Google Gemini | $0 | $0 (free tier) |
| Stripe | $0 | 2.9% por transacción |
| Expo | $0 | $0 (free tier) |
| Google Play | **$25 USD único** | $0 |
| Apple Developer | **$99 USD/año** | ~$8.25 USD/mes |
| Sentry | $0 | $0 (free tier) |
| PostHog/Mixpanel | $0 | $0 (free tier) |
| Política privacidad | ~$10 USD | $0 |
| **TOTAL lanzamiento** | **~$134 USD** | **~$25–40 USD/mes** |

Con 20 suscriptores de $3 USD/mes ya cubres los costos operativos.

---

## Orden de activación recomendado

```
Semana 1:  GitHub → Supabase (con RLS desde el inicio) → Railway
Semana 2:  Anthropic API → OpenAI API → Gemini API
Semana 3:  Expo account → Stripe (modo test primero)
Semana 4:  Sentry → PostHog
Antes de lanzar público:  Política privacidad → Google Play → Apple Developer
```

---

## Notas críticas de seguridad

1. **Nunca commitear `.env`** — usar Railway variables de entorno o similar
2. **Supabase RLS desde el primer migrate** — cada tabla necesita políticas que limiten el acceso al `user_id` del token JWT
3. **`SUPABASE_SERVICE_ROLE_KEY` solo en backend** — si llega al cliente, cualquiera puede leer toda la BD
4. **Stripe webhook secret** — verificar la firma en cada webhook, nunca saltarse ese paso
5. **API keys de IA** — rotar si alguna vez estuvieron en un repo público

---

*MateCare — Cuentas y servicios v1.0*
