import { getMockVolumeScale } from './mockData';

/** Use mock volume scale when VITE_USE_MOCK_DATA and scaling env are set. */
export function getEffectiveMockVolumeScale(): number {
  if ((import.meta.env.VITE_USE_MOCK_DATA ?? 'true') !== 'true') return 1;
  return getMockVolumeScale();
}

const round = (v: number, s: number) => Math.round(v * s);

function scaleRecord(r: Record<string, number>, s: number): Record<string, number> {
  const o: Record<string, number> = {};
  for (const k of Object.keys(r)) o[k] = round(r[k], s);
  return o;
}

/** Scale count-based aggregations to match VITE_MOCK_TARGET_TOTAL (e.g. 17M) without materializing rows in the browser. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scaleMockAggregations(agg: any, s: number): any {
  if (s === 1) return agg;

  const decisionNested = (obj: Record<string, Record<string, number>>) => {
    const out: Record<string, Record<string, number>> = {};
    for (const k of Object.keys(obj)) out[k] = scaleRecord(obj[k], s);
    return out;
  };

  const countryDetails = { ...agg.countryDetails };
  for (const code of Object.keys(countryDetails)) {
    const c = countryDetails[code];
    countryDetails[code] = {
      total: round(c.total, s),
      automatedDetection: round(c.automatedDetection, s),
      automatedDecision: round(c.automatedDecision, s),
      delaySum: round(c.delaySum, s),
      delayCount: round(c.delayCount, s),
      categories: scaleRecord(c.categories, s),
      platforms: scaleRecord(c.platforms, s),
    };
  }

  const automationHeatmap = { ...agg.automationHeatmap };
  for (const k of Object.keys(automationHeatmap)) {
    const h = automationHeatmap[k];
    automationHeatmap[k] = { total: round(h.total, s), automated: round(h.automated, s) };
  }

  const delayByContentType = { ...agg.delayByContentType };
  for (const k of Object.keys(delayByContentType)) {
    const d = delayByContentType[k];
    delayByContentType[k] = { total: round(d.total, s), count: round(d.count, s) };
  }

  const automationByPlatform = { ...agg.automationByPlatform };
  for (const k of Object.keys(automationByPlatform)) {
    const a = automationByPlatform[k];
    automationByPlatform[k] = {
      total: round(a.total, s),
      automatedDetection: round(a.automatedDetection, s),
      automatedDecision: round(a.automatedDecision, s),
    };
  }

  return {
    byPlatform: scaleRecord(agg.byPlatform, s),
    byCategory: scaleRecord(agg.byCategory, s),
    byDecisionType: scaleRecord(agg.byDecisionType, s),
    byDecisionGround: scaleRecord(agg.byDecisionGround, s),
    byCountry: scaleRecord(agg.byCountry, s),
    byContentType: scaleRecord(agg.byContentType, s),
    byDate: scaleRecord(agg.byDate, s),
    decisionByPlatform: decisionNested(agg.decisionByPlatform),
    categoryByPlatform: decisionNested(agg.categoryByPlatform),
    automationByPlatform,
    decisionByContentType: decisionNested(agg.decisionByContentType),
    delayByContentType,
    groundsAnalysis: {
      legal: round(agg.groundsAnalysis.legal, s),
      tos: round(agg.groundsAnalysis.tos, s),
    },
    categoryByGround: decisionNested(agg.categoryByGround),
    automationHeatmap,
    countryDetails,
  };
}
