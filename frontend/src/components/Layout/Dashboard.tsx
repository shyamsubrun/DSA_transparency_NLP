import { useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Header } from './Header';
import { FilterPanel } from './FilterPanel';
import { OverviewSection } from '../Sections/OverviewSection';
import { TimeSeriesSection } from '../Sections/TimeSeriesSection';
import { PlatformsSection } from '../Sections/PlatformsSection';
import { LegalGroundsSection } from '../Sections/LegalGroundsSection';
import { GeographySection } from '../Sections/GeographySection';
import { ContentTypeSection } from '../Sections/ContentTypeSection';
import { CustomQuerySection } from '../Sections/CustomQuerySection';
import { useFilteredData } from '../../hooks/useFilteredData';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isLoading, isError, error } = useFilteredData();
  const customSectionId = 'custom-query-section';

  const handleOpenCustomQuery = () => {
    const section = document.getElementById(customSectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <Header 
          onToggleFilters={() => setFiltersOpen(!filtersOpen)} 
          filtersOpen={filtersOpen}
          onOpenCustomQuery={handleOpenCustomQuery}
        />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh',
          gap: '1rem'
        }}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
            Chargement des données DSA...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.dashboard}>
        <Header 
          onToggleFilters={() => setFiltersOpen(!filtersOpen)} 
          filtersOpen={filtersOpen}
          onOpenCustomQuery={handleOpenCustomQuery}
        />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh',
          gap: '1.5rem',
          padding: '2rem'
        }}>
          <AlertCircle size={64} color="var(--color-error)" />
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Erreur de chargement
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Impossible de charger les données du backend. 
              Vérifiez que le serveur backend est démarré sur le port 3001.
            </p>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              fontFamily: 'monospace',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px'
            }}>
              {error?.message || 'Erreur inconnue'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500
              }}
            >
              <RefreshCw size={20} />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <Header 
        onToggleFilters={() => setFiltersOpen(!filtersOpen)} 
        filtersOpen={filtersOpen}
        onOpenCustomQuery={handleOpenCustomQuery}
      />
      
      <FilterPanel 
        isOpen={filtersOpen} 
        onClose={() => setFiltersOpen(false)} 
      />

      <main className={styles.main}>
        <div className={styles.container}>
          <CustomQuerySection sectionId={customSectionId} />
          <OverviewSection />
          <TimeSeriesSection />
          <PlatformsSection />
          <LegalGroundsSection />
          <GeographySection />
          <ContentTypeSection />
        </div>
      </main>

      <footer className={styles.footer}>
        <p>DSA Transparency Dashboard • Data sourced from the DSA Transparency Database</p>
      </footer>
    </div>
  );
}

