/**
 * Search Page
 * 
 * Natural language search with advanced filtering,
 * results grid, and pagination
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedSearch } from '../hooks/useSearch';
import { fetchFilterEnums } from '../services/search.service';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { DumpCard } from '../components/DumpCard';
import { DumpDetailModal } from '../components/DumpDetailModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/Button';
import { useDumps } from '../hooks/useDumps';
import { enrichDump } from '../utils/time-buckets';
import type { DumpDerived } from '../types/dump.types';

export const SearchPage: React.FC = () => {
  const {
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
    setFilterEnums,
    clearError,
  } = useDebouncedSearch();

  const { updateDumpLocally, refetchDumps } = useDumps();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDump, setSelectedDump] = useState<DumpDerived | null>(null);

  // Enrich search results with derived properties
  const enrichedResults = useMemo(() => {
    if (!results) return null;
    return {
      ...results,
      dumps: results.dumps.map(enrichDump),
    };
  }, [results]);

  // Fetch filter enums on mount
  useEffect(() => {
    const loadFilterEnums = async () => {
      try {
        const enums = await fetchFilterEnums();
        setFilterEnums(enums);
      } catch (err) {
        console.error('Failed to load filter enums:', err);
      }
    };

    loadFilterEnums();
  }, []);

  // Handle modal routing via query param
  useEffect(() => {
    const dumpId = searchParams.get('dumpId');
    if (dumpId && enrichedResults) {
      const dump = enrichedResults.dumps.find(d => d.id === dumpId);
      if (dump) {
        setSelectedDump(dump);
      }
    } else {
      setSelectedDump(null);
    }
  }, [searchParams, enrichedResults]);

  // Handle dump updates from DumpCard
  const handleDumpUpdate = (dumpId: string, updates: any) => {
    updateDumpLocally(dumpId, updates);
  };

  // Handle dump card click - open modal with URL routing
  const handleDumpClick = (dump: DumpDerived) => {
    setSearchParams({ ...Object.fromEntries(searchParams), dumpId: dump.id });
  };

  // Handle modal close - clear dumpId param
  const handleModalClose = () => {
    const params = Object.fromEntries(searchParams);
    delete params.dumpId;
    setSearchParams(params);
  };

  // Handle successful accept - re-execute search
  const handleAccept = () => {
    executeSearch();
    refetchDumps();
  };

  // Retry on error
  const handleRetry = () => {
    clearError();
    executeSearch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          Search Your Information
        </h1>
        <p className="text-slate-600 mt-1">
          Use natural language to find anything in your dumps
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={executeSearch}
        placeholder="Ask anything about your dumps..."
      />

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        filterEnums={filterEnums}
      />

      {/* Results */}
      <div className="relative min-h-[400px]">
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
            <LoadingSpinner size="lg" text="Searching..." />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <EmptyState
            title="Search failed"
            message={error}
            icon={
              <svg
                className="h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            action={
              <Button onClick={handleRetry} variant="default">
                Retry
              </Button>
            }
          />
        )}

        {/* Empty State - No Query */}
        {!query && !results && !loading && !error && (
          <EmptyState
            title="Start searching"
            message="Enter a query to search your dumps. Try asking natural language questions like 'Show me urgent emails from last week' or 'Find all bills due this month'."
            icon={
              <svg
                className="h-12 w-12 text-bright-cyan"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        )}

        {/* Empty State - No Results */}
        {query && enrichedResults && enrichedResults.dumps.length === 0 && !loading && !error && (
          <EmptyState
            title="No results found"
            message={`No dumps match "${query}". Try adjusting your search or filters.`}
            icon={
              <svg
                className="h-12 w-12 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        )}

        {/* Results Grid */}
        {enrichedResults && enrichedResults.dumps.length > 0 && !loading && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {enrichedResults.dumps.length} of {enrichedResults.totalResults} results
                {enrichedResults.searchTime && ` in ${enrichedResults.searchTime}ms`}
              </p>
            </div>

            {/* Results Grid */}
            <div className="space-y-3">
              {enrichedResults.dumps.map(dump => (
                <DumpCard
                  key={dump.id}
                  dump={dump}
                  showActions={true}
                  onUpdate={handleDumpUpdate}
                  onClick={handleDumpClick}
                />
              ))}
            </div>

            {/* Pagination */}
            {enrichedResults.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <Button
                  onClick={prevPage}
                  disabled={page === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page {page} of {enrichedResults.totalPages}
                </span>
                <Button
                  onClick={nextPage}
                  disabled={page >= enrichedResults.totalPages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dump Detail Modal */}
      <DumpDetailModal
        dump={selectedDump}
        isOpen={!!selectedDump}
        onClose={handleModalClose}
        onAccept={handleAccept}
      />
    </div>
  );
};
