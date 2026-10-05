// Every route group is mounted here, under /api/v1 (see app.js).

import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
