import { createClient } from 'redis'

export const redis = createClient({ url: process.env.REDIS_URL })
export let isConnected = false;
let isRedisOfflineLogged = false;

redis.on('error', (err) => {
  isConnected = false;
  if (!isRedisOfflineLogged) {
    console.warn('[Redis] Connection failed. Using fallback in-memory/DB caching.');
    isRedisOfflineLogged = true;
  }
});

redis.on('connect', () => {
  isConnected = true;
  console.log('[Redis] Connected successfully.');
});

redis.connect().catch(() => {
  isConnected = false;
});

