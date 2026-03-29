import type {
  AnalyticsFilters,
  ChartAggregationPlan,
  ChartAggregationConstraints,
  ChartPlanApiResponse,
  MockAggregationChartType,
  MockChartDimension,
} from '../types/analytics.types.js';

const CACHE_TTL_MS = Number(process.env.ANALYTICS_CACHE_TTL_MS || 2 * 60 * 1000);
const CACHE_SCHEMA_VERSION = 'v2-constraints';
const MAX_TOP_N = 50;
const DEFAULT_TOP_N = 20;
const MAX_CONSTRAINT_VALUES = 25;

const MOCK_DIMENSIONS = new Set<string>([
  'month',
  'platform_name',
  'country',
  'category',
  'decision_type',
  'decision_ground',
  'content_type',
  'language',
  'automated_detection',
  'automated_decision',
]);

const AGGREGATION_CHART_TYPES = new Set<string>(['line', 'bar', 'pie', 'heatmap']);

const PLATFORM_ALIASES: Array<{ aliases: string[]; canonical: string }> = [
  { aliases: ['tiktok', 'tik tok'], canonical: 'TikTok' },
  { aliases: ['youtube', 'you tube'], canonical: 'YouTube' },
  { aliases: ['instagram', 'insta'], canonical: 'Instagram' },
  { aliases: ['facebook', 'meta'], canonical: 'Facebook' },
  { aliases: ['linkedin', 'linked in'], canonical: 'LinkedIn' },
  { aliases: ['xvideos', 'x-videos'], canonical: 'XVideos' },
  { aliases: ['amazon store', 'amazon'], canonical: 'Amazon Store' },
  { aliases: ['aliexpress', 'ali express'], canonical: 'AliExpress' },
  { aliases: ['pornhub', 'porn hub'], canonical: 'Pornhub' },
  { aliases: ['snapchat', 'snap chat'], canonical: 'Snapchat' },
  { aliases: ['reddit'], canonical: 'Reddit' },
  { aliases: ['temu'], canonical: 'Temu' },
  { aliases: ['shein'], canonical: 'Shein' },
  { aliases: ['xnxx'], canonical: 'XNXX' },
  // "x" alone is too ambiguous; keep explicit "twitter" and contextual "platform x" detection.
  { aliases: ['twitter'], canonical: 'X' },
];

const COUNTRY_ALIASES: Array<{ aliases: string[]; canonical: string }> = [
  { aliases: ['france', 'francais'], canonical: 'FR' },
  { aliases: ['allemagne', 'germany', 'deutschland'], canonical: 'DE' },
  { aliases: ['italie', 'italy'], canonical: 'IT' },
  { aliases: ['espagne', 'spain'], canonical: 'ES' },
  { aliases: ['pologne', 'poland'], canonical: 'PL' },
  { aliases: ['roumanie', 'romania'], canonical: 'RO' },
  { aliases: ['pays-bas', 'netherlands'], canonical: 'NL' },
  { aliases: ['portugal'], canonical: 'PT' },
  { aliases: ['grece', 'greece'], canonical: 'GR' },
  { aliases: ['suede', 'sweden'], canonical: 'SE' },
  { aliases: ['belgique', 'belgium'], canonical: 'BE' },
  { aliases: ['tchequie', 'czech'], canonical: 'CZ' },
  { aliases: ['hongrie', 'hungary'], canonical: 'HU' },
  { aliases: ['autriche', 'austria'], canonical: 'AT' },
  { aliases: ['bulgarie', 'bulgaria'], canonical: 'BG' },
  { aliases: ['irlande', 'ireland'], canonical: 'IE' },
  { aliases: ['finlande', 'finland'], canonical: 'FI' },
  { aliases: ['danemark', 'denmark'], canonical: 'DK' },
  { aliases: ['slovaquie', 'slovakia'], canonical: 'SK' },
  { aliases: ['croatie', 'croatia'], canonical: 'HR' },
];

const COUNTRY_CODES = new Set(COUNTRY_ALIASES.map((entry) => entry.canonical));

const cache = new Map<string, { expiresAt: number; value: ChartAggregationPlan }>();

function cleanupCache(now: number): void {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ');
}

function normalizeFilters(filters?: AnalyticsFilters): AnalyticsFilters | undefined {
  if (!filters) return undefined;
  return {
    ...filters,
    dateRange: filters.dateRange ?? undefined,
    platforms: filters.platforms?.filter(Boolean) ?? [],
    categories: filters.categories?.filter(Boolean) ?? [],
    decisionTypes: filters.decisionTypes?.filter(Boolean) ?? [],
    decisionGrounds: filters.decisionGrounds?.filter(Boolean) ?? [],
    countries: filters.countries?.filter(Boolean) ?? [],
    contentTypes: filters.contentTypes?.filter(Boolean) ?? [],
    automatedDetection: filters.automatedDetection ?? null,
    automatedDecision: filters.automatedDecision ?? null,
  };
}

function normalizeConstraintValues(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const cleaned = raw
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!cleaned.length) return undefined;
  return [...new Set(cleaned)].slice(0, MAX_CONSTRAINT_VALUES);
}

function normalizeConstraints(raw: unknown): ChartAggregationConstraints | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const constraints: ChartAggregationConstraints = {};
  for (const [dimension, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!MOCK_DIMENSIONS.has(dimension) || !value || typeof value !== 'object') {
      continue;
    }
    const include = normalizeConstraintValues((value as Record<string, unknown>).include);
    const exclude = normalizeConstraintValues((value as Record<string, unknown>).exclude);
    if (include || exclude) {
      constraints[dimension as MockChartDimension] = { include, exclude };
    }
  }
  return Object.keys(constraints).length ? constraints : undefined;
}

function normalizeTextForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWordBoundaryMatch(text: string, alias: string): boolean {
  const escaped = escapeRegex(alias);
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`);
  return pattern.test(text);
}

function detectCountryCodes(prompt: string): string[] {
  const matches = prompt.match(/\b[A-Z]{2}\b/g) || [];
  const detected = new Set<string>();
  for (const code of matches) {
    const normalized = code.toUpperCase();
    if (COUNTRY_CODES.has(normalized)) {
      detected.add(normalized);
    }
  }
  return [...detected];
}

function detectPlatformX(prompt: string): boolean {
  const normalized = normalizeTextForMatch(prompt);
  return /\b(?:plateforme|platform|sur)\s+x\b/.test(normalized);
}

function detectEntities(
  prompt: string,
  dictionary: Array<{ aliases: string[]; canonical: string }>,
): string[] {
  const normalized = normalizeTextForMatch(prompt);
  const detected = new Set<string>();
  for (const entry of dictionary) {
    if (
      entry.aliases.some((alias) => {
        const n = normalizeTextForMatch(alias);
        return n.length > 1 && hasWordBoundaryMatch(normalized, n);
      })
    ) {
      detected.add(entry.canonical);
    }
  }
  return [...detected];
}

function extractStrongEntityConstraints(prompt: string): ChartAggregationConstraints | undefined {
  const platforms = detectEntities(prompt, PLATFORM_ALIASES);
  if (detectPlatformX(prompt)) {
    platforms.push('X');
  }
  const countries = [...new Set([...detectEntities(prompt, COUNTRY_ALIASES), ...detectCountryCodes(prompt)])];
  const constraints: ChartAggregationConstraints = {};
  if (platforms.length) {
    constraints.platform_name = { include: [...new Set(platforms)] };
  }
  if (countries.length) {
    constraints.country = { include: countries };
  }
  return Object.keys(constraints).length ? constraints : undefined;
}

function hasConstraintDrift(
  expected: ChartAggregationConstraints | undefined,
  actual: ChartAggregationConstraints | undefined,
): boolean {
  if (!expected) return false;
  for (const [dimension, expectedRule] of Object.entries(expected)) {
    const exp = expectedRule?.include || [];
    if (!exp.length) continue;
    const cur = actual?.[dimension as MockChartDimension]?.include || [];
    const curLower = new Set(cur.map((v) => v.toLowerCase()));
    const expLower = new Set(exp.map((v) => v.toLowerCase()));
    if (curLower.size !== expLower.size) return true;
    if ([...expLower].some((value) => !curLower.has(value))) return true;
  }
  return false;
}

function buildCacheKey(prompt: string, filters?: AnalyticsFilters): string {
  return JSON.stringify({
    version: CACHE_SCHEMA_VERSION,
    prompt: prompt.toLowerCase(),
    filters: normalizeFilters(filters),
  });
}

async function requestLlmJson(
  baseUrl: string,
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned empty response.');
  }
  return content;
}

export function validateAggregationPlan(raw: unknown): ChartAggregationPlan {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid plan: expected object.');
  }
  const o = raw as Record<string, unknown>;

  let chartType = String(o.chartType || 'bar').toLowerCase();
  if (chartType === 'scatter') {
    chartType = 'bar';
  }
  if (!AGGREGATION_CHART_TYPES.has(chartType)) {
    throw new Error(`Unsupported chartType for mock aggregation: ${chartType}`);
  }

  const primaryDimension = String(o.primaryDimension || '');
  if (!MOCK_DIMENSIONS.has(primaryDimension)) {
    throw new Error(`Invalid primaryDimension: ${primaryDimension}`);
  }

  let secondaryDimension: MockChartDimension | null = null;
  const sec = o.secondaryDimension;
  if (sec !== null && sec !== undefined && sec !== '') {
    const s = String(sec);
    if (!MOCK_DIMENSIONS.has(s)) {
      throw new Error(`Invalid secondaryDimension: ${s}`);
    }
    if (s === primaryDimension) {
      throw new Error('secondaryDimension must differ from primaryDimension.');
    }
    secondaryDimension = s as MockChartDimension;
  }

  if (chartType === 'heatmap' && secondaryDimension === null) {
    throw new Error('heatmap requires secondaryDimension.');
  }

  const metric: ChartAggregationPlan['metric'] =
    o.metric === 'avg_delay_days' ? 'avg_delay_days' : 'count';

  let topN = Number(o.topN);
  if (!Number.isFinite(topN) || topN < 1) {
    topN = DEFAULT_TOP_N;
  }
  if (topN > MAX_TOP_N) {
    topN = MAX_TOP_N;
  }

  const sort: 'desc' | 'asc' = o.sort === 'asc' ? 'asc' : 'desc';
  const constraints = normalizeConstraints(o.constraints);

  // Row columns on the client are always dim_a / value / dim_b; the LLM often echoes
  // semantic names in xField/yField — ignore those fields and keep fixed aliases.
  const plan: ChartAggregationPlan = {
    chartType: chartType as MockAggregationChartType,
    title: String(o.title || 'Generated chart').slice(0, 200),
    subtitle: o.subtitle != null ? String(o.subtitle).slice(0, 200) : undefined,
    explanation: o.explanation != null ? String(o.explanation).slice(0, 500) : undefined,
    primaryDimension: primaryDimension as MockChartDimension,
    secondaryDimension,
    metric,
    topN,
    sort,
    xField: 'dim_a',
    yField: 'value',
    seriesField: secondaryDimension ? 'dim_b' : undefined,
    constraints,
  };

  return plan;
}

function buildFallbackPlan(prompt: string): ChartAggregationPlan {
  const p = prompt.toLowerCase();
  if (p.includes('plateforme') || p.includes('platform')) {
    return {
      chartType: 'bar',
      title: 'Actions by platform',
      subtitle: 'Fallback plan',
      explanation: 'Fallback chart without LLM.',
      primaryDimension: 'platform_name',
      secondaryDimension: null,
      metric: 'count',
      topN: DEFAULT_TOP_N,
      sort: 'desc',
      xField: 'dim_a',
      yField: 'value',
    };
  }
  if (p.includes('pays') || p.includes('country') || p.includes('countries')) {
    return {
      chartType: 'bar',
      title: 'Actions by country',
      subtitle: 'Fallback plan',
      explanation: 'Fallback chart without LLM.',
      primaryDimension: 'country',
      secondaryDimension: null,
      metric: 'count',
      topN: 10,
      sort: 'desc',
      xField: 'dim_a',
      yField: 'value',
    };
  }
  return {
    chartType: 'line',
    title: 'Actions over time',
    subtitle: 'Fallback plan',
    explanation: 'Fallback chart without LLM.',
    primaryDimension: 'month',
    secondaryDimension: null,
    metric: 'count',
    topN: 36,
    sort: 'asc',
    xField: 'dim_a',
    yField: 'value',
  };
}

function applyExpectedConstraintsStrict(
  plan: ChartAggregationPlan,
  expected?: ChartAggregationConstraints,
): ChartAggregationPlan {
  if (!expected) return plan;
  const next: ChartAggregationConstraints = { ...(plan.constraints || {}) };
  for (const [dimension, rule] of Object.entries(expected)) {
    next[dimension as MockChartDimension] = {
      include: rule?.include ? [...rule.include] : undefined,
      exclude: rule?.exclude ? [...rule.exclude] : undefined,
    };
  }
  return {
    ...plan,
    constraints: Object.keys(next).length ? next : undefined,
  };
}

async function runLlmMockChartPlan(
  prompt: string,
  filters?: AnalyticsFilters,
): Promise<ChartAggregationPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing. Configure it in backend environment.');
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const dimensions = [...MOCK_DIMENSIONS].join(', ');
  const expectedConstraints = extractStrongEntityConstraints(prompt);
  const system = [
    'You are a chart planner for a moderation analytics dashboard using in-memory mock rows.',
    'Return ONLY a valid JSON object (no markdown).',
    'Fields: chartType (line|bar|pie|heatmap only), title, subtitle, explanation,',
    'primaryDimension, secondaryDimension (null or a second dimension), metric (count|avg_delay_days),',
    'topN (1-50, default 20), sort (desc|asc for ranking), constraints.',
    `Allowed dimensions: ${dimensions}.`,
    'Use month for time trends (buckets application_date by YYYY-MM).',
    'Use secondaryDimension for breakdowns (e.g. platform vs month). heatmap requires secondaryDimension.',
    'Output columns on the client are always dim_a, value, dim_b; do not rely on xField/yField names.',
    'constraints format: { "<dimension>": { "include": ["v1","v2"], "exclude": ["v3"] } }.',
    'When the prompt explicitly names entities (platforms/countries/categories),',
    'you MUST put them in constraints.include and keep the scope strict (no broad top-N expansion).',
    'If prompt says compare A vs B, include exactly A and B in constraints when possible.',
    'Do not add extra countries/platforms beyond explicitly requested entities.',
    'Prefer French titles when the user writes in French.',
  ].join(' ');

  const user = JSON.stringify({
    task: 'Aggregation plan for client-side mock data',
    prompt,
    filters: normalizeFilters(filters),
  });

  const payload: Record<string, unknown> = {
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  };

  let content = await requestLlmJson(baseUrl, apiKey, payload);
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  let plan: ChartAggregationPlan;
  try {
    plan = validateAggregationPlan(parsed);
  } catch (firstError) {
    const repairPayload: Record<string, unknown> = {
      ...payload,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
        {
          role: 'user',
          content: `Your JSON was invalid. Error: ${
            firstError instanceof Error ? firstError.message : 'Unknown'
          }. Return ONLY corrected JSON with required fields.`,
        },
      ],
    };
    content = await requestLlmJson(baseUrl, apiKey, repairPayload);
    try {
      parsed = JSON.parse(content);
    } catch {
      throw firstError;
    }
    plan = validateAggregationPlan(parsed);
  }

  if (hasConstraintDrift(expectedConstraints, plan.constraints)) {
    const strictRepairPayload: Record<string, unknown> = {
      ...payload,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
        {
          role: 'user',
          content: JSON.stringify({
            instruction:
              'Previous plan drifted from explicit entities in the prompt. Keep same intent but set exact constraints.',
            requiredConstraints: expectedConstraints,
            currentPlan: plan,
          }),
        },
      ],
    };

    const strictContent = await requestLlmJson(baseUrl, apiKey, strictRepairPayload);
    let strictParsed: unknown = {};
    try {
      strictParsed = JSON.parse(strictContent);
    } catch {
      strictParsed = {};
    }

    const strictPlan = validateAggregationPlan(strictParsed);
    plan = hasConstraintDrift(expectedConstraints, strictPlan.constraints)
      ? applyExpectedConstraintsStrict(strictPlan, expectedConstraints)
      : strictPlan;
  }

  return applyExpectedConstraintsStrict(plan, expectedConstraints);
}

export async function generateChartPlan(input: {
  prompt: string;
  filters?: AnalyticsFilters;
}): Promise<ChartPlanApiResponse> {
  const start = Date.now();
  const prompt = normalizePrompt(input.prompt || '');
  if (!prompt) {
    throw new Error('Prompt is required.');
  }
  if (prompt.length > 600) {
    throw new Error('Prompt is too long. Please keep it under 600 characters.');
  }

  const cacheKey = buildCacheKey(prompt, input.filters);
  const now = Date.now();
  cleanupCache(now);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      plan: cached.value,
      cached: true,
      durationMs: Date.now() - start,
    };
  }

  let plan: ChartAggregationPlan;
  const expectedConstraints = extractStrongEntityConstraints(prompt);
  try {
    plan = await runLlmMockChartPlan(prompt, input.filters);
  } catch (error) {
    console.warn('[chart-plan] LLM failed, fallback:', error);
    plan = buildFallbackPlan(prompt);
  }
  plan = applyExpectedConstraintsStrict(plan, expectedConstraints);

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: plan,
  });

  return {
    plan,
    cached: false,
    durationMs: Date.now() - start,
  };
}
