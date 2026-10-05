import { isDBUp } from '../../config/db.js';
import { isRedisUp } from '../../config/redis.js';

// API, database, and Redis status (MAIN-03). The API is healthy only when both stores are up.
export async function getHealth() {
  const [dbUp, redisUp] = await Promise.all([isDBUp(), isRedisUp()]);
  return {
    status: dbUp && redisUp ? 'ok' : 'error',
    db: dbUp ? 'up' : 'down',
    redis: redisUp ? 'up' : 'down',
  };
}
