import { useMemo } from 'react';
import type { ModerationEntry, KPIStats } from '../data/types';
import { mockData } from '../data/mockData';
import { useFilters } from '../context/FilterContext';

export function useFilteredData() {
  const { filters } = useFilters();

  const filteredData = useMemo(() => {
    // Vérifier que mockData est chargé
    if (!mockData || mockData.length === 0) {
      console.error('Mock data is empty or not loaded');
      return [];
    }
    
    let data = [...mockData];

    // Date range filter
    if (filters.dateRange) {
      data = data.filter(d =>
        d.application_date >= filters.dateRange!.start &&
        d.application_date <= filters.dateRange!.end
      );
    }

    // Platform filter
    if (filters.platforms.length > 0) {
      data = data.filter(d => filters.platforms.includes(d.platform_name));
    }

    // Category filter
    if (filters.categories.length > 0) {
      data = data.filter(d => filters.categories.includes(d.category));
    }

    // Decision type filter
    if (filters.decisionTypes.length > 0) {
      data = data.filter(d => filters.decisionTypes.includes(d.decision_type));
    }

    // Decision ground filter
    if (filters.decisionGrounds.length > 0) {
      data = data.filter(d => filters.decisionGrounds.includes(d.decision_ground));
    }

    // Country filter
    if (filters.countries.length > 0) {
      data = data.filter(d => filters.countries.includes(d.country));
    }

    // Content type filter
    if (filters.contentTypes.length > 0) {
      data = data.filter(d => filters.contentTypes.includes(d.content_type));
    }

    // Automated detection filter
    if (filters.automatedDetection !== null) {
      data = data.filter(d => d.automated_detection === filters.automatedDetection);
    }

    // Automated decision filter
    if (filters.automatedDecision !== null) {
      data = data.filter(d => d.automated_decision === filters.automatedDecision);
    }

    return data;
  }, [filters]);

  // Compute KPI statistics
  const stats: KPIStats = useMemo(() => {
    const totalActions = filteredData.length;
    const platforms = new Set(filteredData.map(d => d.platform_name));
    const countries = new Set(filteredData.map(d => d.country));
    
    const averageDelay = totalActions > 0
      ? filteredData.reduce((sum, d) => sum + d.delay_days, 0) / totalActions
      : 0;
    
    const automatedDetectionCount = filteredData.filter(d => d.automated_detection).length;
    const automatedDecisionCount = filteredData.filter(d => d.automated_decision).length;

    return {
      totalActions,
      platformCount: platforms.size,
      averageDelay: Math.round(averageDelay * 10) / 10,
      automatedDetectionRate: totalActions > 0
        ? Math.round((automatedDetectionCount / totalActions) * 100)
        : 0,
      automatedDecisionRate: totalActions > 0
        ? Math.round((automatedDecisionCount / totalActions) * 100)
        : 0,
      countryCount: countries.size
    };
  }, [filteredData]);

  // Aggregated data for charts
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
      acc[d.country] = (acc[d.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Actions by content type
    const byContentType = filteredData.reduce((acc, d) => {
      acc[d.content_type] = (acc[d.content_type] || 0) + 1;
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
      if (!acc[d.content_type]) acc[d.content_type] = {};
      acc[d.content_type][d.decision_type] = (acc[d.content_type][d.decision_type] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Average delay by content type
    const delayByContentType = filteredData.reduce((acc, d) => {
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

    return {
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
      automationHeatmap
    };
  }, [filteredData]);

  return {
    data: filteredData,
    stats,
    aggregations
  };
}

// Helper hook to get time series data
export function useTimeSeriesData(data: ModerationEntry[]) {
  return useMemo(() => {
    // Group by month for cleaner visualization
    const byMonth = data.reduce((acc, d) => {
      const month = d.application_date.substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // By platform and month
    const byPlatformMonth = data.reduce((acc, d) => {
      const month = d.application_date.substring(0, 7);
      if (!acc[d.platform_name]) acc[d.platform_name] = {};
      acc[d.platform_name][month] = (acc[d.platform_name][month] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Average delay by month
    const delayByMonth = data.reduce((acc, d) => {
      const month = d.application_date.substring(0, 7);
      if (!acc[month]) acc[month] = { total: 0, count: 0 };
      acc[month].total += d.delay_days;
      acc[month].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const months = Object.keys(byMonth).sort();
    const platforms = [...new Set(data.map(d => d.platform_name))];

    return {
      months,
      platforms,
      byMonth,
      byPlatformMonth,
      delayByMonth
    };
  }, [data]);
}

