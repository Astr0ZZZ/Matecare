import { createClient } from 'redis'

export const redis = createClient({ url: process.env.REDIS_URL })
redis.on('error', (err) => console.log('Redis offline (expected if not configured)'))
redis.connect().catch(() => {})

