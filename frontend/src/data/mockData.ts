// Mock Data for DSA Dashboard
import type { ModerationEntry, KPIStats } from './types';
import type { FilterOptions, FetchEntriesResponse } from './dataService';
import { PLATFORMS, CATEGORIES, DECISION_TYPES, DECISION_GROUNDS, CONTENT_TYPES, EU_COUNTRIES } from './types';

// Generate a random date within a range
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// Generate a random element from an array
function randomElement<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate random EU countries array
function randomCountries(count: number = 3): string[] {
  const shuffled = [...EU_COUNTRIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(c => c.code);
}

// Generate a single mock moderation entry
function generateMockEntry(id: number): ModerationEntry {
  const applicationDateStr = randomDate(new Date('2024-01-01'), new Date('2025-12-31'));
  const applicationDate = new Date(applicationDateStr);
  const contentDateStr = randomDate(new Date('2023-01-01'), applicationDate);
  const delayDays = Math.floor((applicationDate.getTime() - new Date(contentDateStr).getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: `mock-${id}`,
    application_date: applicationDateStr,
    content_date: contentDateStr,
    platform_name: randomElement(PLATFORMS),
    category: randomElement(CATEGORIES),
    decision_type: randomElement(DECISION_TYPES),
    decision_ground: randomElement(DECISION_GROUNDS),
    incompatible_content_ground: Math.random() > 0.3 ? `Ground ${Math.floor(Math.random() * 10)}` : null,
    content_type: randomElement(CONTENT_TYPES),
    automated_detection: Math.random() > 0.4,
    automated_decision: Math.random() > 0.5,
    country: randomElement(EU_COUNTRIES).code,
    territorial_scope: randomCountries(Math.floor(Math.random() * 5) + 1),
    language: randomElement(EU_COUNTRIES).lang,
    delay_days: delayDays
  };
}

// Generate mock data array (5000 entries for realistic testing)
const MOCK_ENTRIES: ModerationEntry[] = Array.from({ length: 5000 }, (_, i) => generateMockEntry(i + 1));

// Apply filters to mock data
function applyFilters(entries: ModerationEntry[], filters?: {
  dateRange?: { start: string; end: string };
  platforms?: string[];
  categories?: string[];
  decisionTypes?: string[];
  decisionGrounds?: string[];
  countries?: string[];
  contentTypes?: string[];
  automatedDetection?: boolean | null;
  automatedDecision?: boolean | null;
}): ModerationEntry[] {
  let filtered = [...entries];

  if (filters?.dateRange) {
    filtered = filtered.filter(entry => {
      const appDate = new Date(entry.application_date);
      const start = new Date(filters.dateRange!.start);
      const end = new Date(filters.dateRange!.end);
      return appDate >= start && appDate <= end;
    });
  }

  if (filters?.platforms && filters.platforms.length > 0) {
    filtered = filtered.filter(entry => filters.platforms!.includes(entry.platform_name));
  }

  if (filters?.categories && filters.categories.length > 0) {
    filtered = filtered.filter(entry => filters.categories!.includes(entry.category));
  }

  if (filters?.decisionTypes && filters.decisionTypes.length > 0) {
    filtered = filtered.filter(entry => filters.decisionTypes!.includes(entry.decision_type));
  }

  if (filters?.decisionGrounds && filters.decisionGrounds.length > 0) {
    filtered = filtered.filter(entry => filters.decisionGrounds!.includes(entry.decision_ground));
  }

  if (filters?.countries && filters.countries.length > 0) {
    filtered = filtered.filter(entry => filters.countries!.includes(entry.country));
  }

  if (filters?.contentTypes && filters.contentTypes.length > 0) {
    filtered = filtered.filter(entry => filters.contentTypes!.includes(entry.content_type));
  }

  if (filters?.automatedDetection !== undefined && filters?.automatedDetection !== null) {
    filtered = filtered.filter(entry => entry.automated_detection === filters.automatedDetection);
  }

  if (filters?.automatedDecision !== undefined && filters?.automatedDecision !== null) {
    filtered = filtered.filter(entry => entry.automated_decision === filters.automatedDecision);
  }

  return filtered;
}

// Calculate KPI stats from filtered data
function calculateStats(entries: ModerationEntry[]): KPIStats {
  const totalActions = entries.length;
  const platforms = new Set(entries.map(e => e.platform_name));
  const countries = new Set(entries.map(e => e.country));
  
  const delays = entries.map(e => e.delay_days).filter(d => d !== null && d >= 0);
  const averageDelay = delays.length > 0 
    ? delays.reduce((sum, d) => sum + d, 0) / delays.length 
    : 0;

  const automatedDetectionCount = entries.filter(e => e.automated_detection).length;
  const automatedDecisionCount = entries.filter(e => e.automated_decision).length;

  return {
    totalActions,
    platformCount: platforms.size,
    averageDelay: Math.round(averageDelay * 10) / 10,
    automatedDetectionRate: totalActions > 0 ? Math.round((automatedDetectionCount / totalActions) * 100 * 10) / 10 : 0,
    automatedDecisionRate: totalActions > 0 ? Math.round((automatedDecisionCount / totalActions) * 100 * 10) / 10 : 0,
    countryCount: countries.size
  };
}

// Extract unique filter options from mock data
export function getMockFilterOptions(): FilterOptions {
  const platforms = [...new Set(MOCK_ENTRIES.map(e => e.platform_name))];
  const categories = [...new Set(MOCK_ENTRIES.map(e => e.category))];
  const decisionTypes = [...new Set(MOCK_ENTRIES.map(e => e.decision_type))];
  const decisionGrounds = [...new Set(MOCK_ENTRIES.map(e => e.decision_ground))];
  const countries = [...new Set(MOCK_ENTRIES.map(e => e.country))];
  const contentTypes = [...new Set(MOCK_ENTRIES.map(e => e.content_type))];
  const languages = [...new Set(MOCK_ENTRIES.map(e => e.language))];

  return {
    platforms: platforms.sort(),
    categories: categories.sort(),
    decisionTypes: decisionTypes.sort(),
    decisionGrounds: decisionGrounds.sort(),
    countries: countries.sort(),
    contentTypes: contentTypes.sort(),
    languages: languages.sort()
  };
}

// Fetch mock moderation data with filters and pagination
export function fetchMockModerationData(
  filters?: {
    dateRange?: { start: string; end: string };
    platforms?: string[];
    categories?: string[];
    decisionTypes?: string[];
    decisionGrounds?: string[];
    countries?: string[];
    contentTypes?: string[];
    automatedDetection?: boolean | null;
    automatedDecision?: boolean | null;
  },
  page = 1,
  limit = 1000
): Promise<FetchEntriesResponse> {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = applyFilters(MOCK_ENTRIES, filters);
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = filtered.slice(startIndex, endIndex);

      resolve({
        data: paginatedData,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    }, 300); // 300ms delay to simulate API call
  });
}

// Fetch mock stats
export function fetchMockStats(
  filters?: {
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
): Promise<KPIStats> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = applyFilters(MOCK_ENTRIES, filters);
      const stats = calculateStats(filtered);
      resolve(stats);
    }, 200); // 200ms delay
  });
}

