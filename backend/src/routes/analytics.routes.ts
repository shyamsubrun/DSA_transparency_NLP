import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();

// POST /api/analytics/chart-plan - GPT aggregation plan for mock data (no DB)
router.post('/chart-plan', analyticsController.generateChartPlan);

// POST /api/analytics/custom-chart - Natural language to chart
router.post('/custom-chart', analyticsController.generateCustomChart);

export default router;
