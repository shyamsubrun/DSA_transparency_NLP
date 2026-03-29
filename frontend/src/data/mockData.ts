// Mock Data for DSA Dashboard
import type { ModerationEntry, KPIStats } from './types';
import type { FilterOptions, FetchEntriesResponse } from './dataService';
import { PLATFORMS, CATEGORIES, DECISION_TYPES, DECISION_GROUNDS, CONTENT_TYPES, EU_COUNTRIES } from './types';

/** Number of synthetic rows (Vite bake). Default 5000; clamp 500–50000. */
function parseMockDataSize(): number {
  const raw = import.meta.env.VITE_MOCK_DATA_SIZE;
  const fallback = 5000;
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(50_000, Math.max(500, n));
}

export const MOCK_DATA_SIZE = parseMockDataSize();

/** Pick index using weights (same length as items). Heavier = more frequent. */
function weightedPickIndex(weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
  return items[weightedPickIndex(weights)] as T;
}

/**
 * Platform shares (order = PLATFORMS): large networks dominate; niche / e-commerce tail.
 * Not uniform — charts show realistic imbalance.
 */
const PLATFORM_WEIGHTS: readonly number[] = [
  26, // Meta
  20, // TikTok
  11, // X
  24, // YouTube
  7, // LinkedIn
  6, // Snapchat
  4, // Pinterest
  2, // Amazon
];

/** Categories: common policy areas vs rarer severities (order = CATEGORIES). */
const CATEGORY_WEIGHTS: readonly number[] = [
  11, 14, 16, 9, 10, 4, 7, 8, 9, 12, 6, 4,
];

/** Decision types: removals & restrictions more frequent than geo-block (order = DECISION_TYPES). */
const DECISION_TYPE_WEIGHTS: readonly number[] = [28, 18, 12, 8, 14, 10, 10];

/** Content types: video/text heavy (order = CONTENT_TYPES). */
const CONTENT_TYPE_WEIGHTS: readonly number[] = [20, 22, 18, 7, 9, 4];

/** Grounds: ToS / illegal content more often than niche legal bases (order = DECISION_GROUNDS). */
const DECISION_GROUND_WEIGHTS: readonly number[] = [22, 24, 8, 6, 10, 7, 9, 8, 14, 12];

/** EU countries by index in EU_COUNTRIES: larger MS weight more than small MS. */
const EU_COUNTRY_WEIGHTS: readonly number[] = EU_COUNTRIES.map((_, i) => {
  if (i < 5) return 14 - Math.floor(i * 0.5); // DE FR IT ES PL
  if (i < 12) return 6;
  if (i < 20) return 4;
  return 2;
});

// Generate a random date within a range
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

/** Sliding window for mock rows: application and content dates only in the last 6 months. */
function getMockDateWindow(): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setMonth(start.getMonth() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function randomCountryEntry() {
  return EU_COUNTRIES[weightedPickIndex(EU_COUNTRY_WEIGHTS)];
}

// Generate random EU countries array (primary country weighted; extras for diversity)
function randomCountries(primaryCode: string, count: number = 3): string[] {
  const codes = new Set<string>([primaryCode]);
  while (codes.size < Math.min(count, EU_COUNTRIES.length)) {
    codes.add(randomCountryEntry().code);
  }
  return [...codes];
}

// Generate a single mock moderation entry
function generateMockEntry(id: number): ModerationEntry {
  const platform_name = weightedPick(PLATFORMS, PLATFORM_WEIGHTS);
  const category = weightedPick(CATEGORIES, CATEGORY_WEIGHTS);

  const { start: windowStart, end: windowEnd } = getMockDateWindow();
  const applicationDateStr = randomDate(windowStart, windowEnd);
  const applicationDate = new Date(applicationDateStr);
  const contentDateStr = randomDate(windowStart, applicationDate);
  const baseDelayDays = Math.floor(
    (applicationDate.getTime() - new Date(contentDateStr).getTime()) / (1000 * 60 * 60 * 24),
  );

  const pi = PLATFORMS.indexOf(platform_name);
  const ci = CATEGORIES.indexOf(category);
  const platformScale = 0.42 + ((pi + 5) % 8) * 0.11 + Math.random() * 0.38;
  const categoryScale = 0.38 + ((ci + 3) % 12) * 0.07 + Math.random() * 0.42;
  const jitterDays = (Math.random() - 0.5) * 110;
  const delayDays = Math.max(
    0,
    Math.min(850, Math.round(baseDelayDays * platformScale * categoryScale + jitterDays)),
  );

  const countryEntry = randomCountryEntry();
  const scopeCount = Math.floor(Math.random() * 5) + 1;

  return {
    id: `mock-${id}`,
    application_date: applicationDateStr,
    content_date: contentDateStr,
    platform_name,
    category,
    decision_type: weightedPick(DECISION_TYPES, DECISION_TYPE_WEIGHTS),
    decision_ground: weightedPick(DECISION_GROUNDS, DECISION_GROUND_WEIGHTS),
    incompatible_content_ground: Math.random() > 0.35 ? `Ground ${Math.floor(Math.random() * 12)}` : null,
    content_type: weightedPick(CONTENT_TYPES, CONTENT_TYPE_WEIGHTS),
    automated_detection: Math.random() > 0.38,
    automated_decision: Math.random() > 0.48,
    country: countryEntry.code,
    territorial_scope: randomCountries(countryEntry.code, scopeCount),
    language: countryEntry.lang,
    delay_days: delayDays
  };
}

const MOCK_ENTRIES: ModerationEntry[] = Array.from({ length: MOCK_DATA_SIZE }, (_, i) =>
  generateMockEntry(i + 1),
);

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

/** Full mock dataset filtered like other mock APIs (for custom chart aggregation). */
export function getFilteredMockEntries(filters?: {
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
  return applyFilters(MOCK_ENTRIES, filters);
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

