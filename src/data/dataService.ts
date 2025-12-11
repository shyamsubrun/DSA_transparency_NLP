// Data Service - Abstraction layer for API calls
// This file makes it easy to swap mock data with real API calls

import type { ModerationEntry } from './types';
import { 
  mockData,
  uniquePlatforms,
  uniqueCategories,
  uniqueDecisionTypes,
  uniqueDecisionGrounds,
  uniqueCountries,
  uniqueContentTypes,
  uniqueLanguages
} from './mockData';

// Simulated network delay for realistic behavior
const SIMULATED_DELAY = 300;

async function simulateDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
}

/**
 * Fetch all moderation data
 * TODO: Replace with real API call: fetch('/api/moderation')
 */
export async function fetchModerationData(): Promise<ModerationEntry[]> {
  await simulateDelay();
  // TODO: Replace with:
  // const response = await fetch('/api/moderation');
  // return response.json();
  return mockData;
}

/**
 * Fetch filter options (unique values)
 * TODO: Replace with real API call: fetch('/api/filters')
 */
export async function fetchFilterOptions(): Promise<{
  platforms: string[];
  categories: string[];
  decisionTypes: string[];
  decisionGrounds: string[];
  countries: string[];
  contentTypes: string[];
  languages: string[];
}> {
  await simulateDelay();
  // TODO: Replace with:
  // const response = await fetch('/api/filters');
  // return response.json();
  return {
    platforms: uniquePlatforms,
    categories: uniqueCategories,
    decisionTypes: uniqueDecisionTypes,
    decisionGrounds: uniqueDecisionGrounds,
    countries: uniqueCountries,
    contentTypes: uniqueContentTypes,
    languages: uniqueLanguages
  };
}

/**
 * Fetch data with server-side filtering
 * TODO: Implement when backend supports filtering
 */
export async function fetchFilteredData(filters: {
  dateRange?: { start: string; end: string };
  platforms?: string[];
  categories?: string[];
  decisionTypes?: string[];
  decisionGrounds?: string[];
  countries?: string[];
  contentTypes?: string[];
  automatedDetection?: boolean;
  automatedDecision?: boolean;
}): Promise<ModerationEntry[]> {
  await simulateDelay();
  
  // TODO: Replace with:
  // const params = new URLSearchParams();
  // Object.entries(filters).forEach(([key, value]) => {
  //   if (value !== undefined) params.append(key, JSON.stringify(value));
  // });
  // const response = await fetch(`/api/moderation?${params}`);
  // return response.json();
  
  // For now, filter client-side
  let filtered = [...mockData];
  
  if (filters.dateRange) {
    filtered = filtered.filter(d => 
      d.application_date >= filters.dateRange!.start &&
      d.application_date <= filters.dateRange!.end
    );
  }
  
  if (filters.platforms?.length) {
    filtered = filtered.filter(d => filters.platforms!.includes(d.platform_name));
  }
  
  if (filters.categories?.length) {
    filtered = filtered.filter(d => filters.categories!.includes(d.category));
  }
  
  if (filters.decisionTypes?.length) {
    filtered = filtered.filter(d => filters.decisionTypes!.includes(d.decision_type));
  }
  
  if (filters.decisionGrounds?.length) {
    filtered = filtered.filter(d => filters.decisionGrounds!.includes(d.decision_ground));
  }
  
  if (filters.countries?.length) {
    filtered = filtered.filter(d => filters.countries!.includes(d.country));
  }
  
  if (filters.contentTypes?.length) {
    filtered = filtered.filter(d => filters.contentTypes!.includes(d.content_type));
  }
  
  if (filters.automatedDetection !== undefined) {
    filtered = filtered.filter(d => d.automated_detection === filters.automatedDetection);
  }
  
  if (filters.automatedDecision !== undefined) {
    filtered = filtered.filter(d => d.automated_decision === filters.automatedDecision);
  }
  
  return filtered;
}

