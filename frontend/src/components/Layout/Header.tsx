import { Scale, Filter, RotateCcw } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';
import styles from './Header.module.css';

interface HeaderProps {
  onToggleFilters: () => void;
  filtersOpen: boolean;
}

export function Header({ onToggleFilters, filtersOpen }: HeaderProps) {
  const { activeFilterCount, resetFilters } = useFilters();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <Scale size={28} />
        </div>
        <div className={styles.brandText}>
          <h1 className={styles.title}>DSA Transparency Dashboard</h1>
          <p className={styles.subtitle}>Digital Services Act Moderation Analytics</p>
        </div>
      </div>

      <div className={styles.actions}>
        {activeFilterCount > 0 && (
          <button 
            className={styles.resetBtn}
            onClick={resetFilters}
            title="Reset all filters"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        )}
        
        <button 
          className={`${styles.filterBtn} ${filtersOpen ? styles.filterBtnActive : ''}`}
          onClick={onToggleFilters}
        >
          <Filter size={18} />
          Filters
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}

