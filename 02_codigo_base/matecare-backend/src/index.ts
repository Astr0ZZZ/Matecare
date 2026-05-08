import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Importar rutas y controladores al inicio para evitar errores de referencia
import profileRoutes from './routes/profile.routes'
import cycleRoutes from './routes/cycle.routes'
import missionRoutes from './routes/missions.routes'
import aiRoutes from './routes/ai.routes';
import notificationRoutes from './routes/notifications.routes';
import { initNotificationScheduler } from './services/notificationScheduler.service'
import { getDashboardSummary } from './controllers/dashboard.controller'
import { requireAuth } from './middleware/auth.middleware'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001 // Forzamos 3001 que es el que usa el móvil

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', port: PORT }))

// Logger de tráfico
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Registro de rutas
app.use('/api/profile', profileRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/ai', aiRoutes);

// Registro directo del Dashboard
app.get('/api/dashboard/summary/:userId', requireAuth, getDashboardSummary);
app.get('/api/dashboard/ping', (_req, res) => res.json({ status: 'ok', message: 'Dashboard is reachable' }));

app.use('/api/notifications', notificationRoutes);

// Catch-all para 404s
app.use((req, res) => {
  console.warn(`[404] Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: `Ruta no encontrada en el servidor MateCare`,
    method: req.method,
    url: req.url 
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`MateCare backend running on 0.0.0.0:${PORT}`);
  initNotificationScheduler();
});

export default app
