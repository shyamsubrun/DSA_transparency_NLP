import type {
  AnalyticsFilters,
  ChartAggregationPlan,
  ChartPlanApiResponse,
  MockAggregationChartType,
  MockChartDimension,
} from '../types/analytics.types.js';

const CACHE_TTL_MS = Number(process.env.ANALYTICS_CACHE_TTL_MS || 2 * 60 * 1000);
const MAX_TOP_N = 50;
const DEFAULT_TOP_N = 20;

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

function buildCacheKey(prompt: string, filters?: AnalyticsFilters): string {
  return JSON.stringify({ prompt: prompt.toLowerCase(), filters: normalizeFilters(filters) });
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
  const system = [
    'You are a chart planner for a moderation analytics dashboard using in-memory mock rows.',
    'Return ONLY a valid JSON object (no markdown).',
    'Fields: chartType (line|bar|pie|heatmap only), title, subtitle, explanation,',
    'primaryDimension, secondaryDimension (null or a second dimension), metric (count|avg_delay_days),',
    'topN (1-50, default 20), sort (desc|asc for ranking).',
    `Allowed dimensions: ${dimensions}.`,
    'Use month for time trends (buckets application_date by YYYY-MM).',
    'Use secondaryDimension for breakdowns (e.g. platform vs month). heatmap requires secondaryDimension.',
    'Output columns on the client are always dim_a, value, dim_b; do not rely on xField/yField names.',
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

  try {
    return validateAggregationPlan(parsed);
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
    return validateAggregationPlan(parsed);
  }
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
  try {
    plan = await runLlmMockChartPlan(prompt, input.filters);
  } catch (error) {
    console.warn('[chart-plan] LLM failed, fallback:', error);
    plan = buildFallbackPlan(prompt);
  }

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
