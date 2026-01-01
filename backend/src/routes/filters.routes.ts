import { Router } from 'express';
import * as filtersController from '../controllers/filters.controller.js';

const router = Router();

// GET /api/filters - Get all available filter options
router.get('/', filtersController.getFilterOptions);

export default router;

