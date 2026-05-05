# MateCare — Configuración de entornos

> Referencia para abrir cuentas y configurar dev / staging / prod correctamente.
> Leer completo antes de crear cualquier cuenta.

---

## Estructura de entornos

```
dev     → local en tu máquina, BD Supabase dev, Stripe test, Gemini free
staging → Railway, misma BD dev, para QA con testers
prod    → Railway, BD Supabase prod separada, Stripe live
```

La diferencia clave: **dev y staging comparten BD**, prod tiene la suya propia.
Así los testers no contaminan datos reales cuando lances.

---

## Paso 1 — Supabase (abrir hoy)

### Crear DOS proyectos

**Proyecto 1: matecare-dev**
- Región: South America (São Paulo) — menor latencia desde Chile
- Password: generar uno fuerte y guardarlo en un gestor de contraseñas
- Plan: Free

**Proyecto 2: matecare-prod**
- Misma región
- Plan: Free (cambiar a Pro cuando tengas usuarios reales)
- No tocar hasta que estés listo para lanzar

### En CADA proyecto, apenas lo crees:

1. Ir a **Authentication → Policies**
2. Activar **Row Level Security** en todas las tablas (se hace desde el SQL Editor)
3. Ir a **Settings → API** y copiar:
   - `Project URL` → tu `SUPABASE_URL`
   - `anon public` key → tu `SUPABASE_ANON_KEY` (va en la app móvil)
   - `service_role` key → tu `SUPABASE_SERVICE_ROLE_KEY` (solo en backend, nunca en mobile)

### String de conexión para Prisma

En **Settings → Database → Connection string → URI**:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```
Ese es tu `DATABASE_URL`.

---

## Paso 2 — Google AI Studio — Gemini (abrir hoy)

- Ir a: aistudio.google.com
- Login con cuenta Google
- Crear API key → **Get API key → Create API key in new project**
- Nombre del proyecto: `matecare-dev`
- Copiar la key → `GEMINI_API_KEY`
- Plan gratuito: 1.500 requests/día, 1M tokens/min — más que suficiente para todo el desarrollo

### Verificar que funciona

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=TU_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"contents":[{"parts":[{"text":"Hola"}]}]}'
```
Debe responder con texto. Si funciona, la key está activa.

---

## Paso 3 — Stripe (abrir hoy, modo test)

- Ir a: stripe.com → crear cuenta
- Verificar email
- **NO activar modo live todavía** — trabajar siempre en modo test durante desarrollo

### Configurar el producto

1. Dashboard → **Products → Add product**
2. Nombre: `MateCare Premium`
3. Agregar dos precios:
   - Mensual: $2.990 CLP, recurrente mensual → copiar `Price ID` → `STRIPE_PRICE_ID_MONTHLY`
   - Anual: $24.990 CLP, recurrente anual → copiar `Price ID` → `STRIPE_PRICE_ID_ANNUAL`

### Configurar webhook (cuando tengas Railway URL)

1. Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://tu-app.railway.app/api/subscription/webhook`
3. Eventos a escuchar:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copiar **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Keys de Stripe test

En **Developers → API keys**:
- `sk_test_...` → `STRIPE_SECRET_KEY` (solo en backend)
- `pk_test_...` → `STRIPE_PUBLISHABLE_KEY` (en la app móvil para el SDK)

Tarjeta de prueba: `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC.

---

## Paso 4 — Railway (cuando empieces QA)

No es urgente hoy. Hacerlo cuando el backend corra bien en local.

1. railway.app → login con GitHub
2. **New Project → Deploy from GitHub repo** → seleccionar `matecare-backend`
3. Railway detecta Node.js automáticamente
4. Agregar plugin **Redis** (para caché IA) desde el dashboard del proyecto
5. En **Variables** → agregar todas las variables del `.env` (ver sección siguiente)
6. En **Settings → Domains → Generate Domain** → copiar la URL

---

## Archivos .env completos

### backend/.env (desarrollo local)

```bash
# Base de datos — Supabase dev
DATABASE_URL="postgresql://postgres:[PASS]@db.[REF].supabase.co:5432/postgres?sslmode=require"

# Redis — local durante desarrollo
REDIS_URL="redis://localhost:6379"

# IA — solo Gemini durante desarrollo
GEMINI_API_KEY="AIza..."
ANTHROPIC_API_KEY="pendiente"
OPENAI_API_KEY="pendiente"

# Pagos — Stripe modo test
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_MONTHLY="price_..."
STRIPE_PRICE_ID_ANNUAL="price_..."

# App
JWT_SECRET="matecare-dev-secret-cambiar-en-prod"
PORT=3000
NODE_ENV="development"
APP_NAME="MateCare"
```

### backend/.env.railway (staging — pegar en Railway Variables)

```bash
# Igual que development pero con estos cambios:
DATABASE_URL="postgresql://..."   # misma BD dev está bien para staging
REDIS_URL="redis://..."           # URL del plugin Redis de Railway (Railway la genera sola)
NODE_ENV="production"
JWT_SECRET="string-largo-y-aleatorio-diferente-al-dev"
```

### mobile/.env (desarrollo local)

```bash
EXPO_PUBLIC_API_URL="http://192.168.1.X:3000"    # IP local de tu PC
EXPO_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
EXPO_PUBLIC_APP_ENV="development"
```

### mobile/.env.staging

```bash
EXPO_PUBLIC_API_URL="https://tu-app.railway.app"
EXPO_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
EXPO_PUBLIC_APP_ENV="staging"
```

---

## Primer migrate — secuencia exacta

Una vez que tengas `DATABASE_URL` en tu `.env`:

```bash
cd backend
npm install
npx prisma generate          # genera el cliente TypeScript
npx prisma migrate dev --name init   # crea las tablas en Supabase
npx prisma studio            # abre UI para verificar que las tablas existen
```

Si `prisma studio` muestra las tablas vacías → todo correcto.

### Activar RLS después del migrate

En Supabase dashboard → SQL Editor → ejecutar:

```sql
-- Activar RLS en todas las tablas de MateCare
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartnerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CycleLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- Política base: cada usuario solo ve sus propios datos
CREATE POLICY "users_own_data" ON "User"
  FOR ALL USING (auth.uid()::text = id);

CREATE POLICY "profile_own_data" ON "PartnerProfile"
  FOR ALL USING (auth.uid()::text = "userId");

CREATE POLICY "logs_own_data" ON "CycleLog"
  USING (
    "profileId" IN (
      SELECT id FROM "PartnerProfile" WHERE "userId" = auth.uid()::text
    )
  );

CREATE POLICY "ai_own_data" ON "AIInteraction"
  FOR ALL USING (auth.uid()::text = "userId");

CREATE POLICY "notif_own_data" ON "Notification"
  FOR ALL USING (auth.uid()::text = "userId");
```

---

## Verificación antes de arrancar a codear

Checklist rápido — marcar cada uno antes de escribir código de negocio:

```
[ ] Supabase dev creado y DATABASE_URL en .env
[ ] npx prisma migrate dev corrió sin errores
[ ] npx prisma studio muestra las tablas
[ ] RLS activado en Supabase (ejecutar SQL de arriba)
[ ] GEMINI_API_KEY en .env y curl de verificación respondió
[ ] npm run dev del backend responde en localhost:3000/health
[ ] Expo Go instalado en el celular
[ ] npx expo start levanta y muestra QR
[ ] App en celular conecta al backend (mismo WiFi, usar IP local no localhost)
```

Cuando todos estén marcados → el entorno está listo para que Antigravity empiece a implementar.

---

## Variables por servicio — resumen

| Variable | Dónde va | Cuándo la tienes |
|---|---|---|
| `DATABASE_URL` | solo backend | Al crear Supabase |
| `SUPABASE_ANON_KEY` | mobile + backend | Al crear Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | solo backend | Al crear Supabase |
| `GEMINI_API_KEY` | solo backend | Al crear key en AI Studio |
| `ANTHROPIC_API_KEY` | solo backend | Después del MVP |
| `OPENAI_API_KEY` | solo backend | Después del MVP |
| `STRIPE_SECRET_KEY` | solo backend | Al crear cuenta Stripe |
| `STRIPE_PUBLISHABLE_KEY` | mobile | Al crear cuenta Stripe |
| `STRIPE_WEBHOOK_SECRET` | solo backend | Al configurar webhook |
| `JWT_SECRET` | solo backend | Inventarlo tú (string largo) |
| `EXPO_PUBLIC_API_URL` | solo mobile | Al tener backend corriendo |

---

*MateCare — Configuración de entornos v1.0*
