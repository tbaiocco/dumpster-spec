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
  userId: string,
  filters: SearchFilters,
  offset: number = 0,
  limit: number = 20
): Promise<SearchResults> => {
  const request: SearchRequest = {
    query,
    userId,
    contentTypes: filters.contentTypes,
    categories: filters.categories,
    dateFrom: filters.dateRange?.from,
    dateTo: filters.dateRange?.to,
    minConfidence: filters.minConfidence,
    urgencyLevels: filters.urgencyLevels,
    includeProcessing: filters.statuses?.includes('processing'),
    limit,
    offset,
  };

  const response = await apiService.post<SearchResults>('/api/search', request);
  return response.data!;
};

/**
 * Filter enum metadata response
 */
export interface FilterEnums {
  contentTypes: Array<{ value: string; label: string }>;
  urgencyLevels: Array<{ value: number; label: string }>;
  statuses: Array<{ value: string; label: string }>;
}

/**
 * Hardcoded filter enums matching backend entity definitions
 * ContentType from dump.entity.ts, ProcessingStatus from dump.entity.ts
 * UrgencyLevels: 1=low, 2=medium, 3=high (from categorization.service.ts)
 */
export const getFilterEnums = (): FilterEnums => {
  return {
    contentTypes: [
      { value: 'text', label: 'Text' },
      { value: 'voice', label: 'Voice' },
      { value: 'image', label: 'Image' },
      { value: 'email', label: 'Email' },
    ],
    urgencyLevels: [
      { value: 1, label: 'Low' },
      { value: 2, label: 'Medium' },
      { value: 3, label: 'High' },
    ],
    statuses: [
      { value: 'received', label: 'Received' },
      { value: 'processing', label: 'Processing' },
      { value: 'completed', label: 'Completed' },
      { value: 'failed', label: 'Failed' },
    ],
  };
};

/**
 * Cancel ongoing search request
 * Used when user types new query before previous search completes
 */
let cancelTokenSource: AbortController | null = null;

export const searchDumpsWithCancellation = async (
  query: string,
  userId: string,
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

  // Calculate offset from page number
  const offset = (page - 1) * pageSize;

  const request: SearchRequest = {
    query,
    userId,
    contentTypes: filters.contentTypes,
    categories: filters.categories,
    dateFrom: filters.dateRange?.from,
    dateTo: filters.dateRange?.to,
    minConfidence: filters.minConfidence,
    urgencyLevels: filters.urgencyLevels,
    includeProcessing: filters.statuses?.includes('processing'),
    limit: pageSize,
    offset,
  };

  try {
    const response = await apiService.post<SearchResults>('/api/search', request, {
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
