import { useState } from 'react';
import { Header } from './Header';
import { FilterPanel } from './FilterPanel';
import { OverviewSection } from '../Sections/OverviewSection';
import { TimeSeriesSection } from '../Sections/TimeSeriesSection';
import { PlatformsSection } from '../Sections/PlatformsSection';
import { LegalGroundsSection } from '../Sections/LegalGroundsSection';
import { AutomationSection } from '../Sections/AutomationSection';
import { GeographySection } from '../Sections/GeographySection';
import { ContentTypeSection } from '../Sections/ContentTypeSection';
import { DataQualitySection } from '../Sections/DataQualitySection';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className={styles.dashboard}>
      <Header 
        onToggleFilters={() => setFiltersOpen(!filtersOpen)} 
        filtersOpen={filtersOpen}
      />
      
      <FilterPanel 
        isOpen={filtersOpen} 
        onClose={() => setFiltersOpen(false)} 
      />

      <main className={styles.main}>
        <div className={styles.container}>
          <OverviewSection />
          <TimeSeriesSection />
          <PlatformsSection />
          <LegalGroundsSection />
          <AutomationSection />
          <GeographySection />
          <ContentTypeSection />
          <DataQualitySection />
        </div>
      </main>

      <footer className={styles.footer}>
        <p>DSA Transparency Dashboard • Data sourced from the DSA Transparency Database</p>
      </footer>
    </div>
  );
}

