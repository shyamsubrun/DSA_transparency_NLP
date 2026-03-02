import prisma from '../config/database.js';
import type {
  AnalyticsFilters,
  CustomChartRequest,
  CustomChartResponse,
  LlmChartPlan,
  SupportedChartType,
} from '../types/analytics.types.js';

const QUERY_TIMEOUT_MS = Number(process.env.ANALYTICS_QUERY_TIMEOUT_MS || 8000);
const MAX_ROWS = Number(process.env.ANALYTICS_MAX_ROWS || 2000);
const CACHE_TTL_MS = Number(process.env.ANALYTICS_CACHE_TTL_MS || 2 * 60 * 1000);

const ALLOWED_TABLES = new Set([
  'moderation_entries',
  'platforms',
  'categories',
  'decision_types',
  'decision_grounds',
  'content_types',
]);

const ALLOWED_COLUMNS = new Set([
  'id',
  'application_date',
  'content_date',
  'platform_id',
  'category_id',
  'decision_type_id',
  'decision_ground_id',
  'incompatible_content_ground',
  'content_type_id',
  'automated_detection',
  'automated_decision',
  'country_code',
  'territorial_scope',
  'language',
  'delay_days',
  'created_at',
  'name',
]);

const cache = new Map<string, { expiresAt: number; value: CustomChartResponse }>();
const metrics = {
  totalRequests: 0,
  cacheHits: 0,
  llmFailures: 0,
  sqlValidationFailures: 0,
  executionFailures: 0,
};

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

function validateAndSanitizeSql(sql: string): string {
  const trimmed = sql.trim().replace(/;+$/, '');
  const lower = trimmed.toLowerCase();
  const startsOk = lower.startsWith('select') || lower.startsWith('with');
  if (!startsOk) {
    throw new Error('Only SELECT queries are allowed.');
  }

  if (/--|\/\*/.test(trimmed)) {
    throw new Error('SQL comments are not allowed.');
  }

  const forbidden = /\b(insert|update|delete|drop|alter|truncate|copy|create|grant|revoke)\b/i;
  if (forbidden.test(trimmed)) {
    throw new Error('Forbidden SQL keyword detected.');
  }

  const tableRefs = [...trimmed.matchAll(/\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_."]*)/gi)];
  for (const [, rawRef] of tableRefs) {
    const unquoted = rawRef.replace(/"/g, '');
    const base = unquoted.split('.').pop() || '';
    if (!ALLOWED_TABLES.has(base)) {
      throw new Error(`Table not allowed in query: ${base}`);
    }
  }

  const columnRefs = [...trimmed.matchAll(/\b[a-zA-Z_][a-zA-Z0-9_]*\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g)];
  for (const [, column] of columnRefs) {
    if (!ALLOWED_COLUMNS.has(column)) {
      throw new Error(`Column not allowed in query: ${column}`);
    }
  }

  let finalSql = trimmed;
  const limitMatch = finalSql.match(/\blimit\s+(\d+)\b/i);
  if (!limitMatch) {
    finalSql += ` LIMIT ${MAX_ROWS}`;
  } else {
    const requestedLimit = Number(limitMatch[1]);
    if (requestedLimit > MAX_ROWS) {
      finalSql = finalSql.replace(/\blimit\s+\d+\b/i, `LIMIT ${MAX_ROWS}`);
    }
  }

  return finalSql;
}

function inferFields(rows: Record<string, unknown>[]): {
  xField: string;
  yField: string;
  seriesField?: string;
  valueField?: string;
} {
  if (rows.length === 0) {
    return { xField: 'x', yField: 'y' };
  }

  const columns = Object.keys(rows[0]);
  const numericColumns = columns.filter((col) => {
    const sample = rows.find((r) => typeof r[col] === 'number');
    return typeof sample?.[col] === 'number';
  });
  const textColumns = columns.filter((col) => !numericColumns.includes(col));

  const xField = textColumns[0] || columns[0];
  const yField = numericColumns[0] || columns[1] || columns[0];
  const seriesField = textColumns[1];
  const valueField = numericColumns[1] || yField;
  return { xField, yField, seriesField, valueField };
}

function buildChartOption(
  plan: LlmChartPlan,
  rows: Record<string, unknown>[],
): Record<string, unknown> {
  const inferred = inferFields(rows);
  const xField = plan.xField || inferred.xField;
  const yField = plan.yField || inferred.yField;
  const valueField = plan.valueField || inferred.valueField || yField;
  const seriesField = plan.seriesField || inferred.seriesField;

  if (plan.chartType === 'pie') {
    return {
      tooltip: { trigger: 'item' },
      legend: { top: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: rows.map((r) => ({
            name: String(r[xField] ?? 'N/A'),
            value: Number(r[yField] ?? 0),
          })),
        },
      ],
    };
  }

  if (plan.chartType === 'scatter') {
    return {
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: xField },
      yAxis: { type: 'value', name: yField },
      series: [
        {
          type: 'scatter',
          data: rows.map((r) => [Number(r[xField] ?? 0), Number(r[yField] ?? 0)]),
          symbolSize: 12,
        },
      ],
    };
  }

  if (plan.chartType === 'heatmap') {
    const xValues = Array.from(new Set(rows.map((r) => String(r[xField] ?? 'N/A'))));
    const yName = seriesField || inferred.seriesField || xField;
    const yValues = Array.from(new Set(rows.map((r) => String(r[yName] ?? 'N/A'))));
    return {
      tooltip: { position: 'top' },
      xAxis: { type: 'category', data: xValues },
      yAxis: { type: 'category', data: yValues },
      visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', bottom: 0 },
      series: [
        {
          type: 'heatmap',
          data: rows.map((r) => [
            xValues.indexOf(String(r[xField] ?? 'N/A')),
            yValues.indexOf(String(r[yName] ?? 'N/A')),
            Number(r[valueField] ?? 0),
          ]),
        },
      ],
    };
  }

  const grouped = new Map<string, Record<string, unknown>[]>();
  if (seriesField) {
    for (const row of rows) {
      const key = String(row[seriesField] ?? 'N/A');
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    }
  }

  if ((plan.chartType === 'line' || plan.chartType === 'bar') && grouped.size > 1) {
    const categories = Array.from(new Set(rows.map((r) => String(r[xField] ?? 'N/A'))));
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, type: 'scroll' },
      xAxis: { type: 'category', data: categories },
      yAxis: { type: 'value' },
      series: Array.from(grouped.entries()).map(([name, values]) => ({
        name,
        type: plan.chartType,
        data: categories.map((cat) => {
          const row = values.find((v) => String(v[xField] ?? 'N/A') === cat);
          return Number(row?.[yField] ?? 0);
        }),
        smooth: plan.chartType === 'line',
      })),
    };
  }

  return {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: rows.map((r) => String(r[xField] ?? 'N/A')),
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: plan.chartType === 'line' ? 'line' : 'bar',
        data: rows.map((r) => Number(r[yField] ?? 0)),
        smooth: plan.chartType === 'line',
      },
    ],
  };
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

function validatePlan(plan: Partial<LlmChartPlan>): LlmChartPlan {
  if (!plan.sql || !plan.chartType || !plan.title) {
    throw new Error('LLM output missing required fields (sql, chartType, title).');
  }

  if (!['line', 'bar', 'pie', 'scatter', 'heatmap'].includes(plan.chartType)) {
    throw new Error(`Unsupported chartType: ${String(plan.chartType)}`);
  }

  return {
    chartType: plan.chartType as SupportedChartType,
    title: plan.title,
    subtitle: plan.subtitle || 'Generated from natural language request',
    sql: plan.sql,
    xField: plan.xField,
    yField: plan.yField,
    valueField: plan.valueField,
    seriesField: plan.seriesField,
    explanation: plan.explanation || 'Generated query and chart from your request.',
  };
}

async function runLlmPlan(prompt: string, filters?: AnalyticsFilters): Promise<LlmChartPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing. Configure it in backend environment.');
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const schemaHint = {
    chartType: ['line', 'bar', 'pie', 'scatter', 'heatmap'],
    title: 'string',
    subtitle: 'string',
    sql: 'SQL SELECT only, uses allowed tables',
    xField: 'string',
    yField: 'string',
    seriesField: 'string|null',
    valueField: 'string|null',
    explanation: 'string',
  };

  const system = [
    'You are an analytics planner for a PostgreSQL dashboard.',
    'Return ONLY valid JSON object.',
    'SQL must be a single SELECT query, no comments, no DML/DDL.',
    'Allowed tables: moderation_entries, platforms, categories, decision_types, decision_grounds, content_types.',
    'Prefer explicit aliases for output columns.',
  ].join(' ');

  const user = JSON.stringify({
    task: 'Generate chart plan',
    prompt,
    filters: normalizeFilters(filters),
    outputSchema: schemaHint,
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

  let plan: Partial<LlmChartPlan>;
  let content = await requestLlmJson(baseUrl, apiKey, payload);
  try {
    plan = JSON.parse(content);
  } catch {
    plan = {};
  }

  try {
    return validatePlan(plan);
  } catch (firstError) {
    const repairPayload: Record<string, unknown> = {
      ...payload,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
        {
          role: 'user',
          content: `Your previous JSON was invalid. Error: ${
            firstError instanceof Error ? firstError.message : 'Unknown error'
          }. Return ONLY a corrected JSON object with required fields.`,
        },
      ],
    };
    content = await requestLlmJson(baseUrl, apiKey, repairPayload);
    const repaired = JSON.parse(content) as Partial<LlmChartPlan>;
    return validatePlan(repaired);
  }
}

async function executeSql(sql: string): Promise<Record<string, unknown>[]> {
  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${QUERY_TIMEOUT_MS}`);
    return tx.$queryRawUnsafe(sql);
  });
  return rows as Record<string, unknown>[];
}

function buildFallbackPlan(prompt: string): LlmChartPlan {
  const p = prompt.toLowerCase();
  if (p.includes('plateforme') || p.includes('platform')) {
    return {
      chartType: 'bar',
      title: 'Actions by Platform',
      subtitle: 'Fallback query',
      sql: `
        SELECT p.name AS platform_name, COUNT(*)::int AS action_count
        FROM moderation_entries me
        JOIN platforms p ON p.id = me.platform_id
        GROUP BY p.name
        ORDER BY action_count DESC
        LIMIT 20
      `,
      xField: 'platform_name',
      yField: 'action_count',
      explanation: 'Fallback chart generated without LLM.',
    };
  }
  return {
    chartType: 'line',
    title: 'Actions Over Time',
    subtitle: 'Fallback query',
    sql: `
      SELECT to_char(me.application_date, 'YYYY-MM') AS month, COUNT(*)::int AS action_count
      FROM moderation_entries me
      GROUP BY month
      ORDER BY month
      LIMIT 36
    `,
    xField: 'month',
    yField: 'action_count',
    explanation: 'Fallback chart generated without LLM.',
  };
}

export async function generateCustomChart(
  input: CustomChartRequest,
): Promise<CustomChartResponse> {
  const start = Date.now();
  metrics.totalRequests++;
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
    metrics.cacheHits++;
    console.info('[analytics] cache_hit');
    return {
      ...cached.value,
      cached: true,
      durationMs: Date.now() - start,
    };
  }

  let plan: LlmChartPlan;
  try {
    plan = await runLlmPlan(prompt, input.filters);
  } catch (error) {
    metrics.llmFailures++;
    console.warn('[analytics] LLM failed, using fallback plan:', error);
    plan = buildFallbackPlan(prompt);
  }

  let sanitizedSql = '';
  try {
    sanitizedSql = validateAndSanitizeSql(plan.sql);
  } catch (error) {
    metrics.sqlValidationFailures++;
    throw error;
  }

  let rows: Record<string, unknown>[] = [];
  try {
    rows = await executeSql(sanitizedSql);
  } catch (error) {
    metrics.executionFailures++;
    throw error;
  }
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  const echartsOption = buildChartOption(plan, rows);

  const response: CustomChartResponse = {
    chartType: plan.chartType,
    title: plan.title,
    subtitle: plan.subtitle || 'Generated chart',
    explanation: plan.explanation || 'Generated from your prompt.',
    sql: process.env.NODE_ENV === 'development' ? sanitizedSql : undefined,
    columns,
    rows,
    echartsOption,
    cached: false,
    durationMs: Date.now() - start,
  };

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: response,
  });

  console.info(
    `[analytics] success chartType=${response.chartType} rows=${rows.length} durationMs=${response.durationMs} ` +
      `metrics=${JSON.stringify(metrics)}`,
  );

  return response;
}
