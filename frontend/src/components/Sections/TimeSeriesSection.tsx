import { TrendingUp } from 'lucide-react';
import { getEffectiveMockVolumeScale } from '../../data/mockVolumeScale';
import { useFilteredData, useTimeSeriesData } from '../../hooks/useFilteredData';
import { ChartWithExport } from '../Charts/ChartWithExport';
import { useScreenSize } from '../../hooks/useScreenSize';
import {
  axisNameTextStyle,
  baseChartOptions,
  CHART_COLORS,
  PLATFORM_COLORS,
  getResponsiveChartOptions,
} from '../../utils/chartConfig';
import styles from './Section.module.css';

export function TimeSeriesSection() {
  const { data } = useFilteredData();
  const timeSeries = useTimeSeriesData(data, getEffectiveMockVolumeScale());
  const screenSize = useScreenSize();

  // Line chart: Total actions over time
  const totalActionsOptionBase = {
    ...baseChartOptions,
    grid: { ...baseChartOptions.grid, bottom: '10%' },
    title: {
      show: false,
    },
    xAxis: {
      type: 'category',
      name: 'Month',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: axisNameTextStyle,
      data: timeSeries.months,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Actions',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: axisNameTextStyle,
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [{
      name: 'Moderation Actions',
      type: 'line',
      data: timeSeries.months.map(m => timeSeries.byMonth[m] || 0),
      smooth: true,
      symbol: 'circle',
      symbolSize: screenSize === 'mobile' ? 6 : 8,
      lineStyle: { width: screenSize === 'mobile' ? 2 : 3, color: CHART_COLORS[0] },
      itemStyle: { color: CHART_COLORS[0] },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(30, 58, 95, 0.3)' },
            { offset: 1, color: 'rgba(30, 58, 95, 0.05)' },
          ],
        },
      },
    }],
  };
  const totalActionsOption = getResponsiveChartOptions(totalActionsOptionBase, screenSize);

  // Multi-series line chart: Actions by platform
  const platformSeriesOptionBase = {
    ...baseChartOptions,
    legend: {
      ...baseChartOptions.legend,
      data: timeSeries.platforms,
    },
    grid: { ...baseChartOptions.grid, top: screenSize === 'mobile' ? '25%' : '15%', bottom: '10%' },
    xAxis: {
      type: 'category',
      name: 'Month',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: axisNameTextStyle,
      data: timeSeries.months,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Actions',
      nameLocation: 'middle',
      nameGap: 40,
      nameTextStyle: axisNameTextStyle,
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: timeSeries.platforms.map((platform) => ({
      name: platform,
      type: 'line',
      data: timeSeries.months.map(m => timeSeries.byPlatformMonth[platform]?.[m] || 0),
      smooth: true,
      symbol: 'circle',
      symbolSize: screenSize === 'mobile' ? 4 : 6,
      lineStyle: { 
        width: screenSize === 'mobile' ? 1.5 : 2, 
        color: PLATFORM_COLORS[platform] || CHART_COLORS[timeSeries.platforms.indexOf(platform) % CHART_COLORS.length] 
      },
      itemStyle: { 
        color: PLATFORM_COLORS[platform] || CHART_COLORS[timeSeries.platforms.indexOf(platform) % CHART_COLORS.length] 
      },
    })),
  };
  const platformSeriesOption = getResponsiveChartOptions(platformSeriesOptionBase, screenSize);

  // Area chart: Delay evolution
  const delayEvolutionOptionBase = {
    ...baseChartOptions,
    grid: { ...baseChartOptions.grid, bottom: '10%' },
    xAxis: {
      type: 'category',
      name: 'Month',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: axisNameTextStyle,
      data: timeSeries.months,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Days (avg. delay)',
      nameLocation: 'middle',
      nameGap: 44,
      nameTextStyle: axisNameTextStyle,
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [{
      name: 'Average Delay',
      type: 'line',
      data: timeSeries.months.map(m => {
        const d = timeSeries.delayByMonth[m];
        return d ? Math.round((d.total / d.count) * 10) / 10 : 0;
      }),
      smooth: true,
      symbol: 'circle',
      symbolSize: screenSize === 'mobile' ? 6 : 8,
      lineStyle: { width: screenSize === 'mobile' ? 2 : 3, color: '#f59e0b' },
      itemStyle: { color: '#f59e0b' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
          ],
        },
      },
    }],
  };
  const delayEvolutionOption = getResponsiveChartOptions(delayEvolutionOptionBase, screenSize);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <TrendingUp className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Time Series Analysis</h2>
          <p className={styles.subtitle}>Moderation activity trends over time</p>
        </div>
      </div>

      <div className={`${styles.chartGrid} ${styles.chartGrid2}`}>
        <ChartWithExport
          title="Total Moderation Actions"
          subtitle="Monthly trend of all actions"
          option={totalActionsOption}
          containerSize="default"
        />
        <ChartWithExport
          title="Average Response Delay"
          subtitle="Days between content creation and action"
          option={delayEvolutionOption}
          containerSize="default"
        />
        <ChartWithExport
          title="Actions by Platform"
          subtitle="Monthly breakdown per platform"
          option={platformSeriesOption}
          containerSize="lg"
          fullWidth
        />
      </div>
    </section>
  );
}

