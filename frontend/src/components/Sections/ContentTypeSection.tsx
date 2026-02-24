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

  // Pie: Content type distribution
  const pieOptionBase = {
    ...pieChartOptions,
    legend: {
      ...pieChartOptions.legend,
      orient: screenSize === 'mobile' ? 'vertical' : 'horizontal',
      bottom: 0,
    },
    series: [{
      type: 'pie',
      radius: screenSize === 'mobile' ? ['30%', '60%'] : ['40%', '70%'],
      center: screenSize === 'mobile' ? ['50%', '40%'] : ['50%', '45%'],
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

  // Scatter: Content type vs average delay
  const delayData = Object.entries(aggregations.delayByContentType).map(([type, data]) => ({
    type,
    avgDelay: Math.round((data.total / data.count) * 10) / 10,
    count: data.count,
  }));

  const scatterOptionBase = {
    ...baseChartOptions,
    tooltip: {
      trigger: 'item',
      formatter: (params: { data: [string, number, number] }) => {
        return `${params.data[0]}<br/>Avg Delay: <strong>${params.data[1]} days</strong><br/>Actions: ${params.data[2]}`;
      },
    },
    xAxis: {
      type: 'category',
      data: delayData.map(d => d.type),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11, rotate: screenSize === 'mobile' ? 45 : 0 },
    },
    yAxis: {
      type: 'value',
      name: 'Average Delay (days)',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [{
      type: 'scatter',
      data: delayData.map((d, idx) => ({
        value: [d.type, d.avgDelay, d.count],
        symbolSize: screenSize === 'mobile' 
          ? Math.min(Math.max(d.count / 8, 10), 30)
          : Math.min(Math.max(d.count / 5, 15), 50),
        itemStyle: { color: CHART_COLORS[idx % CHART_COLORS.length] },
      })),
      label: {
        show: screenSize !== 'mobile',
        formatter: (params: { data: { value: [string, number, number] } }) => `${params.data.value[1]}d`,
        position: 'top',
        fontSize: 10,
        color: '#64748b',
      },
    }],
  };
  const scatterOption = getResponsiveChartOptions(scatterOptionBase, screenSize);

  // Content type efficiency (delay vs volume)
  const efficiencyOptionBase = {
    ...baseChartOptions,
    legend: {
      show: false,
    },
    xAxis: {
      type: 'value',
      name: 'Volume (actions)',
      nameLocation: 'center',
      nameGap: screenSize === 'mobile' ? 20 : 30,
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Avg Delay (days)',
      nameTextStyle: { color: '#64748b', fontSize: 11 },
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [{
      type: 'scatter',
      symbolSize: screenSize === 'mobile' ? 15 : 20,
      data: delayData.map((d, idx) => ({
        value: [d.count, d.avgDelay],
        name: d.type,
        itemStyle: { 
          color: CHART_COLORS[idx % CHART_COLORS.length],
          shadowBlur: screenSize === 'mobile' ? 5 : 10,
          shadowColor: 'rgba(0,0,0,0.1)',
        },
      })),
      label: {
        show: screenSize !== 'mobile',
        formatter: (params: { name: string }) => params.name,
        position: 'right',
        fontSize: 10,
        color: '#64748b',
      },
    }],
  };
  const efficiencyOption = getResponsiveChartOptions(efficiencyOptionBase, screenSize);

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
        <ChartWithExport
          title="Response Delay by Content Type"
          subtitle="Average days to action (bubble size = volume)"
          option={scatterOption}
          containerSize="default"
        />
        <ChartWithExport
          title="Volume vs Delay"
          subtitle="Efficiency analysis by content type"
          option={efficiencyOption}
          containerSize="default"
        />
      </div>
    </section>
  );
}

