/**
 * Search Types
 * 
 * Type definitions for search functionality including filters and results.
 */

import type { ContentType, Dump, UrgencyLevel } from './dump.types';

// ============================================================================
// Search Result
// ============================================================================

/**
 * Individual search result with relevance scoring
 */
export interface SearchResult {
  dump: Dump;
  relevanceScore: number;
  matchType: 'semantic' | 'fuzzy' | 'exact' | 'hybrid';
  matchedFields: string[];
  highlightedContent?: string;
  explanation?: string;
}

// ============================================================================
// Search Filters
// ============================================================================

/**
 * Search filter state for natural language queries and faceted filtering
 */
export interface SearchFilters {
  contentTypes?: ContentType[];   // Selected content types (text, voice, image, email)
  categories?: string[];          // Selected category IDs (UUIDs)
  urgencyLevels?: UrgencyLevel[]; // Selected urgency levels (1=low, 2=medium, 3=high)
  statuses?: string[];            // Selected processing statuses (received, processing, completed, failed)
  minConfidence?: number;         // Minimum AI confidence (0-100)
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
 * Matches backend SearchResponse structure
 */
export interface SearchResults {
  results: SearchResult[];       // Search results with relevance scores
  total: number;                 // Total matches
  query: {
    original: string;
    enhanced: string;
    processingTime: number;
  };
  metadata: {
    semanticResults: number;
    fuzzyResults: number;
    exactResults: number;
    vectorHealth?: any;
    filters: Record<string, any>;
  };
}

/**
 * Search request payload for POST /api/search
 * Matches backend SearchQueryDto structure
 */
export interface SearchRequest {
  query: string;                            // Natural language query
  userId: string;                          // User identifier
  contentTypes?: ContentType[];            // Selected content types
  categories?: string[];                   // Selected category IDs
  dateFrom?: string;                       // ISO 8601 date string
  dateTo?: string;                         // ISO 8601 date string
  minConfidence?: number;                  // Minimum confidence (1-5)
  urgencyLevels?: number[];                // Selected urgency levels
  includeProcessing?: boolean;             // Include processing status items
  limit?: number;                          // Items per page (1-100)
  offset?: number;                         // Offset for pagination (min 0)
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
};
