import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';
import type { ModerationEntry, KPIStats, FilterOptions, ModerationEntriesResponse } from '../types/api.types.js';

interface Filters {
  dateRange?: { start: string; end: string };
  platforms?: string[];
  categories?: string[];
  decisionTypes?: string[];
  decisionGrounds?: string[];
  countries?: string[];
  contentTypes?: string[];
  automatedDetection?: boolean;
  automatedDecision?: boolean;
}

interface GetEntriesOptions {
  page: number;
  limit: number;
  filters?: Filters;
}

// Transform Prisma model to API format
function transformEntry(entry: any): ModerationEntry {
  return {
    id: entry.id,
    application_date: entry.applicationDate.toISOString().split('T')[0],
    content_date: entry.contentDate ? entry.contentDate.toISOString().split('T')[0] : null,
    platform_name: entry.platform.name,
    category: entry.category.name,
    decision_type: entry.decisionType.name,
    decision_ground: entry.decisionGround.name,
    incompatible_content_ground: entry.incompatibleContentGround,
    content_type: entry.contentType?.name || null,
    automated_detection: entry.automatedDetection,
    automated_decision: entry.automatedDecision,
    country: entry.countryCode,
    territorial_scope: entry.territorialScope ? (entry.territorialScope as string[]) : [],
    language: entry.language,
    delay_days: entry.delayDays
  };
}

export async function getEntries(options: GetEntriesOptions): Promise<ModerationEntriesResponse> {
  const { page, limit, filters } = options;

  const where: Prisma.ModerationEntryWhereInput = {};

  if (filters?.dateRange) {
    where.applicationDate = {
      gte: new Date(filters.dateRange.start),
      lte: new Date(filters.dateRange.end)
    };
  }

  if (filters?.platforms && filters.platforms.length > 0) {
    where.platform = {
      name: { in: filters.platforms }
    };
  }

  if (filters?.categories && filters.categories.length > 0) {
    where.category = {
      name: { in: filters.categories }
    };
  }

  if (filters?.decisionTypes && filters.decisionTypes.length > 0) {
    where.decisionType = {
      name: { in: filters.decisionTypes }
    };
  }

  if (filters?.decisionGrounds && filters.decisionGrounds.length > 0) {
    where.decisionGround = {
      name: { in: filters.decisionGrounds }
    };
  }

  if (filters?.countries && filters.countries.length > 0) {
    where.countryCode = { in: filters.countries };
  }

  if (filters?.contentTypes && filters.contentTypes.length > 0) {
    where.contentType = {
      name: { in: filters.contentTypes }
    };
  }

  if (filters?.automatedDetection !== undefined) {
    where.automatedDetection = filters.automatedDetection;
  }

  if (filters?.automatedDecision !== undefined) {
    where.automatedDecision = filters.automatedDecision;
  }

  const [entries, total] = await Promise.all([
    prisma.moderationEntry.findMany({
      where,
      include: {
        platform: true,
        category: true,
        decisionType: true,
        decisionGround: true,
        contentType: true
      },
      orderBy: { applicationDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.moderationEntry.count({ where })
  ]);

  return {
    data: entries.map(transformEntry),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getStats(filters?: Filters): Promise<KPIStats> {
  const where: Prisma.ModerationEntryWhereInput = {};

  if (filters?.dateRange) {
    where.applicationDate = {
      gte: new Date(filters.dateRange.start),
      lte: new Date(filters.dateRange.end)
    };
  }

  if (filters?.platforms && filters.platforms.length > 0) {
    where.platform = { name: { in: filters.platforms } };
  }

  if (filters?.categories && filters.categories.length > 0) {
    where.category = { name: { in: filters.categories } };
  }

  const [
    totalActions,
    platformCount,
    countryCount,
    avgDelay,
    automatedDetectionCount,
    automatedDecisionCount
  ] = await Promise.all([
    prisma.moderationEntry.count({ where }),
    prisma.moderationEntry.findMany({
      where,
      distinct: ['platformId'],
      select: { platformId: true }
    }).then(r => r.length),
    prisma.moderationEntry.findMany({
      where: { ...where, countryCode: { not: null } },
      distinct: ['countryCode'],
      select: { countryCode: true }
    }).then(r => r.length),
    prisma.moderationEntry.aggregate({
      where: { ...where, delayDays: { not: null } },
      _avg: { delayDays: true }
    }).then(r => r._avg.delayDays || 0),
    prisma.moderationEntry.count({
      where: { ...where, automatedDetection: true }
    }),
    prisma.moderationEntry.count({
      where: { ...where, automatedDecision: true }
    })
  ]);

  return {
    totalActions,
    platformCount,
    averageDelay: Math.round(avgDelay * 10) / 10,
    automatedDetectionRate: totalActions > 0 
      ? Math.round((automatedDetectionCount / totalActions) * 100) 
      : 0,
    automatedDecisionRate: totalActions > 0 
      ? Math.round((automatedDecisionCount / totalActions) * 100) 
      : 0,
    countryCount
  };
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const [platforms, categories, decisionTypes, decisionGrounds, contentTypes, countries] = await Promise.all([
    prisma.platform.findMany({ orderBy: { name: 'asc' } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.decisionType.findMany({ orderBy: { name: 'asc' } }),
    prisma.decisionGround.findMany({ orderBy: { name: 'asc' } }),
    prisma.contentType.findMany({ orderBy: { name: 'asc' } }),
    prisma.moderationEntry.findMany({
      where: { countryCode: { not: null } },
      distinct: ['countryCode'],
      select: { countryCode: true },
      orderBy: { countryCode: 'asc' }
    })
  ]);

  // Get unique languages
  const languages = await prisma.moderationEntry.findMany({
    where: { language: { not: null } },
    distinct: ['language'],
    select: { language: true },
    orderBy: { language: 'asc' }
  });

  return {
    platforms: platforms.map(p => p.name),
    categories: categories.map(c => c.name),
    decisionTypes: decisionTypes.map(dt => dt.name),
    decisionGrounds: decisionGrounds.map(dg => dg.name),
    contentTypes: contentTypes.map(ct => ct.name),
    countries: countries.map(c => c.countryCode!),
    languages: languages.map(l => l.language!).filter(l => l !== 'unknown')
  };
}

