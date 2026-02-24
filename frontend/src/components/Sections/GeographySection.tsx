import { Globe } from 'lucide-react';
import { useFilteredData } from '../../hooks/useFilteredData';
import { ChartWithExport } from '../Charts/ChartWithExport';
import { EuropeMapChart } from '../Charts/EuropeMapChart';
import { baseChartOptions, CHART_COLORS } from '../../utils/chartConfig';
import styles from './Section.module.css';

export function GeographySection() {
  const { aggregations, stats, data } = useFilteredData();

  const countryData = Object.entries(aggregations.byCountry)
    .sort((a, b) => b[1] - a[1]);

  // Horizontal bar: Top countries
  const countryBarOption = {
    ...baseChartOptions,
    grid: { ...baseChartOptions.grid, left: '25%' },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: countryData.slice(0, 12).map(([name]) => name).reverse(),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#1e293b', fontSize: 11, fontWeight: 500 },
    },
    series: [{
      type: 'bar',
      data: countryData.slice(0, 12).map(([, value], idx) => ({
        value,
        itemStyle: { 
          color: CHART_COLORS[idx % CHART_COLORS.length],
          borderRadius: [0, 4, 4, 0],
        },
      })).reverse(),
      barWidth: '60%',
      label: {
        show: true,
        position: 'right',
        color: '#64748b',
        fontSize: 11,
      },
    }],
  };

  // Language distribution from actual data
  const languageData = data.reduce((acc, entry) => {
    if (entry.language) {
      acc[entry.language] = (acc[entry.language] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const languageChartData = Object.entries(languageData)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const languageOption = {
    ...baseChartOptions,
    xAxis: {
      type: 'category',
      data: languageChartData.map(([lang]) => lang.toUpperCase()),
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
      type: 'bar',
      data: languageChartData.map(([, value], idx) => ({
        value,
        itemStyle: { 
          color: CHART_COLORS[idx % CHART_COLORS.length],
          borderRadius: [4, 4, 0, 0],
        },
      })),
      barWidth: '50%',
    }],
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <Globe className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Geographic Distribution</h2>
          <p className={styles.subtitle}>Moderation activity across {stats.countryCount} EU member states</p>
        </div>
      </div>

      <div className={`${styles.chartGrid} ${styles.chartGrid2}`}>
        <EuropeMapChart
          byCountry={aggregations.byCountry}
          countryDetails={aggregations.countryDetails}
        />
        <ChartWithExport
          title="Top Affected Countries"
          subtitle="Ranked by moderation actions"
          option={countryBarOption}
          containerSize="lg"
        />
        <ChartWithExport
          title="Actions by Language"
          subtitle="Content language distribution"
          option={languageOption}
          containerSize="default"
          fullWidth
        />
      </div>
    </section>
  );
}
