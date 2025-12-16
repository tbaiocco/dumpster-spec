/**
 * useSearch Hook
 * 
 * Hook for accessing search context with debounced search execution
 */

import { useContext, useEffect, useRef } from 'react';
import { SearchContext } from '../contexts/SearchContext';

const DEBOUNCE_DELAY = 300; // 300ms debounce

/**
 * Hook to access search context
 * Throws error if used outside SearchProvider
 */
export const useSearch = () => {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }

  return context;
};

/**
 * Hook with automatic debounced search execution
 * Executes search when query or filters change after 300ms delay
 */
export const useDebouncedSearch = () => {
  const context = useSearch();
  const { query, filters, page, executeSearch } = context;
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if query is empty
    if (!query.trim()) {
      return;
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      executeSearch();
    }, DEBOUNCE_DELAY);

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, filters, page]);

  return context;
};
