# MateCare — Desarrollo local y deploy a Railway

---

## Parte 1 — Desarrollar en local (sin gastar nada)

### Lo que necesitas instalar una sola vez
```bash
# Node.js v20+ (descargar desde nodejs.org)
node --version   # debe decir v20.x.x

# Expo CLI
npm install -g eas-cli expo-cli

# Prisma CLI (se instala con el proyecto)
```

### Levantar el backend local

```bash
cd backend
cp .env.example .env      # completar variables (ver abajo)
npm install
npm run db:generate       # genera el cliente Prisma
npm run db:migrate        # crea las tablas en la BD
npm run dev               # servidor en http://localhost:3000
```

El backend queda en `http://localhost:3000`. Puedes probarlo con:
```bash
curl http://localhost:3000/health
# responde: {"status":"ok"}
```

### Levantar la app mobile local

```bash
cd mobile
cp .env.example .env
# cambiar EXPO_PUBLIC_API_URL a http://localhost:3000
npm install
npx expo start
```

Expo abre un QR. Escanearlo con la app **Expo Go** en tu celular.
La app se conecta a tu backend local por WiFi — ambos deben estar en la misma red.

### Base de datos local vs Supabase

**Opción A — Supabase en la nube (recomendada desde el día 1)**
Supabase free tier es permanente y no tienes que instalar nada.
Solo copias `DATABASE_URL` desde el dashboard de Supabase a tu `.env` local.
Ventaja: cuando hagas deploy a Railway, la misma BD ya está lista.

**Opción B — PostgreSQL local**
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/WSL
sudo apt install postgresql
sudo service postgresql start
```
`DATABASE_URL="postgresql://localhost:5432/matecare"`
Desventaja: tienes que migrar los datos cuando subas a Railway.

**Recomendación: usa Supabase desde el día 1.** Evitas migrar datos después.

---

## Parte 2 — Solo Gemini durante desarrollo

### Modificar aiRouter para usar solo Gemini

```typescript
// backend/src/services/aiRouter.service.ts

export async function routeToAI(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tier: AITier
): Promise<string> {

  // DESARROLLO: siempre usar Gemini (gratis, sin tarjeta)
  // Cuando tengas las otras keys, quitar este bloque
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('...')) {
    return callGemini(systemPrompt, messages, 'gemini-flash')
  }

  // Producción: lógica completa de fallback
  const providers = getProviderOrder(tier)
  for (const provider of providers) {
    try {
      return await callProvider(provider, systemPrompt, messages)
    } catch {
      continue
    }
  }
  return getStaticFallback(systemPrompt)
}
```

### .env durante desarrollo con solo Gemini
```bash
# Solo esta key es necesaria para que funcione la IA
GEMINI_API_KEY="AIza..."        # conseguir en aistudio.google.com (gratis, sin tarjeta)

# Estas pueden quedar vacías o con el placeholder
ANTHROPIC_API_KEY="pendiente"
OPENAI_API_KEY="pendiente"

# Estas sí son necesarias desde el día 1
DATABASE_URL="postgresql://..."   # Supabase
STRIPE_SECRET_KEY="sk_test_..."   # Stripe modo test
JWT_SECRET="cualquier-string-largo-aqui"
```

---

## Parte 3 — Deploy a Railway (cuando tengas testers)

### Setup inicial de Railway (una sola vez)

1. Crear cuenta en railway.app con GitHub
2. Crear proyecto nuevo → "Deploy from GitHub repo"
3. Seleccionar el repo `matecare-backend`
4. Railway detecta Node.js automáticamente

### Variables de entorno en Railway

En el dashboard de Railway → tu servicio → pestaña **Variables**:
Copiar exactamente las mismas variables del `.env` local.

```
DATABASE_URL        = (copiar desde Supabase dashboard)
GEMINI_API_KEY      = (tu key de Gemini)
ANTHROPIC_API_KEY   = pendiente
OPENAI_API_KEY      = pendiente
STRIPE_SECRET_KEY   = sk_test_...
STRIPE_WEBHOOK_SECRET = whsec_...
JWT_SECRET          = (string largo y aleatorio)
PORT                = 3000
NODE_ENV            = production
```

**Nunca copiar/pegar el `.env` completo como texto en Railway** — ingresar variable por variable en el dashboard para evitar exponer datos.

### Primer deploy

```bash
# En tu repo, agregar estos archivos si no existen:

# backend/Procfile
web: node dist/index.js

# o Railway también acepta el campo "start" del package.json
# que ya está configurado: "start": "node dist/index.js"
```

Railway hace deploy automático cada vez que haces `git push` a `main`.

```bash
git add .
git commit -m "feat: initial backend setup"
git push origin main
# Railway detecta el push y hace deploy en ~2 minutos
```

### Obtener la URL pública de Railway

Dashboard → tu servicio → pestaña **Settings** → **Domains**
→ "Generate Domain" → te da algo como `matecare-backend-production.up.railway.app`

Esa URL va al `.env` del mobile:
```bash
EXPO_PUBLIC_API_URL="https://matecare-backend-production.up.railway.app"
```

### Verificar que funciona

```bash
curl https://matecare-backend-production.up.railway.app/health
# debe responder: {"status":"ok"}
```

---

## Parte 4 — Flujo de trabajo recomendado

### Mientras desarrollas solo (sin testers)
```
código local → probar con Expo Go en tu celular → backend en localhost
```
No gastas nada. BD en Supabase free tier.

### Cuando quieres QA con otras personas
```
git push main → Railway hace deploy automático → 
testers usan Expo Go apuntando a la URL de Railway
```
Costo Railway: $0 con crédito gratuito, o ~$5/mes si se acaba.

### Cuando lanzas a producción
```
eas build --platform android  → subir a Play Store
eas build --platform ios      → subir a App Store
```

---

## Parte 5 — Errores comunes a evitar

| Error | Cómo evitarlo |
|---|---|
| Commitear `.env` a GitHub | `.gitignore` ya lo tiene — verificar antes de cada push |
| `SUPABASE_SERVICE_ROLE_KEY` en el mobile | Solo va en backend. En mobile solo va `ANON_KEY` |
| Olvidar activar RLS en Supabase | Activarlo en el primer migrate — en el dashboard Supabase → Authentication → RLS |
| App mobile no conecta con backend local | Verificar que ambos están en la misma WiFi y usar IP local (192.168.x.x), no `localhost` |
| Railway falla el build | Verificar que `package.json` tiene `"build": "tsc"` y que compila sin errores localmente primero |
| Prisma no encuentra la BD | `DATABASE_URL` debe incluir `?sslmode=require` para Supabase: `postgresql://...supabase.co:5432/postgres?sslmode=require` |

---

## Resumen del flujo completo

```
Día 1:    Crear cuenta Supabase → copiar DATABASE_URL al .env local
Día 1:    Crear cuenta Google AI Studio → copiar GEMINI_API_KEY
Día 1:    npm install + prisma migrate + npm run dev → backend local OK
Día 2:    npx expo start → app en celular conectada al backend local
Semanas 1-4: desarrollar todo en local, cero costos
Cuando listo para QA: git push → Railway URL → testers con Expo Go
Cuando listo para lanzar: eas build → Play Store + App Store
```

---

*MateCare — Guía local y deploy v1.0*
