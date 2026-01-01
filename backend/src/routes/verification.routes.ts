import { Router } from 'express';
import * as verificationController from '../controllers/verification.controller.js';

const router = Router();

// GET /api/verification - Get data completeness verification report
router.get('/', verificationController.getDataVerification);

export default router;

