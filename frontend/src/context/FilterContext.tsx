import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { FilterState } from '../data/filterTypes';

interface FilterContextType {
  filters: FilterState;
  setDateRange: (range: { start: string; end: string } | null) => void;
  setPlatforms: (platforms: string[]) => void;
  setCategories: (categories: string[]) => void;
  setDecisionTypes: (types: string[]) => void;
  setDecisionGrounds: (grounds: string[]) => void;
  setCountries: (countries: string[]) => void;
  setContentTypes: (types: string[]) => void;
  setAutomatedDetection: (value: boolean | null) => void;
  setAutomatedDecision: (value: boolean | null) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

const defaultFilters: FilterState = {
  dateRange: null,
  platforms: [],
  categories: [],
  decisionTypes: [],
  decisionGrounds: [],
  countries: [],
  contentTypes: [],
  automatedDetection: null,
  automatedDecision: null
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const setDateRange = useCallback((range: { start: string; end: string } | null) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  }, []);

  const setPlatforms = useCallback((platforms: string[]) => {
    setFilters(prev => ({ ...prev, platforms }));
  }, []);

  const setCategories = useCallback((categories: string[]) => {
    setFilters(prev => ({ ...prev, categories }));
  }, []);

  const setDecisionTypes = useCallback((decisionTypes: string[]) => {
    setFilters(prev => ({ ...prev, decisionTypes }));
  }, []);

  const setDecisionGrounds = useCallback((decisionGrounds: string[]) => {
    setFilters(prev => ({ ...prev, decisionGrounds }));
  }, []);

  const setCountries = useCallback((countries: string[]) => {
    setFilters(prev => ({ ...prev, countries }));
  }, []);

  const setContentTypes = useCallback((contentTypes: string[]) => {
    setFilters(prev => ({ ...prev, contentTypes }));
  }, []);

  const setAutomatedDetection = useCallback((automatedDetection: boolean | null) => {
    setFilters(prev => ({ ...prev, automatedDetection }));
  }, []);

  const setAutomatedDecision = useCallback((automatedDecision: boolean | null) => {
    setFilters(prev => ({ ...prev, automatedDecision }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Count active filters
  const activeFilterCount = [
    filters.dateRange !== null,
    filters.platforms.length > 0,
    filters.categories.length > 0,
    filters.decisionTypes.length > 0,
    filters.decisionGrounds.length > 0,
    filters.countries.length > 0,
    filters.contentTypes.length > 0,
    filters.automatedDetection !== null,
    filters.automatedDecision !== null
  ].filter(Boolean).length;

  return (
    <FilterContext.Provider
      value={{
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
        resetFilters,
        activeFilterCount
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}

