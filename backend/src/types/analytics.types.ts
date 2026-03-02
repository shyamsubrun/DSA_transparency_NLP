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
