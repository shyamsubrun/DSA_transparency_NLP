export interface ModerationEntry {
  id: string;
  application_date: string;
  content_date: string | null;
  platform_name: string;
  category: string;
  decision_type: string;
  decision_ground: string;
  incompatible_content_ground: string | null;
  content_type: string | null;
  automated_detection: boolean | null;
  automated_decision: boolean | null;
  country: string | null;
  territorial_scope: string[];
  language: string | null;
  delay_days: number | null;
}

export interface KPIStats {
  totalActions: number;
  platformCount: number;
  averageDelay: number;
  automatedDetectionRate: number;
  automatedDecisionRate: number;
  countryCount: number;
}

export interface FilterOptions {
  platforms: string[];
  categories: string[];
  decisionTypes: string[];
  decisionGrounds: string[];
  countries: string[];
  contentTypes: string[];
  languages: string[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ModerationEntriesResponse {
  data: ModerationEntry[];
  pagination: PaginationInfo;
}

