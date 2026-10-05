import { getHealth } from './health.service.js';

export async function healthCheck(req, res) {
  const health = await getHealth();
  res
    .status(health.status === 'ok' ? 200 : 503)
    .set('Cache-Control', 'no-store')
    .json(health);
}
