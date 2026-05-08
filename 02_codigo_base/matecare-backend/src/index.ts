import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// Health check PRIORITARIO
app.get('/health', (_req, res) => res.json({ status: 'ok', port: PORT }))

// Logger de tráfico para depuración de 404s
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Importar rutas (Carga diferida después de asegurar el núcleo)
import profileRoutes from './routes/profile.routes'
import cycleRoutes from './routes/cycle.routes'
import missionRoutes from './routes/missions.routes'
import aiRoutes from './routes/ai.routes'
import dashboardRoutes from './routes/dashboard.routes'
import notificationRoutes from './routes/notifications.routes'

// Registro de rutas
app.use('/api/profile', profileRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch-all para 404s con logging detallado
app.use((req, res) => {
  console.warn(`[404] Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: `Ruta no encontrada en el servidor MateCare`,
    method: req.method,
    url: req.url 
  });
});

app.listen(Number(PORT), '0.0.0.0', () => console.log(`MateCare backend running on 0.0.0.0:${PORT}`));

export default app
