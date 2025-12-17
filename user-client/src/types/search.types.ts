/**
 * Search Types
 * 
 * Type definitions for search functionality including filters and results.
 */

import type { ContentType, Dump, UrgencyLevel } from './dump.types';

// ============================================================================
// Search Filters
// ============================================================================

/**
 * Search filter state for natural language queries and faceted filtering
 */
export interface SearchFilters {
  contentTypes?: ContentType[];   // Selected content types
  categories?: string[];          // Selected categories
  urgencyLevels?: UrgencyLevel[]; // Selected urgency levels
  statuses?: string[];            // Selected statuses
  minConfidence?: number;         // Minimum confidence (0-1)
  dateRange?: {
    from?: string;                // ISO 8601 date
    to?: string;                  // ISO 8601 date
  };
}

/**
 * Default search filter values
 */
export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  contentTypes: undefined,
  categories: undefined,
  urgencyLevels: undefined,
  statuses: undefined,
  minConfidence: 0,
  dateRange: undefined,
};

// ============================================================================
// Search Results
// ============================================================================

/**
 * Paginated search results from backend API
 */
export interface SearchResults {
  dumps: Dump[];                 // Matching dumps
  totalResults: number;          // Total matches (for pagination)
  totalPages: number;            // Total page count
  page: number;                  // Current page number
  pageSize: number;              // Items per page
  searchTime?: number;           // Search execution time in ms
}

/**
 * Search request payload for POST /api/search
 */
export interface SearchRequest {
  query: string;                 // Natural language query
  userId: string;              // User identifier
  filters?: SearchFilters;       // Optional filters
  limit?: number;                  // Items per page
  offset?: number;                 // Offset for pagination
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
};
