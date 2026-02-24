import { Bot } from 'lucide-react';
import { useFilteredData } from '../../hooks/useFilteredData';
import { ChartWithExport } from '../Charts/ChartWithExport';
import { pieChartOptions, CHART_COLORS, PLATFORM_COLORS } from '../../utils/chartConfig';
import styles from './Section.module.css';

export function AutomationSection() {
  const { stats, aggregations, data } = useFilteredData();

  // Donut: Automated detection
  const detectionPieOption = {
    ...pieChartOptions,
    legend: {
      ...pieChartOptions.legend,
      orient: 'horizontal',
      bottom: 0,
      right: 'center',
    },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        position: 'center',
        formatter: () => `${stats.automatedDetectionRate}%\nAutomated`,
        fontSize: 18,
        fontWeight: 600,
        color: '#1e293b',
        lineHeight: 24,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 20,
          fontWeight: 700,
        },
      },
      labelLine: { show: false },
      data: [
        { 
          value: data.filter(d => d.automated_detection).length, 
          name: 'AI Detected',
          itemStyle: { color: '#10b981' },
        },
        { 
          value: data.filter(d => !d.automated_detection).length, 
          name: 'Human Detected',
          itemStyle: { color: '#64748b' },
        },
      ],
    }],
  };

  // Donut: Automated decision
  const decisionPieOption = {
    ...pieChartOptions,
    legend: {
      ...pieChartOptions.legend,
      orient: 'horizontal',
      bottom: 0,
      right: 'center',
    },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        position: 'center',
        formatter: () => `${stats.automatedDecisionRate}%\nAutomated`,
        fontSize: 18,
        fontWeight: 600,
        color: '#1e293b',
        lineHeight: 24,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 20,
          fontWeight: 700,
        },
      },
      labelLine: { show: false },
      data: [
        { 
          value: data.filter(d => d.automated_decision).length, 
          name: 'AI Decision',
          itemStyle: { color: '#8b5cf6' },
        },
        { 
          value: data.filter(d => !d.automated_decision).length, 
          name: 'Human Decision',
          itemStyle: { color: '#64748b' },
        },
      ],
    }],
  };

  // Heatmap: Automation by platform and category
  const platforms = Object.keys(aggregations.automationByPlatform).sort();
  const categories = [...new Set(data.map(d => d.category))].sort().slice(0, 8);

  const heatmapData: [number, number, number][] = [];
  platforms.forEach((platform, pIdx) => {
    categories.forEach((category, cIdx) => {
      const key = `${platform}|${category}`;
      const record = aggregations.automationHeatmap[key];
      const rate = record && record.total > 0 
        ? Math.round((record.automated / record.total) * 100) 
        : 0;
      heatmapData.push([cIdx, pIdx, rate]);
    });
  });

  const heatmapOption = {
    tooltip: {
      position: 'top',
      formatter: (params: { data: [number, number, number] }) => {
        const [catIdx, platIdx, rate] = params.data;
        return `${platforms[platIdx]} × ${categories[catIdx]}<br/>Automation Rate: <strong>${rate}%</strong>`;
      },
    },
    grid: {
      left: '18%',
      right: '10%',
      top: '5%',
      bottom: '15%',
    },
    xAxis: {
      type: 'category',
      data: categories.map(c => c.length > 12 ? c.substring(0, 12) + '...' : c),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { 
        color: '#64748b', 
        fontSize: 10,
        rotate: 45,
      },
      splitArea: { show: false },
    },
    yAxis: {
      type: 'category',
      data: platforms,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { 
        color: '#1e293b', 
        fontSize: 11,
        formatter: (value: string) => value,
      },
      splitArea: { show: false },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: ['#f1f5f9', '#a5b4fc', '#6366f1', '#4338ca'],
      },
      textStyle: { color: '#64748b', fontSize: 10 },
    },
    series: [{
      type: 'heatmap',
      data: heatmapData,
      label: {
        show: true,
        formatter: (params: { data: [number, number, number] }) => `${params.data[2]}%`,
        fontSize: 9,
        color: (params: { data: [number, number, number] }) => params.data[2] > 50 ? '#fff' : '#1e293b',
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
      },
    }],
  };

  // Platform automation rates bar chart
  const platformAutomationData = Object.entries(aggregations.automationByPlatform)
    .map(([platform, stats]) => ({
      platform,
      detectionRate: Math.round((stats.automatedDetection / stats.total) * 100),
      decisionRate: Math.round((stats.automatedDecision / stats.total) * 100),
    }))
    .sort((a, b) => b.detectionRate - a.detectionRate);

  const platformAutomationOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['Detection Rate', 'Decision Rate'],
      top: 0,
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: platformAutomationData.map(d => d.platform),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11, rotate: 30 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        name: 'Detection Rate',
        type: 'bar',
        data: platformAutomationData.map(d => ({
          value: d.detectionRate,
          itemStyle: { 
            color: PLATFORM_COLORS[d.platform] || CHART_COLORS[0],
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barGap: '10%',
      },
      {
        name: 'Decision Rate',
        type: 'bar',
        data: platformAutomationData.map(d => ({
          value: d.decisionRate,
          itemStyle: { 
            color: PLATFORM_COLORS[d.platform] || CHART_COLORS[0],
            opacity: 0.5,
            borderRadius: [4, 4, 0, 0],
          },
        })),
      },
    ],
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <Bot className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Automation Analysis</h2>
          <p className={styles.subtitle}>AI vs human involvement in content moderation</p>
        </div>
      </div>

      <div className={`${styles.chartGrid} ${styles.chartGrid2}`}>
        <ChartWithExport
          title="Automated Detection"
          subtitle="Content flagged by AI systems"
          option={detectionPieOption}
          containerSize="default"
        />
        <ChartWithExport
          title="Automated Decisions"
          subtitle="Decisions made without human review"
          option={decisionPieOption}
          containerSize="default"
        />
        <ChartWithExport
          title="Automation by Platform"
          subtitle="Detection and decision rates comparison"
          option={platformAutomationOption}
          containerSize="default"
        />
        <ChartWithExport
          title="Automation Heatmap"
          subtitle="Decision automation rate by platform × category"
          option={heatmapOption}
          containerSize="default"
        />
      </div>
    </section>
  );
}

