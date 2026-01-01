import { Request, Response } from 'express';
import * as moderationService from '../services/moderation.service.js';

export async function getFilterOptions(req: Request, res: Response) {
  try {
    const filterOptions = await moderationService.getFilterOptions();
    res.json(filterOptions);
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ 
      error: 'Failed to fetch filter options',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

