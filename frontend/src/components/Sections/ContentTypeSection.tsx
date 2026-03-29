import { FileType } from 'lucide-react';
import { useFilteredData } from '../../hooks/useFilteredData';
import { ChartWithExport } from '../Charts/ChartWithExport';
import { useScreenSize } from '../../hooks/useScreenSize';
import { baseChartOptions, pieChartOptions, CHART_COLORS, DECISION_TYPE_COLORS, getResponsiveChartOptions, getResponsivePieChartOptions } from '../../utils/chartConfig';
import styles from './Section.module.css';

export function ContentTypeSection() {
  const { aggregations } = useFilteredData();
  const screenSize = useScreenSize();

  const contentTypeData = Object.entries(aggregations.byContentType)
    .sort((a, b) => b[1] - a[1]);

  const decisionTypes = [...new Set(
    Object.values(aggregations.decisionByContentType).flatMap(obj => Object.keys(obj))
  )];

  // Stacked bar: Decision type by content type
  const stackedBarOptionBase = {
    ...baseChartOptions,
    legend: {
      ...baseChartOptions.legend,
      data: decisionTypes,
    },
    grid: { ...baseChartOptions.grid, top: screenSize === 'mobile' ? '25%' : '18%' },
    xAxis: {
      type: 'category',
      data: contentTypeData.map(([name]) => {
        const trimmed = (name || 'NULL').trim();
        return trimmed.length > 15 ? trimmed.substring(0, 15) + '...' : trimmed;
      }),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11, rotate: screenSize === 'mobile' ? 45 : 0 },
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
      data: contentTypeData.map(([contentType]) => 
        aggregations.decisionByContentType[contentType]?.[type] || 0
      ),
      itemStyle: { 
        color: DECISION_TYPE_COLORS[type] || CHART_COLORS[idx % CHART_COLORS.length] 
      },
    })),
  };
  const stackedBarOption = getResponsiveChartOptions(stackedBarOptionBase, screenSize);

  // Pie: Content type distribution — legend must not inherit pieChartOptions' top/right
  // or it centers on the chart and overlaps the donut.
  const pieLegend =
    screenSize === 'mobile'
      ? {
          type: 'scroll' as const,
          orient: 'vertical' as const,
          right: 8,
          top: 'middle' as const,
          textStyle: { color: '#64748b', fontSize: 11 },
          itemWidth: 12,
          itemHeight: 12,
          itemGap: 10,
        }
      : {
          type: 'scroll' as const,
          orient: 'horizontal' as const,
          left: 'center' as const,
          bottom: 8,
          textStyle: { color: '#64748b', fontSize: 11 },
          itemWidth: 12,
          itemHeight: 12,
          itemGap: 12,
        };

  const pieOptionBase = {
    ...pieChartOptions,
    legend: pieLegend,
    series: [{
      type: 'pie',
      radius: screenSize === 'mobile' ? ['30%', '55%'] : ['38%', '62%'],
      center: screenSize === 'mobile' ? ['42%', '50%'] : ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: screenSize !== 'mobile',
        formatter: '{b}: {d}%',
        fontSize: 11,
        color: '#64748b',
      },
      labelLine: {
        show: screenSize !== 'mobile',
        length: 10,
        length2: 15,
      },
      data: contentTypeData.map(([name, value], idx) => ({
        name,
        value,
        itemStyle: { color: CHART_COLORS[idx % CHART_COLORS.length] },
      })),
    }],
  };
  const pieOption = getResponsivePieChartOptions(pieOptionBase, screenSize);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <FileType className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Content Type Analysis</h2>
          <p className={styles.subtitle}>Breakdown of moderation by content format</p>
        </div>
      </div>

      <div className={`${styles.chartGrid} ${styles.chartGrid2}`}>
        <ChartWithExport
          title="Decision Types by Content"
          subtitle="How different content types are handled"
          option={stackedBarOption}
          containerSize="default"
        />
        <ChartWithExport
          title="Content Type Distribution"
          subtitle="Share of each content format"
          option={pieOption}
          containerSize="default"
        />
      </div>
    </section>
  );
}

