import { Scale } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useFilteredData } from '../../hooks/useFilteredData';
import { baseChartOptions, CHART_COLORS } from '../../utils/chartConfig';
import styles from './Section.module.css';

export function LegalGroundsSection() {
  const { aggregations } = useFilteredData();

  // Sort grounds by count
  const groundsData = Object.entries(aggregations.byDecisionGround)
    .sort((a, b) => b[1] - a[1]);

  // Horizontal bar: Top legal grounds
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

  // Grouped bar: Legal vs ToS grounds
  const legalVsTosOption = {
    ...baseChartOptions,
    legend: {
      data: ['Legal Basis', 'Terms of Service'],
      top: 0,
      textStyle: { color: '#64748b', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: ['Grounds Distribution'],
      axisLine: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Legal Basis',
        type: 'bar',
        data: [aggregations.groundsAnalysis.legal],
        itemStyle: { color: '#1e3a5f', borderRadius: [4, 4, 0, 0] },
        barWidth: 80,
        label: {
          show: true,
          position: 'top',
          color: '#1e293b',
          fontSize: 14,
          fontWeight: 600,
        },
      },
      {
        name: 'Terms of Service',
        type: 'bar',
        data: [aggregations.groundsAnalysis.tos],
        itemStyle: { color: '#0d9488', borderRadius: [4, 4, 0, 0] },
        barWidth: 80,
        label: {
          show: true,
          position: 'top',
          color: '#1e293b',
          fontSize: 14,
          fontWeight: 600,
        },
      },
    ],
  };

  // Treemap: Category by decision ground
  const treemapData = Object.entries(aggregations.categoryByGround).map(([ground, categories]) => {
    const trimmedGround = ground.trim();
    return {
      name: trimmedGround.length > 25 ? trimmedGround.substring(0, 25) + '...' : trimmedGround,
      children: Object.entries(categories).map(([cat, count]) => ({
        name: cat.trim(),
        value: count,
      })),
    };
  });

  const treemapOption = {
    tooltip: {
      formatter: (info: { name: string; value: number; treePathInfo: Array<{ name: string }> }) => {
        const path = info.treePathInfo.map(p => p.name).join(' → ');
        return `${path}<br/>Count: <strong>${info.value}</strong>`;
      },
    },
    series: [{
      type: 'treemap',
      data: treemapData,
      roam: false,
      nodeClick: false,
      breadcrumb: {
        show: true,
        height: 22,
        itemStyle: {
          color: '#f1f5f9',
          borderColor: '#e2e8f0',
          textStyle: {
            color: '#64748b',
            fontSize: 11,
          },
        },
      },
      levels: [
        {
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
            gapWidth: 2,
          },
          upperLabel: {
            show: true,
            height: 24,
            color: '#fff',
            fontSize: 11,
            fontWeight: 500,
            backgroundColor: 'transparent',
          },
        },
        {
          colorSaturation: [0.35, 0.5],
          itemStyle: {
            borderColorSaturation: 0.6,
            gapWidth: 1,
          },
        },
      ],
      label: {
        show: true,
        formatter: '{b}',
        fontSize: 10,
        color: '#fff',
      },
      itemStyle: {
        borderColor: '#fff',
      },
    }],
    color: CHART_COLORS,
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
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Top Decision Grounds</h3>
              <p className={styles.chartSubtitle}>Most frequently cited legal bases</p>
            </div>
          </div>
          <div className={styles.chartContainerLg}>
            <ReactECharts option={groundsBarOption} style={{ height: '100%', minHeight: 400 }} />
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Legal Basis vs Terms of Service</h3>
              <p className={styles.chartSubtitle}>Distribution of grounds type</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ReactECharts option={legalVsTosOption} style={{ height: '100%', minHeight: 300 }} />
          </div>
        </div>

        <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Categories by Decision Ground</h3>
              <p className={styles.chartSubtitle}>Hierarchical view of content categories within each legal ground</p>
            </div>
          </div>
          <div className={styles.chartContainerLg}>
            <ReactECharts option={treemapOption} style={{ height: '100%', minHeight: 400 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

