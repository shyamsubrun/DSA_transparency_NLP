import type { EChartsOption } from 'echarts';

/** Minimal plan shape for building ECharts options from tabular rows (mirrors backend analytics.service). */
export interface ChartBuildPlan {
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  xField?: string;
  yField?: string;
  valueField?: string;
  seriesField?: string;
}

function inferFields(rows: Record<string, unknown>[]): {
  xField: string;
  yField: string;
  seriesField?: string;
  valueField?: string;
} {
  if (rows.length === 0) {
    return { xField: 'x', yField: 'y' };
  }

  const columns = Object.keys(rows[0]);
  const numericColumns = columns.filter((col) => {
    const sample = rows.find((r) => typeof r[col] === 'number');
    return typeof sample?.[col] === 'number';
  });
  const textColumns = columns.filter((col) => !numericColumns.includes(col));

  const xField = textColumns[0] || columns[0];
  const yField = numericColumns[0] || columns[1] || columns[0];
  const seriesField = textColumns[1];
  const valueField = numericColumns[1] || yField;
  return { xField, yField, seriesField, valueField };
}

export function buildChartOptionFromRows(
  plan: ChartBuildPlan,
  rows: Record<string, unknown>[],
): EChartsOption {
  const inferred = inferFields(rows);
  const xField = plan.xField || inferred.xField;
  const yField = plan.yField || inferred.yField;
  const valueField = plan.valueField || inferred.valueField || yField;
  const seriesField = plan.seriesField || inferred.seriesField;

  if (plan.chartType === 'pie') {
    return {
      tooltip: { trigger: 'item' },
      legend: { top: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: rows.map((r) => ({
            name: String(r[xField] ?? 'N/A'),
            value: Number(r[yField] ?? 0),
          })),
        },
      ],
    };
  }

  if (plan.chartType === 'scatter') {
    return {
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: xField },
      yAxis: { type: 'value', name: yField },
      series: [
        {
          type: 'scatter',
          data: rows.map((r) => [Number(r[xField] ?? 0), Number(r[yField] ?? 0)]),
          symbolSize: 12,
        },
      ],
    };
  }

  if (plan.chartType === 'heatmap') {
    const xValues = Array.from(new Set(rows.map((r) => String(r[xField] ?? 'N/A'))));
    const yName = seriesField || inferred.seriesField || xField;
    const yValues = Array.from(new Set(rows.map((r) => String(r[yName] ?? 'N/A'))));
    const nums = rows.map((r) => Number(r[valueField] ?? 0));
    const maxVal = Math.max(1, ...nums);
    return {
      tooltip: { position: 'top' },
      xAxis: { type: 'category', data: xValues },
      yAxis: { type: 'category', data: yValues },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        bottom: 0,
      },
      series: [
        {
          type: 'heatmap',
          data: rows.map((r) => [
            xValues.indexOf(String(r[xField] ?? 'N/A')),
            yValues.indexOf(String(r[yName] ?? 'N/A')),
            Number(r[valueField] ?? 0),
          ]),
        },
      ],
    };
  }

  const grouped = new Map<string, Record<string, unknown>[]>();
  if (seriesField) {
    for (const row of rows) {
      const key = String(row[seriesField] ?? 'N/A');
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    }
  }

  if ((plan.chartType === 'line' || plan.chartType === 'bar') && grouped.size > 1) {
    const categories = Array.from(new Set(rows.map((r) => String(r[xField] ?? 'N/A'))));
    const seriesType = plan.chartType;
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, type: 'scroll' },
      xAxis: { type: 'category', data: categories },
      yAxis: { type: 'value' },
      series: Array.from(grouped.entries()).map(([name, values]) => ({
        name,
        type: seriesType,
        data: categories.map((cat) => {
          const row = values.find((v) => String(v[xField] ?? 'N/A') === cat);
          return Number(row?.[yField] ?? 0);
        }),
        smooth: seriesType === 'line',
      })),
    } as EChartsOption;
  }

  const singleType = plan.chartType === 'line' ? 'line' : 'bar';
  return {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: rows.map((r) => String(r[xField] ?? 'N/A')),
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: singleType,
        data: rows.map((r) => Number(r[yField] ?? 0)),
        smooth: plan.chartType === 'line',
      },
    ],
  };
}
