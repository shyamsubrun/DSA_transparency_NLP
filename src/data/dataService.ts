// Data Service - API calls to backend
import type { ModerationEntry } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

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

/**
 * Fetch moderation data with filters and pagination
 */
export async function fetchModerationData(
  filters?: Filters,
  page = 1,
  limit = 1000
): Promise<FetchEntriesResponse> {
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
