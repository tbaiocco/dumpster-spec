/**
 * Search Service
 * 
 * API service for natural language search with advanced filtering
 */

import { apiService } from './api';
import type { SearchFilters, SearchResults } from '../types/search.types';

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
  // Build request, excluding undefined values to avoid backend validation errors
  const request: any = {
    query,
    userId,
    limit,
    offset,
  };

  // Only include defined filter values
  if (filters.contentTypes?.length) request.contentTypes = filters.contentTypes;
  if (filters.categories?.length) request.categories = filters.categories;
  if (filters.dateRange?.from) request.dateFrom = filters.dateRange.from;
  if (filters.dateRange?.to) request.dateTo = filters.dateRange.to;
  if (filters.minConfidence !== undefined && filters.minConfidence >= 1) request.minConfidence = filters.minConfidence;
  if (filters.urgencyLevels?.length) request.urgencyLevels = filters.urgencyLevels;
  if (filters.statuses?.includes('processing')) request.includeProcessing = true;

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

  // Build request, excluding undefined values to avoid backend validation errors
  const request: any = {
    query,
    userId,
    limit: pageSize,
    offset,
  };

  // Only include defined filter values
  if (filters.contentTypes?.length) request.contentTypes = filters.contentTypes;
  if (filters.categories?.length) request.categories = filters.categories;
  if (filters.dateRange?.from) request.dateFrom = filters.dateRange.from;
  if (filters.dateRange?.to) request.dateTo = filters.dateRange.to;
  if (filters.minConfidence !== undefined && filters.minConfidence >= 1) request.minConfidence = filters.minConfidence;
  if (filters.urgencyLevels?.length) request.urgencyLevels = filters.urgencyLevels;
  if (filters.statuses?.includes('processing')) request.includeProcessing = true;

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
