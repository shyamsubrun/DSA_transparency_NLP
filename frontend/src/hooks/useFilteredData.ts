import { useMemo } from 'react';
import type { ModerationEntry, KPIStats } from '../data/types';
import { getEffectiveMockVolumeScale, scaleMockAggregations } from '../data/mockVolumeScale';
import { useModerationData, useModerationStats } from './useModeration';

export function useFilteredData() {
  const { data: response, isLoading, error, isError } = useModerationData();
  const { data: statsData } = useModerationStats();

  const filteredData = response?.data || [];

  // Stats viennent du backend maintenant
  const stats: KPIStats = statsData || {
    totalActions: 0,
    platformCount: 0,
    averageDelay: 0,
    automatedDetectionRate: 0,
    automatedDecisionRate: 0,
    countryCount: 0
  };

  // Aggregations côté client pour les graphiques
  const aggregations = useMemo(() => {
    // Actions by platform
    const byPlatform = filteredData.reduce((acc, d) => {
      acc[d.platform_name] = (acc[d.platform_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Actions by category
    const byCategory = filteredData.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Actions by decision type
    const byDecisionType = filteredData.reduce((acc, d) => {
      acc[d.decision_type] = (acc[d.decision_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Actions by decision ground
    const byDecisionGround = filteredData.reduce((acc, d) => {
      acc[d.decision_ground] = (acc[d.decision_ground] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Actions by country
    const byCountry = filteredData.reduce((acc, d) => {
      if (d.country) {
        acc[d.country] = (acc[d.country] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Actions by content type
    const byContentType = filteredData.reduce((acc, d) => {
      if (d.content_type) {
        acc[d.content_type] = (acc[d.content_type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Actions by date (for time series)
    const byDate = filteredData.reduce((acc, d) => {
      acc[d.application_date] = (acc[d.application_date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Decision type by platform (for stacked bar)
    const decisionByPlatform = filteredData.reduce((acc, d) => {
      if (!acc[d.platform_name]) acc[d.platform_name] = {};
      acc[d.platform_name][d.decision_type] = (acc[d.platform_name][d.decision_type] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Category by platform (for radar)
    const categoryByPlatform = filteredData.reduce((acc, d) => {
      if (!acc[d.platform_name]) acc[d.platform_name] = {};
      acc[d.platform_name][d.category] = (acc[d.platform_name][d.category] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Automation by platform
    const automationByPlatform = filteredData.reduce((acc, d) => {
      if (!acc[d.platform_name]) {
        acc[d.platform_name] = { 
          total: 0, 
          automatedDetection: 0, 
          automatedDecision: 0 
        };
      }
      acc[d.platform_name].total++;
      if (d.automated_detection) acc[d.platform_name].automatedDetection++;
      if (d.automated_decision) acc[d.platform_name].automatedDecision++;
      return acc;
    }, {} as Record<string, { total: number; automatedDetection: number; automatedDecision: number }>);

    // Decision type by content type
    const decisionByContentType = filteredData.reduce((acc, d) => {
      if (!d.content_type) return acc;
      if (!acc[d.content_type]) acc[d.content_type] = {};
      acc[d.content_type][d.decision_type] = (acc[d.content_type][d.decision_type] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Average delay by content type
    const delayByContentType = filteredData.reduce((acc, d) => {
      if (!d.content_type || d.delay_days === null) return acc;
      if (!acc[d.content_type]) acc[d.content_type] = { total: 0, count: 0 };
      acc[d.content_type].total += d.delay_days;
      acc[d.content_type].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // Legal vs ToS grounds
    const groundsAnalysis = filteredData.reduce((acc, d) => {
      const isLegal = d.decision_ground.includes('Art.') || 
                      d.decision_ground.includes('Directive') || 
                      d.decision_ground.includes('Regulation') ||
                      d.decision_ground.includes('law');
      if (isLegal) {
        acc.legal++;
      } else {
        acc.tos++;
      }
      return acc;
    }, { legal: 0, tos: 0 });

    // Category by decision ground (for treemap)
    const categoryByGround = filteredData.reduce((acc, d) => {
      if (!acc[d.decision_ground]) acc[d.decision_ground] = {};
      acc[d.decision_ground][d.category] = (acc[d.decision_ground][d.category] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Automation by platform and category (for heatmap)
    const automationHeatmap = filteredData.reduce((acc, d) => {
      const key = `${d.platform_name}|${d.category}`;
      if (!acc[key]) acc[key] = { total: 0, automated: 0 };
      acc[key].total++;
      if (d.automated_decision) acc[key].automated++;
      return acc;
    }, {} as Record<string, { total: number; automated: number }>);

    // Per-country details for map tooltip
    const countryDetails = filteredData.reduce((acc, d) => {
      if (!d.country) return acc;
      if (!acc[d.country]) {
        acc[d.country] = {
          total: 0,
          automatedDetection: 0,
          automatedDecision: 0,
          delaySum: 0,
          delayCount: 0,
          categories: {} as Record<string, number>,
          platforms: {} as Record<string, number>,
        };
      }
      const c = acc[d.country];
      c.total++;
      if (d.automated_detection) c.automatedDetection++;
      if (d.automated_decision) c.automatedDecision++;
      if (d.delay_days !== null) { c.delaySum += d.delay_days; c.delayCount++; }
      c.categories[d.category] = (c.categories[d.category] || 0) + 1;
      c.platforms[d.platform_name] = (c.platforms[d.platform_name] || 0) + 1;
      return acc;
    }, {} as Record<string, {
      total: number;
      automatedDetection: number;
      automatedDecision: number;
      delaySum: number;
      delayCount: number;
      categories: Record<string, number>;
      platforms: Record<string, number>;
    }>);

    const raw = {
      byPlatform,
      byCategory,
      byDecisionType,
      byDecisionGround,
      byCountry,
      byContentType,
      byDate,
      decisionByPlatform,
      categoryByPlatform,
      automationByPlatform,
      decisionByContentType,
      delayByContentType,
      groundsAnalysis,
      categoryByGround,
      automationHeatmap,
      countryDetails,
    };

    const vol = getEffectiveMockVolumeScale();
    return scaleMockAggregations(raw, vol) as typeof raw;
  }, [filteredData]);

  return {
    data: filteredData,
    stats,
    aggregations,
    isLoading,
    isError,
    error: error as Error | null
  };
}

// Helper hook to get time series data (volumeScale aligns counts with VITE_MOCK_TARGET_TOTAL in mock mode)
export function useTimeSeriesData(data: ModerationEntry[], volumeScale = 1) {
  return useMemo(() => {
    const s = volumeScale;
    const scale = (n: number) => (s === 1 ? n : Math.round(n * s));

    const byMonth = data.reduce((acc, d) => {
      const month = d.application_date.substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPlatformMonth = data.reduce((acc, d) => {
      const month = d.application_date.substring(0, 7);
      if (!acc[d.platform_name]) acc[d.platform_name] = {};
      acc[d.platform_name][month] = (acc[d.platform_name][month] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    const delayByMonth = data.reduce((acc, d) => {
      if (d.delay_days === null) return acc;
      const month = d.application_date.substring(0, 7);
      if (!acc[month]) acc[month] = { total: 0, count: 0 };
      acc[month].total += d.delay_days;
      acc[month].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const months = Object.keys(byMonth).sort();
    const platforms = [...new Set(data.map(d => d.platform_name))];

    const byMonthScaled: Record<string, number> = {};
    for (const m of months) byMonthScaled[m] = scale(byMonth[m] || 0);

    const byPlatformMonthScaled: Record<string, Record<string, number>> = {};
    for (const p of Object.keys(byPlatformMonth)) {
      byPlatformMonthScaled[p] = {};
      for (const m of Object.keys(byPlatformMonth[p])) {
        byPlatformMonthScaled[p][m] = scale(byPlatformMonth[p][m] || 0);
      }
    }

    const delayByMonthScaled: Record<string, { total: number; count: number }> = {};
    for (const m of Object.keys(delayByMonth)) {
      const d = delayByMonth[m];
      delayByMonthScaled[m] = { total: scale(d.total), count: scale(d.count) };
    }

    return {
      months,
      platforms,
      byMonth: byMonthScaled,
      byPlatformMonth: byPlatformMonthScaled,
      delayByMonth: delayByMonthScaled,
    };
  }, [data, volumeScale]);
}
