import { createClient } from 'redis'

export const redis = createClient({ url: process.env.REDIS_URL })
let isRedisOfflineLogged = false;
redis.on('error', (err) => {
  if (!isRedisOfflineLogged) {
    console.warn('[Redis] Connection failed. Using fallback in-memory/DB caching.');
    isRedisOfflineLogged = true;
  }
});
redis.connect().catch(() => {})

