// Filter types separated for better Vite compatibility

export interface FilterState {
  dateRange: { start: string; end: string } | null;
  platforms: string[];
  categories: string[];
  decisionTypes: string[];
  decisionGrounds: string[];
  countries: string[];
  contentTypes: string[];
  automatedDetection: boolean | null;
  automatedDecision: boolean | null;
}

