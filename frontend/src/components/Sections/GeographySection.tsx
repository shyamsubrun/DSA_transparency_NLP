import { Globe } from 'lucide-react';
import { useFilteredData } from '../../hooks/useFilteredData';
import { EuropeMapChart } from '../Charts/EuropeMapChart';
import styles from './Section.module.css';

export function GeographySection() {
  const { aggregations, stats } = useFilteredData();

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <Globe className={styles.headerIcon} size={24} />
        <div>
          <h2 className={styles.title}>Geographic Distribution</h2>
          <p className={styles.subtitle}>Moderation activity across {stats.countryCount} EU member states</p>
        </div>
      </div>

      <div className={`${styles.chartGrid} ${styles.chartGrid2}`}>
        <EuropeMapChart
          byCountry={aggregations.byCountry}
          countryDetails={aggregations.countryDetails}
        />
      </div>
    </section>
  );
}
