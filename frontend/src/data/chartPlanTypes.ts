/** Mirrors backend ChartAggregationPlan for mock-mode custom charts. */

import type { EChartsOption } from 'echarts';

export interface CustomChartResponse {
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  title: string;
  subtitle: string;
  explanation: string;
  sql?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  echartsOption: EChartsOption;
  cached: boolean;
  durationMs: number;
}

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
}

export interface ChartPlanApiResponse {
  plan: ChartAggregationPlan;
  cached: boolean;
  durationMs: number;
}
