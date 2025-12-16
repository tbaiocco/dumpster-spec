/**
 * Search Service
 * 
 * API service for natural language search with advanced filtering
 */

import { apiService } from './api';
import type { SearchFilters, SearchResults, SearchRequest } from '../types/search.types';

/**
 * Search dumps using natural language query and filters
 */
export const searchDumps = async (
  query: string,
  filters: SearchFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResults> => {
  const request: SearchRequest = {
    query,
    filters,
    pagination: {
      page,
      pageSize,
    },
  };

  const response = await apiService.post<SearchResults>('/search', request);
  return response.data!;
};

/**
 * Filter enum metadata response
 */
export interface FilterEnums {
  contentTypes: string[];
  categories: string[];
  urgencyLevels: string[];
  statuses: string[];
}

/**
 * Fetch available filter enum values from backend
 * Used to populate FilterPanel dropdowns dynamically
 */
export const fetchFilterEnums = async (): Promise<FilterEnums> => {
  const response = await apiService.get<FilterEnums>('/metadata/enums');
  return response.data!;
};

/**
 * Cancel ongoing search request
 * Used when user types new query before previous search completes
 */
let cancelTokenSource: AbortController | null = null;

export const searchDumpsWithCancellation = async (
  query: string,
  filters: SearchFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResults> => {
  // Cancel previous request if exists
  if (cancelTokenSource) {
    cancelTokenSource.abort();
  }

  // Create new cancel token
  cancelTokenSource = new AbortController();

  const request: SearchRequest = {
    query,
    filters,
    pagination: {
      page,
      pageSize,
    },
  };

  try {
    const response = await apiService.post<SearchResults>('/search', request, {
      signal: cancelTokenSource.signal,
    });
    return response.data!;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      throw new Error('Search cancelled');
    }
    throw error;
  } finally {
    cancelTokenSource = null;
  }
};
