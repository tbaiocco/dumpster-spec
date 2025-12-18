/**
 * Search Context
 * 
 * Global state management for search functionality
 * with query, filters, results, and pagination
 */

import React, { createContext, useState, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { SearchFilters, SearchResults } from '../types/search.types';
import { DEFAULT_SEARCH_FILTERS, DEFAULT_PAGINATION } from '../types/search.types';
import { searchDumpsWithCancellation, type FilterEnums } from '../services/search.service';
import { useAuth } from '../hooks/useAuth';

interface SearchContextValue {
  // State
  query: string;
  filters: SearchFilters;
  results: SearchResults | null;
  loading: boolean;
  error: string | null;
  page: number;
  filterEnums: FilterEnums | null;

  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  executeSearch: () => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  resetSearch: () => void;
  setFilterEnums: (enums: FilterEnums) => void;
  clearError: () => void;
}

export const SearchContext = createContext<SearchContextValue | undefined>(undefined);

interface SearchProviderProps {
  children: ReactNode;
}

/**
 * SearchProvider Component
 * Provides search state and actions to children
 */
export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterEnums, setFilterEnums] = useState<FilterEnums | null>(null);

  /**
   * Execute search with current query and filters
   */
  const executeSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchDumpsWithCancellation(
        query,
        user.id,
        filters,
        page,
        DEFAULT_PAGINATION.pageSize
      );
      setResults(searchResults);
    } catch (err: any) {
      if (err.message === 'Search cancelled') {
        // Ignore cancelled requests
        return;
      }
      setError(err.message || t('search.failedToSearch'));
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [query, filters, page, user]);

  /**
   * Navigate to next page
   */
  const nextPage = useCallback(() => {
    if (results) {
      const totalPages = Math.ceil(results.total / DEFAULT_PAGINATION.pageSize);
      if (page < totalPages) {
        setPage(page + 1);
      }
    }
  }, [page, results]);

  /**
   * Navigate to previous page
   */
  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  /**
   * Reset search state
   */
  const resetSearch = useCallback(() => {
    setQuery('');
    setFilters(DEFAULT_SEARCH_FILTERS);
    setResults(null);
    setError(null);
    setPage(1);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        query,
        filters,
        results,
        loading,
        error,
        page,
        filterEnums,
        setQuery,
        setFilters,
        executeSearch,
        nextPage,
        prevPage,
        resetSearch,
        setFilterEnums,
        clearError,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};
