import { useMemo, useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { useCustomChartQuery } from '../../hooks/useModeration';
import { ChartWithExport } from '../Charts/ChartWithExport';
import styles from './Section.module.css';

const EXAMPLES = [
  'Montre les 10 pays avec le plus d’actions de modération.',
  'Je veux un graphique mensuel des décisions automatisées.',
  'Compare les plateformes par volume de décisions.',
];

interface CustomQuerySectionProps {
  sectionId?: string;
}

export function CustomQuerySection({ sectionId }: CustomQuerySectionProps) {
  const [prompt, setPrompt] = useState('');
  const customChartMutation = useCustomChartQuery();

  const canRun = prompt.trim().length >= 8 && !customChartMutation.isPending;
  const suggestionText = useMemo(() => EXAMPLES.join('  •  '), []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) return;
    customChartMutation.mutate(value);
  };

  const result = customChartMutation.data;

  return (
    <section id={sectionId} className={styles.section}>
      <div className={styles.header}>
        <Sparkles className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Custom Query Chart</h2>
          <p className={styles.subtitle}>
            Describe what you need in natural language and generate a tailored chart
          </p>
        </div>
      </div>

      <div className={styles.queryCard}>
        <form className={styles.queryForm} onSubmit={handleSubmit}>
          <textarea
            className={styles.queryTextarea}
            placeholder="Ex: Je veux l’évolution mensuelle des actions par plateforme depuis janvier 2025."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className={styles.queryActions}>
            <button className={styles.queryBtn} type="submit" disabled={!canRun}>
              <Wand2 size={16} />
              {customChartMutation.isPending ? 'Generating...' : 'Generate chart'}
            </button>
            <span className={styles.queryHint}>{suggestionText}</span>
          </div>
        </form>

        {customChartMutation.error && (
          <p className={styles.queryMeta}>
            {(customChartMutation.error as Error).message}
          </p>
        )}

        {result && (
          <p className={styles.queryMeta}>
            {result.explanation} • {result.rows.length} rows • {result.durationMs} ms
            {result.cached ? ' • cached' : ''}
          </p>
        )}
      </div>

      {result && (
        <ChartWithExport
          title={result.title}
          subtitle={result.subtitle}
          option={result.echartsOption as unknown as EChartsOption}
          containerSize="lg"
          fullWidth
        />
      )}
    </section>
  );
}
