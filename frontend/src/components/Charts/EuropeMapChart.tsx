import { useRef, useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { MapChart } from 'echarts/charts';
import {
  TooltipComponent,
  VisualMapComponent,
  GeoComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { EU_COUNTRIES } from '../../data/types';
import styles from '../Sections/Section.module.css';

echarts.use([MapChart, TooltipComponent, VisualMapComponent, GeoComponent, CanvasRenderer]);

const COUNTRY_NAMES: Record<string, string> = {};
const COUNTRY_FLAGS: Record<string, string> = {};
EU_COUNTRIES.forEach(c => {
  COUNTRY_NAMES[c.code] = c.name;
  const offset = 127397;
  COUNTRY_FLAGS[c.code] = String.fromCodePoint(
    ...c.code.split('').map(ch => ch.charCodeAt(0) + offset)
  );
});

interface CountryDetail {
  total: number;
  automatedDetection: number;
  automatedDecision: number;
  delaySum: number;
  delayCount: number;
  categories: Record<string, number>;
  platforms: Record<string, number>;
}

interface EuropeMapChartProps {
  byCountry: Record<string, number>;
  countryDetails: Record<string, CountryDetail>;
}

function topEntry(map: Record<string, number>): string {
  let best = '';
  let max = 0;
  for (const [k, v] of Object.entries(map)) {
    if (v > max) { max = v; best = k; }
  }
  return best || '—';
}

export function EuropeMapChart({ byCountry, countryDetails }: EuropeMapChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const registered = (echarts as unknown as { getMap: (name: string) => unknown }).getMap?.('europe');
    if (registered) {
      setMapReady(true);
      return;
    }

    fetch('/europe.geojson')
      .then(res => res.json())
      .then(geoJSON => {
        if (cancelled) return;
        echarts.registerMap('europe', geoJSON as Parameters<typeof echarts.registerMap>[1]);
        setMapReady(true);
      });

    return () => { cancelled = true; };
  }, []);

  const handleExport = () => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) return;
    const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `EU-Map-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  if (!mapReady) {
    return (
      <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>EU Moderation Map</h3>
            <p className={styles.chartSubtitle}>Interactive map of moderation actions across EU member states</p>
          </div>
        </div>
        <div className={styles.mapLoading}>Loading map data...</div>
      </div>
    );
  }

  const entries = Object.entries(byCountry);
  const maxActions = entries.length > 0 ? Math.max(...entries.map(([, v]) => v)) : 1;

  const mapData = entries.map(([code, value]) => ({
    name: code,
    value,
  }));

  const option = {
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#1e293b', fontSize: 13 },
      extraCssText: 'border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.12);max-width:320px;',
      formatter: (params: { name: string; value?: number }) => {
        const code = params.name;
        const name = COUNTRY_NAMES[code];
        if (!name) return '';
        const detail = countryDetails[code];
        const flag = COUNTRY_FLAGS[code] || '';
        const total = detail?.total ?? 0;
        if (total === 0) {
          return `<div style="font-weight:600;font-size:15px;margin-bottom:4px">${flag} ${name}</div>
                  <div style="color:#94a3b8">No moderation data</div>`;
        }
        const detectionRate = Math.round((detail.automatedDetection / total) * 100);
        const decisionRate = Math.round((detail.automatedDecision / total) * 100);
        const avgDelay = detail.delayCount > 0 ? Math.round((detail.delaySum / detail.delayCount) * 10) / 10 : 0;
        const topCat = topEntry(detail.categories);
        const topPlat = topEntry(detail.platforms);

        return `
          <div style="font-weight:600;font-size:15px;margin-bottom:8px">${flag} ${name}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12px">
            <div style="color:#64748b">Actions</div>
            <div style="font-weight:600;text-align:right">${total.toLocaleString()}</div>
            <div style="color:#64748b">AI Detection</div>
            <div style="font-weight:600;text-align:right;color:#10b981">${detectionRate}%</div>
            <div style="color:#64748b">AI Decision</div>
            <div style="font-weight:600;text-align:right;color:#8b5cf6">${decisionRate}%</div>
            <div style="color:#64748b">Avg Delay</div>
            <div style="font-weight:600;text-align:right">${avgDelay} days</div>
            <div style="color:#64748b">Top Category</div>
            <div style="font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${topCat}</div>
            <div style="color:#64748b">Top Platform</div>
            <div style="font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${topPlat}</div>
          </div>
        `;
      },
    },
    visualMap: {
      min: 0,
      max: maxActions,
      left: 16,
      bottom: 16,
      text: ['More actions', 'Fewer actions'],
      calculable: true,
      inRange: {
        color: ['#e0f2fe', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0369a1', '#075985'],
      },
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    series: [{
      type: 'map',
      map: 'europe',
      roam: true,
      center: [15, 52],
      zoom: 3.5,
      nameProperty: 'ISO2',
      data: mapData,
      itemStyle: {
        areaColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        borderWidth: 0.5,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 13,
          fontWeight: 600,
          color: '#1e293b',
          formatter: (params: { name: string }) => COUNTRY_NAMES[params.name] || params.name,
        },
        itemStyle: {
          areaColor: '#fbbf24',
          borderColor: '#f59e0b',
          borderWidth: 2,
          shadowBlur: 20,
          shadowColor: 'rgba(251, 191, 36, 0.4)',
        },
      },
      select: { disabled: true },
      label: {
        show: false,
      },
    }],
  };

  return (
    <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
      <div className={styles.chartHeader}>
        <div>
          <h3 className={styles.chartTitle}>EU Moderation Map</h3>
          <p className={styles.chartSubtitle}>
            Geography: EU member states (map position) · Color scale: moderation action count (left). Hover for details, scroll to zoom.
          </p>
        </div>
        <button
          type="button"
          className={styles.chartExportBtn}
          onClick={handleExport}
          aria-label="Exporter la carte en image"
        >
          <Download size={18} />
        </button>
      </div>
      <div className={styles.chartContainerXl}>
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', minHeight: 500 }}
        />
      </div>
    </div>
  );
}
