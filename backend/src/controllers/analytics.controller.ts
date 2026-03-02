import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service.js';
import type { AnalyticsFilters } from '../types/analytics.types.js';

function sanitizeArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeFilters(raw: unknown): AnalyticsFilters | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const f = raw as Record<string, unknown>;
  const dateRange =
    f.dateRange && typeof f.dateRange === 'object'
      ? {
          start: String((f.dateRange as Record<string, unknown>).start || ''),
          end: String((f.dateRange as Record<string, unknown>).end || ''),
        }
      : undefined;

  return {
    dateRange: dateRange?.start && dateRange.end ? dateRange : undefined,
    platforms: sanitizeArray(f.platforms),
    categories: sanitizeArray(f.categories),
    decisionTypes: sanitizeArray(f.decisionTypes),
    decisionGrounds: sanitizeArray(f.decisionGrounds),
    countries: sanitizeArray(f.countries),
    contentTypes: sanitizeArray(f.contentTypes),
    automatedDetection:
      typeof f.automatedDetection === 'boolean' ? f.automatedDetection : null,
    automatedDecision:
      typeof f.automatedDecision === 'boolean' ? f.automatedDecision : null,
  };
}

export async function generateCustomChart(req: Request, res: Response) {
  const startedAt = Date.now();
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const filters = sanitizeFilters(req.body?.filters);
    const result = await analyticsService.generateCustomChart({ prompt, filters });
    res.json(result);
  } catch (error) {
    console.error('[analytics] generateCustomChart error', error);
    res.status(500).json({
      error: 'Failed to generate custom chart',
      message: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startedAt,
    });
  }
}
