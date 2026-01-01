import { X, Calendar, Building2, Tag, Gavel, Scale, Globe, FileType, Bot, User } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';
import { useFilterOptions } from '../../hooks/useModeration';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterPanel({ isOpen, onClose }: FilterPanelProps) {
  const {
    filters,
    setDateRange,
    setPlatforms,
    setCategories,
    setDecisionTypes,
    setDecisionGrounds,
    setCountries,
    setContentTypes,
    setAutomatedDetection,
    setAutomatedDecision,
    resetFilters
  } = useFilters();

  // Fetch filter options from backend
  const { data: filterOptions, isLoading: filtersLoading } = useFilterOptions();

  // Use dynamic data from backend, fallback to empty arrays if loading
  const uniquePlatforms = filterOptions?.platforms || [];
  const uniqueCategories = filterOptions?.categories || [];
  const uniqueDecisionTypes = filterOptions?.decisionTypes || [];
  const uniqueDecisionGrounds = filterOptions?.decisionGrounds || [];
  const uniqueCountries = filterOptions?.countries || [];
  const uniqueContentTypes = filterOptions?.contentTypes || [];

  const handleMultiSelect = (
    value: string,
    current: string[],
    setter: (values: string[]) => void
  ) => {
    if (current.includes(value)) {
      setter(current.filter(v => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Date Range */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <Calendar size={16} />
              Date Range
            </label>
            <div className={styles.dateInputs}>
              <input
                type="date"
                className={styles.input}
                value={filters.dateRange?.start || ''}
                onChange={e => setDateRange(
                  e.target.value 
                    ? { start: e.target.value, end: filters.dateRange?.end || '2025-12-31' }
                    : null
                )}
                placeholder="Start date"
              />
              <span className={styles.dateSeparator}>to</span>
              <input
                type="date"
                className={styles.input}
                value={filters.dateRange?.end || ''}
                onChange={e => setDateRange(
                  e.target.value
                    ? { start: filters.dateRange?.start || '2024-01-01', end: e.target.value }
                    : null
                )}
                placeholder="End date"
              />
            </div>
          </div>

          {/* Platforms */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <Building2 size={16} />
              Platforms {filtersLoading && <span className={styles.loading}>...</span>}
            </label>
            <div className={styles.chipGrid}>
              {uniquePlatforms.length > 0 ? (
                uniquePlatforms.map(platform => (
                  <button
                    key={platform}
                    className={`${styles.chip} ${filters.platforms.includes(platform) ? styles.chipActive : ''}`}
                    onClick={() => handleMultiSelect(platform, filters.platforms, setPlatforms)}
                    title={platform}
                  >
                    {platform.length > 20 ? `${platform.substring(0, 20)}...` : platform}
                  </button>
                ))
              ) : (
                <div className={styles.emptyState}>No platforms available</div>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <Tag size={16} />
              Categories {filtersLoading && <span className={styles.loading}>...</span>}
            </label>
            <div className={styles.chipGrid}>
              {uniqueCategories.length > 0 ? (
                uniqueCategories.map(category => (
                  <button
                    key={category}
                    className={`${styles.chip} ${filters.categories.includes(category) ? styles.chipActive : ''}`}
                    onClick={() => handleMultiSelect(category, filters.categories, setCategories)}
                    title={category}
                  >
                    {category.trim().length > 25 ? `${category.trim().substring(0, 25)}...` : category.trim()}
                  </button>
                ))
              ) : (
                <div className={styles.emptyState}>No categories available</div>
              )}
            </div>
          </div>

          {/* Decision Types */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <Gavel size={16} />
              Decision Types {filtersLoading && <span className={styles.loading}>...</span>}
            </label>
            <div className={styles.chipGrid}>
              {uniqueDecisionTypes.length > 0 ? (
                uniqueDecisionTypes.map(type => (
                  <button
                    key={type}
                    className={`${styles.chip} ${filters.decisionTypes.includes(type) ? styles.chipActive : ''}`}
                    onClick={() => handleMultiSelect(type, filters.decisionTypes, setDecisionTypes)}
                  >
                    {type}
                  </button>
                ))
              ) : (
                <div className={styles.emptyState}>No decision types available</div>
              )}
            </div>
          </div>

          {/* Decision Grounds */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <Scale size={16} />
              Legal Grounds {filtersLoading && <span className={styles.loading}>...</span>}
            </label>
            <div className={styles.chipGrid}>
              {uniqueDecisionGrounds.length > 0 ? (
                uniqueDecisionGrounds.map(ground => (
                  <button
                    key={ground}
                    className={`${styles.chip} ${styles.chipSmall} ${filters.decisionGrounds.includes(ground) ? styles.chipActive : ''}`}
                    onClick={() => handleMultiSelect(ground, filters.decisionGrounds, setDecisionGrounds)}
                    title={ground.trim()}
                  >
                    {ground.trim().length > 30 ? `${ground.trim().substring(0, 30)}...` : ground.trim()}
                  </button>
                ))
              ) : (
                <div className={styles.emptyState}>No legal grounds available</div>
              )}
            </div>
          </div>

          {/* Countries */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <Globe size={16} />
              Countries
            </label>
            <div className={styles.chipGrid}>
              {uniqueCountries.map(country => (
                <button
                  key={country}
                  className={`${styles.chip} ${filters.countries.includes(country) ? styles.chipActive : ''}`}
                  onClick={() => handleMultiSelect(country, filters.countries, setCountries)}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          {/* Content Types */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <FileType size={16} />
              Content Types {filtersLoading && <span className={styles.loading}>...</span>}
            </label>
            <div className={styles.chipGrid}>
              {uniqueContentTypes.length > 0 ? (
                uniqueContentTypes.map(type => (
                  <button
                    key={type}
                    className={`${styles.chip} ${filters.contentTypes.includes(type) ? styles.chipActive : ''}`}
                    onClick={() => handleMultiSelect(type, filters.contentTypes, setContentTypes)}
                  >
                    {type || 'NULL'}
                  </button>
                ))
              ) : (
                <div className={styles.emptyState}>No content types available</div>
              )}
            </div>
          </div>

          {/* Automation Toggles */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <Bot size={16} />
              Automated Detection
            </label>
            <div className={styles.toggleGroup}>
              <button
                className={`${styles.toggleBtn} ${filters.automatedDetection === null ? styles.toggleActive : ''}`}
                onClick={() => setAutomatedDetection(null)}
              >
                All
              </button>
              <button
                className={`${styles.toggleBtn} ${filters.automatedDetection === true ? styles.toggleActive : ''}`}
                onClick={() => setAutomatedDetection(true)}
              >
                Yes
              </button>
              <button
                className={`${styles.toggleBtn} ${filters.automatedDetection === false ? styles.toggleActive : ''}`}
                onClick={() => setAutomatedDetection(false)}
              >
                No
              </button>
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.label}>
              <User size={16} />
              Automated Decision
            </label>
            <div className={styles.toggleGroup}>
              <button
                className={`${styles.toggleBtn} ${filters.automatedDecision === null ? styles.toggleActive : ''}`}
                onClick={() => setAutomatedDecision(null)}
              >
                All
              </button>
              <button
                className={`${styles.toggleBtn} ${filters.automatedDecision === true ? styles.toggleActive : ''}`}
                onClick={() => setAutomatedDecision(true)}
              >
                Yes
              </button>
              <button
                className={`${styles.toggleBtn} ${filters.automatedDecision === false ? styles.toggleActive : ''}`}
                onClick={() => setAutomatedDecision(false)}
              >
                No
              </button>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetBtn} onClick={resetFilters}>
            Reset All
          </button>
          <button className={styles.applyBtn} onClick={onClose}>
            Apply Filters
          </button>
        </div>
      </aside>
    </div>
  );
}

