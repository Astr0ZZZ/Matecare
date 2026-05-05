import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Importar rutas
import profileRoutes from './routes/profile.routes'
import cycleRoutes from './routes/cycle.routes'
import missionRoutes from './routes/missions.routes'
import aiRoutes from './routes/ai.routes'

app.use('/api/profile', profileRoutes)
app.use('/api/cycle', cycleRoutes)
app.use('/api/missions', missionRoutes)
app.use('/api/ai', aiRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(Number(PORT), '0.0.0.0', () => console.log(`MateCare backend running on 0.0.0.0:${PORT}`));

export default app
