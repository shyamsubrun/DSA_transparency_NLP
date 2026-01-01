import { Building2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useFilteredData } from '../../hooks/useFilteredData';
import { useScreenSize } from '../../hooks/useScreenSize';
import { baseChartOptions, PLATFORM_COLORS, DECISION_TYPE_COLORS, CHART_COLORS, getResponsiveChartOptions } from '../../utils/chartConfig';
import styles from './Section.module.css';

export function PlatformsSection() {
  const { aggregations } = useFilteredData();
  const screenSize = useScreenSize();

  // Sort platforms by count
  const platformData = Object.entries(aggregations.byPlatform)
    .sort((a, b) => b[1] - a[1]);

  // Horizontal bar: Actions per platform
  const platformBarOptionBase = {
    ...baseChartOptions,
    grid: { ...baseChartOptions.grid, left: screenSize === 'mobile' ? '25%' : '20%' },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: platformData.map(([name]) => name).reverse(),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#1e293b', fontSize: 12, fontWeight: 500 },
    },
    series: [{
      type: 'bar',
      data: platformData.map(([name, value]) => ({
        value,
        itemStyle: { color: PLATFORM_COLORS[name] || CHART_COLORS[0] },
      })).reverse(),
      barWidth: screenSize === 'mobile' ? '50%' : '60%',
      label: {
        show: screenSize !== 'mobile',
        position: 'right',
        color: '#64748b',
        fontSize: 11,
      },
    }],
  };
  const platformBarOption = getResponsiveChartOptions(platformBarOptionBase, screenSize);

  // Stacked bar: Decision type by platform
  const decisionTypes = [...new Set(
    Object.values(aggregations.decisionByPlatform).flatMap(obj => Object.keys(obj))
  )];
  
  const stackedBarOptionBase = {
    ...baseChartOptions,
    legend: {
      ...baseChartOptions.legend,
      data: decisionTypes,
    },
    grid: { ...baseChartOptions.grid, top: screenSize === 'mobile' ? '25%' : '20%' },
    xAxis: {
      type: 'category',
      data: platformData.map(([name]) => {
        const trimmed = name.trim();
        return trimmed.length > 20 ? trimmed.substring(0, 20) + '...' : trimmed;
      }),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { 
        color: '#64748b', 
        fontSize: 11,
        rotate: screenSize === 'mobile' ? 45 : 30,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: decisionTypes.map((type, idx) => ({
      name: type,
      type: 'bar',
      stack: 'total',
      data: platformData.map(([platform]) => 
        aggregations.decisionByPlatform[platform]?.[type] || 0
      ),
      itemStyle: { 
        color: DECISION_TYPE_COLORS[type] || CHART_COLORS[idx % CHART_COLORS.length] 
      },
    })),
  };
  const stackedBarOption = getResponsiveChartOptions(stackedBarOptionBase, screenSize);

  // Radar chart: Category distribution per platform (top 3 platforms)
  const topPlatforms = platformData.slice(0, 3).map(([name]) => name);
  const categories = [...new Set(
    Object.values(aggregations.categoryByPlatform).flatMap(obj => Object.keys(obj))
  )].slice(0, 8); // Top 8 categories for readability

  const radarOptionBase = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      data: topPlatforms,
      bottom: 0,
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    radar: {
      indicator: categories.map(cat => ({ 
        name: cat.length > (screenSize === 'mobile' ? 10 : 15) ? cat.substring(0, screenSize === 'mobile' ? 10 : 15) + '...' : cat, 
        max: Math.max(...topPlatforms.map(p => aggregations.categoryByPlatform[p]?.[cat] || 0)) * 1.2 || 10
      })),
      radius: screenSize === 'mobile' ? '50%' : '60%',
      axisName: {
        color: '#64748b',
        fontSize: screenSize === 'mobile' ? 9 : 10,
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(30, 58, 95, 0.02)', 'rgba(30, 58, 95, 0.05)'],
        },
      },
      axisLine: {
        lineStyle: { color: '#e2e8f0' },
      },
      splitLine: {
        lineStyle: { color: '#e2e8f0' },
      },
    },
    series: [{
      type: 'radar',
      data: topPlatforms.map((platform, idx) => ({
        name: platform,
        value: categories.map(cat => aggregations.categoryByPlatform[platform]?.[cat] || 0),
        lineStyle: { 
          color: PLATFORM_COLORS[platform] || CHART_COLORS[idx],
          width: screenSize === 'mobile' ? 1.5 : 2,
        },
        itemStyle: { 
          color: PLATFORM_COLORS[platform] || CHART_COLORS[idx] 
        },
        areaStyle: { 
          color: PLATFORM_COLORS[platform] || CHART_COLORS[idx],
          opacity: 0.1,
        },
      })),
    }],
  };
  const radarOption = getResponsiveChartOptions(radarOptionBase, screenSize);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <Building2 className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Platform Comparison</h2>
          <p className={styles.subtitle}>Analyze moderation patterns across different platforms</p>
        </div>
      </div>

      <div className={`${styles.chartGrid} ${styles.chartGrid3}`}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Actions by Platform</h3>
              <p className={styles.chartSubtitle}>Total moderation actions</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ReactECharts option={platformBarOption} style={{ height: '100%', minHeight: 300 }} />
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Decision Types by Platform</h3>
              <p className={styles.chartSubtitle}>Stacked breakdown of decisions</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ReactECharts option={stackedBarOption} style={{ height: '100%', minHeight: 300 }} />
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Category Profile</h3>
              <p className={styles.chartSubtitle}>Top 3 platforms comparison</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ReactECharts option={radarOption} style={{ height: '100%', minHeight: 300 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

