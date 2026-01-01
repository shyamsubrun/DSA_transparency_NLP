import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';

export interface VerificationReport {
  referenceTables: {
    platforms: number;
    categories: number;
    decisionTypes: number;
    decisionGrounds: number;
    contentTypes: number;
  };
  mainData: {
    totalEntries: number;
    dateRange: { min: string; max: string };
    monthsCoverage: number;
  };
  requiredFields: {
    applicationDate: { missing: number; percent: number };
    platformId: { missing: number; percent: number };
    categoryId: { missing: number; percent: number };
    decisionTypeId: { missing: number; percent: number };
    decisionGroundId: { missing: number; percent: number };
  };
  optionalFields: {
    contentDate: { present: number; missing: number; percent: number };
    contentTypeId: { present: number; missing: number; percent: number };
    automatedDetection: { present: number; missing: number; percent: number };
    automatedDecision: { present: number; missing: number; percent: number };
    countryCode: { present: number; missing: number; percent: number };
    language: { present: number; missing: number; percent: number };
    delayDays: { present: number; missing: number; percent: number };
    territorialScope: { present: number; missing: number; percent: number };
  };
  integrity: {
    orphanPlatforms: number;
    orphanCategories: number;
    orphanDecisionTypes: number;
    orphanDecisionGrounds: number;
    orphanContentTypes: number;
  };
  distribution: {
    platforms: Array<{ name: string; count: number; percent: number }>;
    categories: Array<{ name: string; count: number; percent: number }>;
    decisionTypes: Array<{ name: string; count: number; percent: number }>;
    decisionGrounds: Array<{ name: string; count: number; percent: number }>;
    contentTypes: Array<{ name: string; count: number; percent: number }>;
  };
  alerts: string[];
}

export async function verifyDataCompleteness(): Promise<VerificationReport> {
  const totalEntries = await prisma.moderationEntry.count();
  
  // Tables de référence
  const [platformsCount, categoriesCount, decisionTypesCount, decisionGroundsCount, contentTypesCount] = await Promise.all([
    prisma.platform.count(),
    prisma.category.count(),
    prisma.decisionType.count(),
    prisma.decisionGround.count(),
    prisma.contentType.count()
  ]);

  // Données principales
  const dateStats = await prisma.moderationEntry.aggregate({
    _min: { applicationDate: true },
    _max: { applicationDate: true }
  });

  const distinctMonths = await prisma.$queryRaw<Array<{ month: string }>>`
    SELECT DISTINCT TO_CHAR(application_date, 'YYYY-MM') AS month
    FROM moderation_entries
    ORDER BY month
  `;

  // Champs obligatoires
  const requiredFieldsCounts = {
    applicationDate: await getMissingCount('application_date'),
    platformId: await getMissingCount('platform_id'),
    categoryId: await getMissingCount('category_id'),
    decisionTypeId: await getMissingCount('decision_type_id'),
    decisionGroundId: await getMissingCount('decision_ground_id')
  };

  // Champs optionnels
  const optionalFields = {
    contentDate: await getCompleteness('content_date'),
    contentTypeId: await getCompleteness('content_type_id'),
    automatedDetection: await getCompleteness('automated_detection'),
    automatedDecision: await getCompleteness('automated_decision'),
    countryCode: await getCompleteness('country_code'),
    language: await getCompleteness('language'),
    delayDays: await getCompleteness('delay_days'),
    territorialScope: await getCompleteness('territorial_scope')
  };

  // Intégrité référentielle
  const integrity = {
    orphanPlatforms: await getOrphanCount('platform_id', 'platforms'),
    orphanCategories: await getOrphanCount('category_id', 'categories'),
    orphanDecisionTypes: await getOrphanCount('decision_type_id', 'decision_types'),
    orphanDecisionGrounds: await getOrphanCount('decision_ground_id', 'decision_grounds'),
    orphanContentTypes: await getOrphanCount('content_type_id', 'content_types', true)
  };

  // Distribution
  const distribution = {
    platforms: await getDistribution('platform', 'platforms'),
    categories: await getDistribution('category', 'categories'),
    decisionTypes: await getDistribution('decisionType', 'decision_types'),
    decisionGrounds: await getDistribution('decisionGround', 'decision_grounds'),
    contentTypes: await getDistribution('contentType', 'content_types', true)
  };

  // Alertes
  const alerts: string[] = [];
  
  if (requiredFieldsCounts.applicationDate > 0) {
    alerts.push(`Champ obligatoire manquant: application_date (${requiredFieldsCounts.applicationDate} entrées)`);
  }
  
  if (requiredFieldsCounts.platformId > 0) {
    alerts.push(`Champ obligatoire manquant: platform_id (${requiredFieldsCounts.platformId} entrées)`);
  }
  
  if (requiredFieldsCounts.categoryId > 0) {
    alerts.push(`Champ obligatoire manquant: category_id (${requiredFieldsCounts.categoryId} entrées)`);
  }
  
  if (requiredFieldsCounts.decisionTypeId > 0) {
    alerts.push(`Champ obligatoire manquant: decision_type_id (${requiredFieldsCounts.decisionTypeId} entrées)`);
  }
  
  if (requiredFieldsCounts.decisionGroundId > 0) {
    alerts.push(`Champ obligatoire manquant: decision_ground_id (${requiredFieldsCounts.decisionGroundId} entrées)`);
  }
  
  if (integrity.orphanPlatforms > 0) {
    alerts.push(`Orphans détectés: ${integrity.orphanPlatforms} platform_id invalides`);
  }
  
  if (distinctMonths.length < 3) {
    alerts.push(`Couverture temporelle insuffisante: seulement ${distinctMonths.length} mois de données`);
  }
  
  if (distribution.platforms.length < 2) {
    alerts.push(`Diversité des plateformes insuffisante: seulement ${distribution.platforms.length} plateforme(s)`);
  }

  return {
    referenceTables: {
      platforms: platformsCount,
      categories: categoriesCount,
      decisionTypes: decisionTypesCount,
      decisionGrounds: decisionGroundsCount,
      contentTypes: contentTypesCount
    },
    mainData: {
      totalEntries,
      dateRange: {
        min: dateStats._min.applicationDate?.toISOString().split('T')[0] || '',
        max: dateStats._max.applicationDate?.toISOString().split('T')[0] || ''
      },
      monthsCoverage: distinctMonths.length
    },
    requiredFields: {
      applicationDate: {
        missing: requiredFieldsCounts.applicationDate,
        percent: totalEntries > 0 ? Math.round((requiredFieldsCounts.applicationDate / totalEntries) * 10000) / 100 : 0
      },
      platformId: {
        missing: requiredFieldsCounts.platformId,
        percent: totalEntries > 0 ? Math.round((requiredFieldsCounts.platformId / totalEntries) * 10000) / 100 : 0
      },
      categoryId: {
        missing: requiredFieldsCounts.categoryId,
        percent: totalEntries > 0 ? Math.round((requiredFieldsCounts.categoryId / totalEntries) * 10000) / 100 : 0
      },
      decisionTypeId: {
        missing: requiredFieldsCounts.decisionTypeId,
        percent: totalEntries > 0 ? Math.round((requiredFieldsCounts.decisionTypeId / totalEntries) * 10000) / 100 : 0
      },
      decisionGroundId: {
        missing: requiredFieldsCounts.decisionGroundId,
        percent: totalEntries > 0 ? Math.round((requiredFieldsCounts.decisionGroundId / totalEntries) * 10000) / 100 : 0
      }
    },
    optionalFields,
    integrity,
    distribution,
    alerts
  };
}

async function getMissingCount(field: string): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM moderation_entries
    WHERE ${Prisma.raw(field)} IS NULL
  `;
  return Number(result[0]?.count || 0);
}

async function getCompleteness(field: string): Promise<{ present: number; missing: number; percent: number }> {
  const total = await prisma.moderationEntry.count();
  const present = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM moderation_entries
    WHERE ${Prisma.raw(field)} IS NOT NULL
  `;
  const presentCount = Number(present[0]?.count || 0);
  const missingCount = total - presentCount;
  
  return {
    present: presentCount,
    missing: missingCount,
    percent: total > 0 ? Math.round((presentCount / total) * 10000) / 100 : 0
  };
}

async function getOrphanCount(field: string, table: string, nullable: boolean = false): Promise<number> {
  if (nullable) {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM moderation_entries me
      LEFT JOIN ${Prisma.raw(table)} t ON me.${Prisma.raw(field)} = t.id
      WHERE me.${Prisma.raw(field)} IS NOT NULL AND t.id IS NULL
    `;
    return Number(result[0]?.count || 0);
  } else {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM moderation_entries me
      LEFT JOIN ${Prisma.raw(table)} t ON me.${Prisma.raw(field)} = t.id
      WHERE t.id IS NULL
    `;
    return Number(result[0]?.count || 0);
  }
}

async function getDistribution(relation: string, table: string, nullable: boolean = false): Promise<Array<{ name: string; count: number; percent: number }>> {
  const total = await prisma.moderationEntry.count();
  
  // Mapper les noms de relations aux noms de colonnes
  const fieldMap: Record<string, string> = {
    'platform': 'platform_id',
    'category': 'category_id',
    'decisionType': 'decision_type_id',
    'decisionGround': 'decision_ground_id',
    'contentType': 'content_type_id'
  };
  
  const fieldName = fieldMap[relation] || `${relation.toLowerCase()}_id`;
  
  if (nullable) {
    const result = await prisma.$queryRaw<Array<{ name: string | null; count: bigint }>>`
      SELECT COALESCE(t.name, 'NULL') AS name, COUNT(*)::bigint AS count
      FROM moderation_entries me
      LEFT JOIN ${Prisma.raw(table)} t ON me.${Prisma.raw(fieldName)} = t.id
      GROUP BY t.name
      ORDER BY count DESC
      LIMIT 20
    `;
    
    return result.map(r => ({
      name: r.name || 'NULL',
      count: Number(r.count),
      percent: total > 0 ? Math.round((Number(r.count) / total) * 10000) / 100 : 0
    }));
  } else {
    const result = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
      SELECT t.name, COUNT(*)::bigint AS count
      FROM moderation_entries me
      JOIN ${Prisma.raw(table)} t ON me.${Prisma.raw(fieldName)} = t.id
      GROUP BY t.name
      ORDER BY count DESC
      LIMIT 20
    `;
    
    return result.map(r => ({
      name: r.name,
      count: Number(r.count),
      percent: total > 0 ? Math.round((Number(r.count) / total) * 10000) / 100 : 0
    }));
  }
}

