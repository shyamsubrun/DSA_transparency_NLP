import { useMutation, useQuery } from '@tanstack/react-query';
import {
  fetchCustomChart,
  fetchModerationData,
  fetchFilterOptions,
  fetchStats,
} from '../data/dataService';
import { useFilters } from '../context/FilterContext';

export function useModerationData(page = 1, limit = 1000) {
  const { filters } = useFilters();

  // Convert FilterState to Filters (null -> undefined)
  const apiFilters = {
    ...filters,
    dateRange: filters.dateRange || undefined
  };

  return useQuery({
    queryKey: ['moderation', filters, page, limit],
    queryFn: () => fetchModerationData(apiFilters, page, limit),
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    retry: 2
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filters'],
    queryFn: fetchFilterOptions,
    staleTime: 30 * 60 * 1000, // Cache 30 minutes (rarement modifié)
    retry: 2
  });
}

export function useModerationStats() {
  const { filters } = useFilters();

  // Convert FilterState to Filters (null -> undefined)
  const apiFilters = {
    ...filters,
    dateRange: filters.dateRange || undefined
  };

  return useQuery({
    queryKey: ['stats', filters],
    queryFn: () => fetchStats(apiFilters),
    staleTime: 5 * 60 * 1000,
    retry: 2
  });
}

export function useCustomChartQuery() {
  const { filters } = useFilters();
  const apiFilters = {
    ...filters,
    dateRange: filters.dateRange || undefined,
  };

  return useMutation({
    mutationFn: (prompt: string) => fetchCustomChart(prompt, apiFilters),
    retry: 1,
  });
}