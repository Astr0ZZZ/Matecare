import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Importar rutas y controladores al inicio para evitar errores de referencia
import profileRoutes from './routes/profile.routes'
import missionRoutes from './routes/missions.routes'
import aiRoutes from './routes/ai.routes';
import cycleRoutes from './routes/cycle.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { initNotificationScheduler } from './services/notificationScheduler.service'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

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

// Registro de rutas (Con y sin prefijo /api para máxima compatibilidad)
app.use('/api/profile', profileRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Aliases para compatibilidad directa si el móvil no usa /api
app.use('/profile', profileRoutes);
app.use('/missions', missionRoutes);
app.use('/cycle', cycleRoutes);
app.use('/dashboard', dashboardRoutes);

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
