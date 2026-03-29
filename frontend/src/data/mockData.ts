// Mock Data for DSA Dashboard
import type { ModerationEntry, KPIStats } from './types';
import type { FilterOptions, FetchEntriesResponse } from './dataService';
import { PLATFORMS, CATEGORIES, DECISION_TYPES, DECISION_GROUNDS, CONTENT_TYPES, EU_COUNTRIES } from './types';

const MIN_MOCK_ROWS = 500;
const MAX_MOCK_ROWS = 200_000;

/** Number of synthetic rows (Vite bake). Default 5000; clamp MIN–MAX (see MAX_MOCK_ROWS). */
function parseMockDataSize(): number {
  const raw = import.meta.env.VITE_MOCK_DATA_SIZE;
  const fallback = 5000;
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_MOCK_ROWS, Math.max(MIN_MOCK_ROWS, n));
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
 * Platform shares (order = PLATFORMS): tier-1 social/video, mid-tier networks, tail incl. e-commerce.
 * Weights sum ~100 for easy mental model; not uniform.
 */
const PLATFORM_WEIGHTS: readonly number[] = [
  22, // Meta
  20, // TikTok
  18, // YouTube
  12, // X
  10, // LinkedIn
  8, // Snapchat
  6, // Pinterest
  4, // Amazon
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

/**
 * EU MS base weights (same order as EU_COUNTRIES): population / market-size–inspired spread,
 * not flat — big five + gradual tail so maps and country charts stay readable.
 */
const EU_COUNTRY_WEIGHTS: readonly number[] = [
  200, 175, 160, 140, 125, // DE FR IT ES PL
  58, 48, 42, 40, 38, 36, 34, 32, // RO NL BE GR CZ PT SE HU
  28, 24, 22, 21, 20, 22, 18, // AT BG DK FI SK IE HR
  14, 12, 10, 9, 7, 5, 4, // LT SI LV EE CY LU MT
];

/** Per-platform multipliers on EU_COUNTRY_WEIGHTS so country ∋ platform is plausible (e.g. Amazon → large economies). */
function countryWeightsForPlatform(platformIndex: number): number[] {
  const w = EU_COUNTRY_WEIGHTS.map((v) => v);
  const mul = (indices: readonly number[], factor: number) => {
    for (const i of indices) {
      if (i >= 0 && i < w.length) w[i] *= factor;
    }
  };

  switch (platformIndex) {
    case 0: // Meta — broad footprint; slight lift big five
      mul([0, 1, 2, 3, 4], 1.12);
      mul([25, 26], 0.78);
      break;
    case 1: // TikTok — strong southern + CEE youth skew
      mul([3, 2, 1, 5, 11, 10, 12], 1.2);
      mul([25, 26], 0.8);
      break;
    case 2: // X — news / urban languages
      mul([1, 0, 3, 2, 18], 1.18);
      break;
    case 3: // YouTube — very broad; lift top markets slightly
      mul([0, 1, 2, 3, 4], 1.1);
      break;
    case 4: // LinkedIn — IE + Benelux + Nordics + DE/FR professional hubs
      mul([18, 6, 0, 1, 15, 11, 16, 7], 1.32);
      mul([25, 26, 24], 0.75);
      break;
    case 5: // Snapchat — younger skew Nordics / Benelux
      mul([11, 6, 7, 15, 16, 17], 1.22);
      break;
    case 6: // Pinterest — DE/FR/IT core EU shopping
      mul([0, 1, 2, 3], 1.18);
      mul([22, 23, 26], 0.85);
      break;
    case 7: // Amazon — e-commerce volume in largest economies
      mul([0, 1, 2, 3, 4], 1.42);
      mul([20, 21, 22, 23, 24, 25, 26], 0.72);
      break;
    default:
      break;
  }

  return w;
}

function pickCountryForPlatform(platformIndex: number) {
  return EU_COUNTRIES[weightedPickIndex(countryWeightsForPlatform(platformIndex))];
}

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

/** Country from global EU distribution (territorial_scope extras, etc.). */
function randomCountryEntryGlobal() {
  return EU_COUNTRIES[weightedPickIndex(EU_COUNTRY_WEIGHTS)];
}

// Generate random EU countries array (primary country weighted; extras for diversity)
function randomCountries(primaryCode: string, count: number = 3): string[] {
  const codes = new Set<string>([primaryCode]);
  while (codes.size < Math.min(count, EU_COUNTRIES.length)) {
    codes.add(randomCountryEntryGlobal().code);
  }
  return [...codes];
}

// Generate a single mock moderation entry
function generateMockEntry(id: number): ModerationEntry {
  const platform_name = weightedPick(PLATFORMS, PLATFORM_WEIGHTS);
  const pi = PLATFORMS.indexOf(platform_name);
  const category = weightedPick(CATEGORIES, CATEGORY_WEIGHTS);

  const { start: windowStart, end: windowEnd } = getMockDateWindow();
  const applicationDateStr = randomDate(windowStart, windowEnd);
  const applicationDate = new Date(applicationDateStr);
  const contentDateStr = randomDate(windowStart, applicationDate);
  const baseDelayDays = Math.floor(
    (applicationDate.getTime() - new Date(contentDateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
  const ci = CATEGORIES.indexOf(category);
  const platformScale = 0.42 + ((pi + 5) % 8) * 0.11 + Math.random() * 0.38;
  const categoryScale = 0.38 + ((ci + 3) % 12) * 0.07 + Math.random() * 0.42;
  const jitterDays = (Math.random() - 0.5) * 110;
  const delayDays = Math.max(
    0,
    Math.min(850, Math.round(baseDelayDays * platformScale * categoryScale + jitterDays)),
  );

  const countryEntry = pickCountryForPlatform(pi);
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

