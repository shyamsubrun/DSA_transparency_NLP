// Data Service - Mock Data Mode (no backend API calls)
// 
// This service can work in two modes:
// 1. Mock Data Mode (USE_MOCK_DATA = true): Uses generated mock data, no backend required
// 2. API Mode (USE_MOCK_DATA = false): Fetches data from the backend API
//
// To switch modes, change the USE_MOCK_DATA constant below.
//
// Mock volume (optional): VITE_MOCK_DATA_SIZE = sample row count (max 200k in mockData.ts).
// To align KPI/charts with a target total (e.g. ~17M rows in the report) without loading
// 17M objects in the browser, set VITE_MOCK_TARGET_TOTAL=17000000 (or VITE_MOCK_VOLUME_SCALE).
//
import type { ModerationEntry } from './types';
import type { ChartPlanApiResponse, CustomChartResponse } from './chartPlanTypes';
import {
  fetchMockModerationData,
  fetchMockStats,
  getFilteredMockEntries,
  getMockFilterOptions,
  MOCK_DATA_SIZE,
} from './mockData';
import { aggregateMockEntries, buildMockCustomChartResponse } from './mockCustomChart';

// true = mock data + chart-plan path; false = real API. Default true if unset (aligns with Docker image default).
const USE_MOCK_DATA = (import.meta.env.VITE_USE_MOCK_DATA ?? 'true') === 'true';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/** Page size for dashboard row fetch. In mock mode, load the full synthetic set so charts match KPIs (see VITE_MOCK_DATA_SIZE). */
export const MODERATION_ENTRIES_LIMIT = USE_MOCK_DATA ? MOCK_DATA_SIZE : 1000;

export interface FetchEntriesResponse {
  data: ModerationEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FilterOptions {
  platforms: string[];
  categories: string[];
  decisionTypes: string[];
  decisionGrounds: string[];
  countries: string[];
  contentTypes: string[];
  languages: string[];
}

export interface KPIStats {
  totalActions: number;
  platformCount: number;
  averageDelay: number;
  automatedDetectionRate: number;
  automatedDecisionRate: number;
  countryCount: number;
}

interface Filters {
  dateRange?: { start: string; end: string };
  platforms?: string[];
  categories?: string[];
  decisionTypes?: string[];
  decisionGrounds?: string[];
  countries?: string[];
  contentTypes?: string[];
  automatedDetection?: boolean | null;
  automatedDecision?: boolean | null;
}

export interface CustomChartRequest {
  prompt: string;
  filters?: Filters;
}

export type { CustomChartResponse } from './chartPlanTypes';

/**
 * Fetch moderation data with filters and pagination
 */
export async function fetchModerationData(
  filters?: Filters,
  page = 1,
  limit = 1000
): Promise<FetchEntriesResponse> {
  // Use mock data if enabled
  if (USE_MOCK_DATA) {
    return fetchMockModerationData(filters, page, limit);
  }

  // Real API call
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  if (filters?.dateRange) {
    params.append('startDate', filters.dateRange.start);
    params.append('endDate', filters.dateRange.end);
  }

  if (filters?.platforms && filters.platforms.length > 0) {
    filters.platforms.forEach(p => params.append('platforms', p));
  }

  if (filters?.categories && filters.categories.length > 0) {
    filters.categories.forEach(c => params.append('categories', c));
  }

  if (filters?.decisionTypes && filters.decisionTypes.length > 0) {
    filters.decisionTypes.forEach(dt => params.append('decisionTypes', dt));
  }

  if (filters?.decisionGrounds && filters.decisionGrounds.length > 0) {
    filters.decisionGrounds.forEach(dg => params.append('decisionGrounds', dg));
  }

  if (filters?.countries && filters.countries.length > 0) {
    filters.countries.forEach(c => params.append('countries', c));
  }

  if (filters?.contentTypes && filters.contentTypes.length > 0) {
    filters.contentTypes.forEach(ct => params.append('contentTypes', ct));
  }

  if (filters?.automatedDetection !== undefined && filters?.automatedDetection !== null) {
    params.append('automatedDetection', String(filters.automatedDetection));
  }

  if (filters?.automatedDecision !== undefined && filters?.automatedDecision !== null) {
    params.append('automatedDecision', String(filters.automatedDecision));
  }

  const response = await fetch(`${API_BASE_URL}/moderation?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch moderation data: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch filter options
 */
export async function fetchFilterOptions(): Promise<FilterOptions> {
  // Use mock data if enabled
  if (USE_MOCK_DATA) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockFilterOptions());
      }, 100); // Small delay to simulate API call
    });
  }

  // Real API call
  const response = await fetch(`${API_BASE_URL}/filters`);
  if (!response.ok) {
    throw new Error(`Failed to fetch filter options: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch KPI statistics
 */
export async function fetchStats(filters?: Filters): Promise<KPIStats> {
  // Use mock data if enabled
  if (USE_MOCK_DATA) {
    return fetchMockStats(filters);
  }

  // Real API call
  const params = new URLSearchParams();

  if (filters?.dateRange) {
    params.append('startDate', filters.dateRange.start);
    params.append('endDate', filters.dateRange.end);
  }

  if (filters?.platforms && filters.platforms.length > 0) {
    filters.platforms.forEach(p => params.append('platforms', p));
  }

  if (filters?.categories && filters.categories.length > 0) {
    filters.categories.forEach(c => params.append('categories', c));
  }

  const response = await fetch(`${API_BASE_URL}/moderation/stats?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate a custom chart from natural language prompt
 */
export async function fetchCustomChart(
  prompt: string,
  filters?: Filters,
): Promise<CustomChartResponse> {
  const started = Date.now();

  // Mock KPIs are local; GPT plan still requires the backend (OPENAI_API_KEY server-side).
  if (USE_MOCK_DATA) {
    const planRes = await fetch(`${API_BASE_URL}/analytics/chart-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, filters }),
    });

    if (!planRes.ok) {
      const errorData = await planRes.json().catch(() => ({}));
      throw new Error(
        (errorData as { message?: string }).message ||
          (errorData as { error?: string }).error ||
          `Failed to get chart plan: ${planRes.statusText}`,
      );
    }

    const body = (await planRes.json()) as ChartPlanApiResponse;
    const filtered = getFilteredMockEntries(filters);
    const rows = aggregateMockEntries(filtered, body.plan);
    return buildMockCustomChartResponse(body.plan, rows, {
      planCached: body.cached,
      totalDurationMs: Date.now() - started,
    });
  }

  const response = await fetch(`${API_BASE_URL}/analytics/custom-chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, filters }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.message ||
        errorData?.error ||
        `Failed to generate chart: ${response.statusText}`,
    );
  }

  return response.json();
}
