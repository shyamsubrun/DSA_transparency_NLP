import { Scale } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { useFilteredData } from '../../hooks/useFilteredData';
import { ChartWithExport } from '../Charts/ChartWithExport';
import { baseChartOptions, CHART_COLORS } from '../../utils/chartConfig';
import styles from './Section.module.css';

export function LegalGroundsSection() {
  const { aggregations } = useFilteredData();

  const groundsData = Object.entries(aggregations.byDecisionGround)
    .sort((a, b) => b[1] - a[1]);

  const groundsBarOption = {
    ...baseChartOptions,
    grid: { ...baseChartOptions.grid, left: '40%' },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: groundsData.slice(0, 10).map(([name]) => {
        const trimmed = name.trim();
        return trimmed.length > 35 ? trimmed.substring(0, 35) + '...' : trimmed;
      }).reverse(),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { 
        color: '#1e293b', 
        fontSize: 11,
        width: 150,
        overflow: 'truncate',
      },
    },
    tooltip: {
      ...baseChartOptions.tooltip,
      formatter: (params: { name: string; value: number }) => {
        const trimmedParam = params.name.replace('...', '').trim();
        const fullName = groundsData.find(([name]) => 
          name.trim().startsWith(trimmedParam)
        )?.[0]?.trim() || params.name.trim();
        return `${fullName}<br/>Actions: <strong>${params.value}</strong>`;
      },
    },
    series: [{
      type: 'bar',
      data: groundsData.slice(0, 10).map(([, value], idx) => ({
        value,
        itemStyle: { 
          color: CHART_COLORS[idx % CHART_COLORS.length],
          borderRadius: [0, 4, 4, 0],
        },
      })).reverse(),
      barWidth: '65%',
      label: {
        show: true,
        position: 'right',
        color: '#64748b',
        fontSize: 11,
        fontWeight: 500,
      },
    }],
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <Scale className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Legal Grounds Analysis</h2>
          <p className={styles.subtitle}>Examine the legal basis for moderation decisions — critical for legal compliance</p>
        </div>
      </div>

      <div className={`${styles.chartGrid} ${styles.chartGrid2}`}>
        <ChartWithExport
          title="Top Decision Grounds"
          subtitle="Most frequently cited legal bases"
          option={groundsBarOption as unknown as EChartsOption}
          containerSize="lg"
          fullWidth
        />
      </div>
    </section>
  );
}
