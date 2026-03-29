export interface AnalyticsFilters {
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
  filters?: AnalyticsFilters;
}

export type SupportedChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';

export interface LlmChartPlan {
  chartType: SupportedChartType;
  title: string;
  subtitle?: string;
  sql: string;
  xField?: string;
  yField?: string;
  valueField?: string;
  seriesField?: string;
  explanation?: string;
}

export interface CustomChartResponse {
  chartType: SupportedChartType;
  title: string;
  subtitle: string;
  explanation: string;
  sql?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  echartsOption: Record<string, unknown>;
  cached: boolean;
  durationMs: number;
}

/** Dimensions aligned with frontend mock ModerationEntry (no SQL). */
export type MockChartDimension =
  | 'month'
  | 'platform_name'
  | 'country'
  | 'category'
  | 'decision_type'
  | 'decision_ground'
  | 'content_type'
  | 'language'
  | 'automated_detection'
  | 'automated_decision';

export type MockAggregationMetric = 'count' | 'avg_delay_days';

export type MockAggregationChartType = 'line' | 'bar' | 'pie' | 'heatmap';

export interface ChartValueConstraint {
  include?: string[];
  exclude?: string[];
}

export type ChartAggregationConstraints = Partial<
  Record<MockChartDimension, ChartValueConstraint>
>;

/**
 * LLM output for mock-mode charts: aggregation on the client over filtered entries.
 * Row columns are always dim_a, value, and optionally dim_b.
 */
export interface ChartAggregationPlan {
  chartType: MockAggregationChartType;
  title: string;
  subtitle?: string;
  explanation?: string;
  primaryDimension: MockChartDimension;
  secondaryDimension: MockChartDimension | null;
  metric: MockAggregationMetric;
  topN: number;
  sort: 'desc' | 'asc';
  xField: 'dim_a';
  yField: 'value';
  seriesField?: 'dim_b';
  constraints?: ChartAggregationConstraints;
}

export interface ChartPlanApiResponse {
  plan: ChartAggregationPlan;
  cached: boolean;
  durationMs: number;
}
