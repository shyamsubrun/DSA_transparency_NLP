import { Router } from 'express';
import * as moderationController from '../controllers/moderation.controller.js';

const router = Router();

// GET /api/moderation - Get moderation entries with filters and pagination
router.get('/', moderationController.getModerationEntries);

// GET /api/moderation/stats - Get KPI statistics
router.get('/stats', moderationController.getModerationStats);

export default router;

