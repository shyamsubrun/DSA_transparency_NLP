import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();

// POST /api/analytics/custom-chart - Natural language to chart
router.post('/custom-chart', analyticsController.generateCustomChart);

export default router;
