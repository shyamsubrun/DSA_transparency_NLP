// DSA Transparency Database Types

export interface ModerationEntry {
  id: string;
  application_date: string;
  content_date: string;
  platform_name: string;
  category: string;
  decision_type: string;
  decision_ground: string;
  incompatible_content_ground: string | null;
  content_type: string;
  automated_detection: boolean;
  automated_decision: boolean;
  country: string;
  territorial_scope: string[];
  language: string;
  delay_days: number;
}

export interface KPIStats {
  totalActions: number;
  platformCount: number;
  averageDelay: number;
  automatedDetectionRate: number;
  automatedDecisionRate: number;
  countryCount: number;
}

/** Aligné sur le pipeline décrit dans le rapport (15 plateformes filtrées). */
export const PLATFORMS = [
  'TikTok',
  'Instagram',
  'Facebook',
  'YouTube',
  'X',
  'Pornhub',
  'XNXX',
  'XVideos',
  'Snapchat',
  'Reddit',
  'LinkedIn',
  'Amazon Store',
  'AliExpress',
  'Temu',
  'Shein',
] as const;

export const CATEGORIES = [
  'Hate Speech',
  'Harassment',
  'Misleading Information',
  'Illegal Goods',
  'Violence',
  'Terrorism Content',
  'Child Safety',
  'Copyright Infringement',
  'Privacy Violation',
  'Scam/Fraud',
  'Self-Harm Content',
  'Political Manipulation'
] as const;

export const DECISION_TYPES = [
  'Removal',
  'Visibility Restriction',
  'Account Suspension',
  'Demonetization',
  'Warning Label',
  'Age Restriction',
  'Geo-Blocking'
] as const;

export const DECISION_GROUNDS = [
  'Illegal content (Art. 3 DSA)',
  'Terms of Service violation',
  'Directive 2011/93/EU (CSAM)',
  'Regulation 2021/784 (Terrorist Content)',
  'National law implementation',
  'Consumer protection law',
  'Intellectual property law',
  'GDPR violation',
  'Platform community guidelines',
  'Harmful but legal content'
] as const;

export const CONTENT_TYPES = [
  'Text',
  'Image',
  'Video',
  'Audio',
  'Live Stream',
  'Story/Reel'
] as const;

export const EU_COUNTRIES = [
  { code: 'DE', name: 'Germany', lang: 'de' },
  { code: 'FR', name: 'France', lang: 'fr' },
  { code: 'IT', name: 'Italy', lang: 'it' },
  { code: 'ES', name: 'Spain', lang: 'es' },
  { code: 'PL', name: 'Poland', lang: 'pl' },
  { code: 'RO', name: 'Romania', lang: 'ro' },
  { code: 'NL', name: 'Netherlands', lang: 'nl' },
  { code: 'BE', name: 'Belgium', lang: 'nl' },
  { code: 'GR', name: 'Greece', lang: 'el' },
  { code: 'CZ', name: 'Czech Republic', lang: 'cs' },
  { code: 'PT', name: 'Portugal', lang: 'pt' },
  { code: 'SE', name: 'Sweden', lang: 'sv' },
  { code: 'HU', name: 'Hungary', lang: 'hu' },
  { code: 'AT', name: 'Austria', lang: 'de' },
  { code: 'BG', name: 'Bulgaria', lang: 'bg' },
  { code: 'DK', name: 'Denmark', lang: 'da' },
  { code: 'FI', name: 'Finland', lang: 'fi' },
  { code: 'SK', name: 'Slovakia', lang: 'sk' },
  { code: 'IE', name: 'Ireland', lang: 'en' },
  { code: 'HR', name: 'Croatia', lang: 'hr' },
  { code: 'LT', name: 'Lithuania', lang: 'lt' },
  { code: 'SI', name: 'Slovenia', lang: 'sl' },
  { code: 'LV', name: 'Latvia', lang: 'lv' },
  { code: 'EE', name: 'Estonia', lang: 'et' },
  { code: 'CY', name: 'Cyprus', lang: 'el' },
  { code: 'LU', name: 'Luxembourg', lang: 'fr' },
  { code: 'MT', name: 'Malta', lang: 'mt' }
] as const;

export type Platform = typeof PLATFORMS[number];
export type Category = typeof CATEGORIES[number];
export type DecisionType = typeof DECISION_TYPES[number];
export type DecisionGround = typeof DECISION_GROUNDS[number];
export type ContentType = typeof CONTENT_TYPES[number];

