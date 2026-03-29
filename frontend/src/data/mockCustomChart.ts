import type { ModerationEntry } from './types';
import type { ChartAggregationPlan } from './chartPlanTypes';
import { buildChartOptionFromRows } from '../utils/chartFromRows';
import type { CustomChartResponse } from './chartPlanTypes';

function getDimensionValue(entry: ModerationEntry, dim: ChartAggregationPlan['primaryDimension']): string {
  switch (dim) {
    case 'month':
      return entry.application_date.slice(0, 7);
    case 'platform_name':
      return entry.platform_name;
    case 'country':
      return entry.country;
    case 'category':
      return entry.category;
    case 'decision_type':
      return entry.decision_type;
    case 'decision_ground':
      return entry.decision_ground;
    case 'content_type':
      return entry.content_type;
    case 'language':
      return entry.language;
    case 'automated_detection':
      return entry.automated_detection ? 'Yes' : 'No';
    case 'automated_decision':
      return entry.automated_decision ? 'Yes' : 'No';
    default:
      return 'N/A';
  }
}

type AggBucket = { dim_a: string; dim_b?: string; sumDelay: number; count: number };

export function aggregateMockEntries(
  entries: ModerationEntry[],
  plan: ChartAggregationPlan,
): Record<string, unknown>[] {
  const buckets = new Map<string, AggBucket>();

  for (const e of entries) {
    const dim_a = getDimensionValue(e, plan.primaryDimension);
    const dim_b = plan.secondaryDimension
      ? getDimensionValue(e, plan.secondaryDimension)
      : undefined;
    const key = dim_b !== undefined ? `${dim_a}\0${dim_b}` : dim_a;
    const prev = buckets.get(key);
    const b: AggBucket = prev || { dim_a, dim_b, sumDelay: 0, count: 0 };
    b.count += 1;
    b.sumDelay += Number(e.delay_days) || 0;
    if (dim_b !== undefined) b.dim_b = dim_b;
    buckets.set(key, b);
  }

  let rows: Record<string, unknown>[] = [...buckets.values()].map((b) => ({
    dim_a: b.dim_a,
    ...(b.dim_b !== undefined ? { dim_b: b.dim_b } : {}),
    value:
      plan.metric === 'avg_delay_days' && b.count > 0 ? b.sumDelay / b.count : b.count,
  }));

  if (!plan.secondaryDimension) {
    if (plan.primaryDimension === 'month' && plan.chartType === 'line') {
      rows.sort((a, b) => String(a.dim_a).localeCompare(String(b.dim_a)));
      if (rows.length > plan.topN) {
        rows = rows.slice(-plan.topN);
      }
    } else {
      rows.sort((a, b) => {
        const va = Number(a.value);
        const vb = Number(b.value);
        return plan.sort === 'asc' ? va - vb : vb - va;
      });
      rows = rows.slice(0, plan.topN);
      if (plan.primaryDimension === 'month') {
        rows.sort((a, b) => String(a.dim_a).localeCompare(String(b.dim_a)));
      }
    }
  } else {
    if (plan.primaryDimension === 'month') {
      const sumByB = new Map<string, number>();
      for (const r of rows) {
        const db = String(r.dim_b);
        sumByB.set(db, (sumByB.get(db) || 0) + Number(r.value));
      }
      const topBs = new Set(
        [...sumByB.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, plan.topN)
          .map(([k]) => k),
      );
      rows = rows.filter((r) => topBs.has(String(r.dim_b)));
    } else {
      const sumByA = new Map<string, number>();
      for (const r of rows) {
        const da = String(r.dim_a);
        sumByA.set(da, (sumByA.get(da) || 0) + Number(r.value));
      }
      const topAs = new Set(
        [...sumByA.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, plan.topN)
          .map(([k]) => k),
      );
      rows = rows.filter((r) => topAs.has(String(r.dim_a)));
    }
    if (plan.chartType === 'line' || plan.chartType === 'bar') {
      rows.sort((a, b) => {
        const ca = String(a.dim_a);
        const cb = String(b.dim_a);
        if (plan.primaryDimension === 'month') return ca.localeCompare(cb);
        return Number(b.value) - Number(a.value);
      });
    }
  }

  return rows;
}

export function buildMockCustomChartResponse(
  plan: ChartAggregationPlan,
  rows: Record<string, unknown>[],
  options: { planCached: boolean; totalDurationMs: number },
): CustomChartResponse {
  const chartPlan = {
    chartType: plan.chartType,
    xField: plan.xField,
    yField: plan.yField,
    valueField: plan.chartType === 'heatmap' ? plan.yField : undefined,
    seriesField: plan.seriesField,
  };

  const echartsOption = buildChartOptionFromRows(chartPlan, rows);
  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return {
    chartType: plan.chartType,
    title: plan.title,
    subtitle: plan.subtitle || 'Generated chart',
    explanation:
      plan.explanation || 'Generated from your prompt (mock data aggregation).',
    columns,
    rows,
    echartsOption,
    cached: options.planCached,
    durationMs: options.totalDurationMs,
  };
}
