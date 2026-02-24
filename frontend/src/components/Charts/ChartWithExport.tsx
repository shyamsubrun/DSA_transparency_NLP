import { useRef } from 'react';
import { Download } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import styles from '../Sections/Section.module.css';

export interface ChartWithExportProps {
  title: string;
  subtitle: string;
  option: EChartsOption;
  containerSize?: 'default' | 'lg';
  fullWidth?: boolean;
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'chart';
}

export function ChartWithExport({
  title,
  subtitle,
  option,
  containerSize = 'default',
  fullWidth = false,
}: ChartWithExportProps) {
  const chartRef = useRef<ReactECharts>(null);

  const handleExport = () => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) return;

    const url = instance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });

    if (!url) return;

    const filename = `${sanitizeFilename(title)}-${new Date().toISOString().slice(0, 10)}.png`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const containerClass =
    containerSize === 'lg' ? styles.chartContainerLg : styles.chartContainer;
  const minHeight = containerSize === 'lg' ? 400 : 300;
  const cardClass = fullWidth ? `${styles.chartCard} ${styles.chartCardFull}` : styles.chartCard;

  return (
    <div className={cardClass}>
      <div className={styles.chartHeader}>
        <div>
          <h3 className={styles.chartTitle}>{title}</h3>
          <p className={styles.chartSubtitle}>{subtitle}</p>
        </div>
        <button
          type="button"
          className={styles.chartExportBtn}
          onClick={handleExport}
          aria-label="Exporter le graphe en image"
        >
          <Download size={18} />
        </button>
      </div>
      <div className={containerClass}>
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: '100%', minHeight }}
        />
      </div>
    </div>
  );
}
