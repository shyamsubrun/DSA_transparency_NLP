import { Request, Response } from 'express';
import { verifyDataCompleteness } from '../services/verification.service.js';

export async function getDataVerification(req: Request, res: Response) {
  try {
    const report = await verifyDataCompleteness();
    res.json(report);
  } catch (error: any) {
    console.error('Error verifying data completeness:', error);
    res.status(500).json({
      error: 'Failed to verify data completeness',
      message: error.message
    });
  }
}

