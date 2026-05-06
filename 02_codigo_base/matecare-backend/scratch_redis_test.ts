import { redis } from './src/lib/redis';

async function test() {
  try {
    console.log("TESTING REDIS SYNTAX...");
    // Try node-redis v4 syntax
    await redis.set('test_key', 'test_val', { EX: 10 });
    console.log("NODE-REDIS V4 SYNTAX OK");
  } catch (e: any) {
    console.log("NODE-REDIS V4 SYNTAX FAILED:", e.message);
    try {
      // Try ioredis / legacy syntax
      (redis as any).setex('test_key', 10, 'test_val');
      console.log("SETEX SYNTAX OK");
    } catch (e2: any) {
      console.log("SETEX SYNTAX FAILED:", e2.message);
    }
  }
}

test();
