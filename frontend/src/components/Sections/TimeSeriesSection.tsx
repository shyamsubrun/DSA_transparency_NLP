import { TrendingUp } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useFilteredData, useTimeSeriesData } from '../../hooks/useFilteredData';
import { useScreenSize } from '../../hooks/useScreenSize';
import { baseChartOptions, CHART_COLORS, PLATFORM_COLORS, getResponsiveChartOptions } from '../../utils/chartConfig';
import styles from './Section.module.css';

export function TimeSeriesSection() {
  const { data } = useFilteredData();
  const timeSeries = useTimeSeriesData(data);
  const screenSize = useScreenSize();

  // Line chart: Total actions over time
  const totalActionsOptionBase = {
    ...baseChartOptions,
    title: {
      show: false,
    },
    xAxis: {
      type: 'category',
      data: timeSeries.months,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
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
    grid: { ...baseChartOptions.grid, top: screenSize === 'mobile' ? '25%' : '15%' },
    xAxis: {
      type: 'category',
      data: timeSeries.months,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
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
    xAxis: {
      type: 'category',
      data: timeSeries.months,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Days',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
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
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Total Moderation Actions</h3>
              <p className={styles.chartSubtitle}>Monthly trend of all actions</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ReactECharts option={totalActionsOption} style={{ height: '100%', minHeight: 300 }} />
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Average Response Delay</h3>
              <p className={styles.chartSubtitle}>Days between content creation and action</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ReactECharts option={delayEvolutionOption} style={{ height: '100%', minHeight: 300 }} />
          </div>
        </div>

        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Actions by Platform</h3>
              <p className={styles.chartSubtitle}>Monthly breakdown per platform</p>
            </div>
          </div>
          <div className={styles.chartContainerLg}>
            <ReactECharts option={platformSeriesOption} style={{ height: '100%', minHeight: 400 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

