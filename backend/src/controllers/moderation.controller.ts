import { Request, Response } from 'express';
import * as moderationService from '../services/moderation.service.js';

export async function getModerationEntries(req: Request, res: Response) {
  try {
    const { 
      page = '1', 
      limit = '1000',
      startDate,
      endDate,
      platforms,
      categories,
      decisionTypes,
      decisionGrounds,
      countries,
      contentTypes,
      automatedDetection,
      automatedDecision
    } = req.query;

    const filters: any = {};

    if (startDate && endDate) {
      filters.dateRange = { 
        start: startDate as string, 
        end: endDate as string 
      };
    }

    // Handle array parameters
    if (platforms) {
      filters.platforms = Array.isArray(platforms) ? platforms : [platforms];
    }

    if (categories) {
      filters.categories = Array.isArray(categories) ? categories : [categories];
    }

    if (decisionTypes) {
      filters.decisionTypes = Array.isArray(decisionTypes) ? decisionTypes : [decisionTypes];
    }

    if (decisionGrounds) {
      filters.decisionGrounds = Array.isArray(decisionGrounds) ? decisionGrounds : [decisionGrounds];
    }

    if (countries) {
      filters.countries = Array.isArray(countries) ? countries : [countries];
    }

    if (contentTypes) {
      filters.contentTypes = Array.isArray(contentTypes) ? contentTypes : [contentTypes];
    }

    if (automatedDetection !== undefined) {
      filters.automatedDetection = automatedDetection === 'true';
    }

    if (automatedDecision !== undefined) {
      filters.automatedDecision = automatedDecision === 'true';
    }

    const result = await moderationService.getEntries({
      page: Number(page),
      limit: Number(limit),
      filters: Object.keys(filters).length > 0 ? filters : undefined
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching moderation entries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch moderation entries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function getModerationStats(req: Request, res: Response) {
  try {
    const { 
      startDate,
      endDate,
      platforms,
      categories
    } = req.query;

    const filters: any = {};

    if (startDate && endDate) {
      filters.dateRange = { 
        start: startDate as string, 
        end: endDate as string 
      };
    }

    if (platforms) {
      filters.platforms = Array.isArray(platforms) ? platforms : [platforms];
    }

    if (categories) {
      filters.categories = Array.isArray(categories) ? categories : [categories];
    }

    const stats = await moderationService.getStats(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

