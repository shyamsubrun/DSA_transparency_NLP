// Mock Data Generator for DSA Transparency Database
// This file generates realistic fake data that can be easily replaced with API calls

import type { ModerationEntry } from './types';
import {
  PLATFORMS,
  CATEGORIES,
  DECISION_TYPES,
  DECISION_GROUNDS,
  CONTENT_TYPES,
  EU_COUNTRIES
} from './types';

// Seeded random for reproducibility
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

let seed = 12345;
function random() {
  seed++;
  return seededRandom(seed);
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Weight distributions for realistic data
const platformWeights: Record<string, number> = {
  'Meta': 0.25,
  'TikTok': 0.20,
  'YouTube': 0.18,
  'X': 0.15,
  'LinkedIn': 0.08,
  'Amazon': 0.06,
  'Pinterest': 0.05,
  'Snapchat': 0.03
};

const categoryWeights: Record<string, number> = {
  'Hate Speech': 0.18,
  'Misleading Information': 0.16,
  'Harassment': 0.14,
  'Scam/Fraud': 0.12,
  'Violence': 0.10,
  'Copyright Infringement': 0.08,
  'Illegal Goods': 0.06,
  'Privacy Violation': 0.05,
  'Terrorism Content': 0.04,
  'Child Safety': 0.03,
  'Self-Harm Content': 0.02,
  'Political Manipulation': 0.02
};

const countryWeights: Record<string, number> = {
  'Germany': 0.18,
  'France': 0.15,
  'Italy': 0.12,
  'Spain': 0.10,
  'Poland': 0.08,
  'Netherlands': 0.06,
  'Romania': 0.05,
  'Belgium': 0.04,
  'Greece': 0.04,
  'Portugal': 0.03,
  'Sweden': 0.03,
  'Czech Republic': 0.02,
  'Austria': 0.02,
  'Hungary': 0.02,
  'Bulgaria': 0.01,
  'Denmark': 0.01,
  'Finland': 0.01,
  'Slovakia': 0.01,
  'Ireland': 0.01,
  'Croatia': 0.005,
  'Lithuania': 0.005,
  'Slovenia': 0.004,
  'Latvia': 0.003,
  'Estonia': 0.003,
  'Cyprus': 0.002,
  'Luxembourg': 0.002,
  'Malta': 0.001
};

function weightedRandom<T extends string>(weights: Record<T, number>): T {
  const r = random();
  let cumulative = 0;
  for (const [key, weight] of Object.entries(weights) as [T, number][]) {
    cumulative += weight;
    if (r < cumulative) return key;
  }
  return Object.keys(weights)[0] as T;
}

// Platform-specific content type tendencies
const platformContentTypes: Record<string, string[]> = {
  'Meta': ['Text', 'Image', 'Video', 'Story/Reel'],
  'TikTok': ['Video', 'Live Stream', 'Story/Reel'],
  'YouTube': ['Video', 'Live Stream', 'Audio'],
  'X': ['Text', 'Image', 'Video'],
  'LinkedIn': ['Text', 'Image', 'Video'],
  'Amazon': ['Text', 'Image'],
  'Pinterest': ['Image', 'Video'],
  'Snapchat': ['Image', 'Video', 'Story/Reel']
};

// Platform automation rates
const platformAutomationRates: Record<string, { detection: number; decision: number }> = {
  'Meta': { detection: 0.92, decision: 0.75 },
  'TikTok': { detection: 0.88, decision: 0.70 },
  'YouTube': { detection: 0.85, decision: 0.65 },
  'X': { detection: 0.78, decision: 0.55 },
  'LinkedIn': { detection: 0.72, decision: 0.50 },
  'Amazon': { detection: 0.80, decision: 0.60 },
  'Pinterest': { detection: 0.75, decision: 0.58 },
  'Snapchat': { detection: 0.82, decision: 0.62 }
};

// Category to likely decision grounds mapping
const categoryGrounds: Record<string, string[]> = {
  'Hate Speech': ['Illegal content (Art. 3 DSA)', 'Terms of Service violation', 'Platform community guidelines'],
  'Harassment': ['Terms of Service violation', 'Platform community guidelines', 'National law implementation'],
  'Misleading Information': ['Terms of Service violation', 'Platform community guidelines', 'Harmful but legal content'],
  'Illegal Goods': ['Illegal content (Art. 3 DSA)', 'Consumer protection law', 'National law implementation'],
  'Violence': ['Terms of Service violation', 'Platform community guidelines', 'Illegal content (Art. 3 DSA)'],
  'Terrorism Content': ['Regulation 2021/784 (Terrorist Content)', 'Illegal content (Art. 3 DSA)'],
  'Child Safety': ['Directive 2011/93/EU (CSAM)', 'Illegal content (Art. 3 DSA)'],
  'Copyright Infringement': ['Intellectual property law', 'Terms of Service violation'],
  'Privacy Violation': ['GDPR violation', 'Terms of Service violation', 'National law implementation'],
  'Scam/Fraud': ['Illegal content (Art. 3 DSA)', 'Consumer protection law', 'Terms of Service violation'],
  'Self-Harm Content': ['Platform community guidelines', 'Harmful but legal content'],
  'Political Manipulation': ['Terms of Service violation', 'Platform community guidelines', 'Harmful but legal content']
};

// Category to likely decision types mapping
const categoryDecisions: Record<string, string[]> = {
  'Hate Speech': ['Removal', 'Account Suspension', 'Warning Label'],
  'Harassment': ['Removal', 'Account Suspension', 'Visibility Restriction'],
  'Misleading Information': ['Warning Label', 'Visibility Restriction', 'Removal'],
  'Illegal Goods': ['Removal', 'Account Suspension'],
  'Violence': ['Removal', 'Age Restriction', 'Warning Label'],
  'Terrorism Content': ['Removal', 'Account Suspension', 'Geo-Blocking'],
  'Child Safety': ['Removal', 'Account Suspension'],
  'Copyright Infringement': ['Removal', 'Demonetization', 'Geo-Blocking'],
  'Privacy Violation': ['Removal', 'Visibility Restriction'],
  'Scam/Fraud': ['Removal', 'Account Suspension', 'Warning Label'],
  'Self-Harm Content': ['Visibility Restriction', 'Warning Label', 'Age Restriction'],
  'Political Manipulation': ['Warning Label', 'Visibility Restriction', 'Removal']
};

function generateEntry(index: number): ModerationEntry {
  const platform = weightedRandom(platformWeights as Record<string, number>);
  const category = weightedRandom(categoryWeights as Record<string, number>);
  const countryName = weightedRandom(countryWeights as Record<string, number>);
  const countryData = EU_COUNTRIES.find(c => c.name === countryName) || EU_COUNTRIES[0];
  
  // Generate dates (content created before application)
  const applicationDate = randomDate(new Date('2024-01-01'), new Date('2025-06-30'));
  const delayDays = randomInt(0, 14); // 0-14 days delay
  const contentDate = new Date(applicationDate);
  contentDate.setDate(contentDate.getDate() - delayDays);
  
  // Get platform-appropriate content type
  const contentTypes = platformContentTypes[platform] || CONTENT_TYPES;
  const contentType = randomItem(contentTypes);
  
  // Get category-appropriate decision ground and type
  const grounds = categoryGrounds[category] || [...DECISION_GROUNDS];
  const decisions = categoryDecisions[category] || [...DECISION_TYPES];
  const decisionGround = randomItem(grounds);
  const decisionType = randomItem(decisions);
  
  // Determine if it's ToS-based or legal-based
  const isLegalGround = decisionGround.includes('Art.') || 
                        decisionGround.includes('Directive') || 
                        decisionGround.includes('Regulation') ||
                        decisionGround.includes('law');
  
  const incompatibleGround = !isLegalGround ? 
    (random() > 0.3 ? 'Terms of Service breach' : 'Community guidelines violation') : 
    null;
  
  // Platform-specific automation rates
  const automationRates = platformAutomationRates[platform];
  const automatedDetection = random() < automationRates.detection;
  const automatedDecision = automatedDetection && random() < automationRates.decision;
  
  // Territorial scope (usually just the country, sometimes EU-wide)
  const territorialScope = random() > 0.85 ? 
    EU_COUNTRIES.map(c => c.code) : 
    [countryData.code];

  return {
    id: `DSA-${String(index).padStart(6, '0')}`,
    application_date: formatDate(applicationDate),
    content_date: formatDate(contentDate),
    platform_name: platform,
    category,
    decision_type: decisionType,
    decision_ground: decisionGround,
    incompatible_content_ground: incompatibleGround,
    content_type: contentType,
    automated_detection: automatedDetection,
    automated_decision: automatedDecision,
    country: countryData.name,
    territorial_scope: territorialScope,
    language: countryData.lang,
    delay_days: delayDays
  };
}

// Generate 350 mock entries
function generateMockData(): ModerationEntry[] {
  const entries: ModerationEntry[] = [];
  for (let i = 1; i <= 350; i++) {
    entries.push(generateEntry(i));
  }
  // Sort by application date descending
  return entries.sort((a, b) => 
    new Date(b.application_date).getTime() - new Date(a.application_date).getTime()
  );
}

export const mockData: ModerationEntry[] = generateMockData();

// Export unique values for filters
export const uniquePlatforms = [...new Set(mockData.map(d => d.platform_name))].sort();
export const uniqueCategories = [...new Set(mockData.map(d => d.category))].sort();
export const uniqueDecisionTypes = [...new Set(mockData.map(d => d.decision_type))].sort();
export const uniqueDecisionGrounds = [...new Set(mockData.map(d => d.decision_ground))].sort();
export const uniqueCountries = [...new Set(mockData.map(d => d.country))].sort();
export const uniqueContentTypes = [...new Set(mockData.map(d => d.content_type))].sort();
export const uniqueLanguages = [...new Set(mockData.map(d => d.language))].sort();

