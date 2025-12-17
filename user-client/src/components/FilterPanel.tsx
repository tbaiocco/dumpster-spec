/**
 * FilterPanel Component
 * 
 * Collapsible panel with advanced search filters
 */

import React, { useState } from 'react';
import type { SearchFilters } from '../types/search.types';
import { DEFAULT_SEARCH_FILTERS } from '../types/search.types';
import type { FilterEnums } from '../services/search.service';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  filterEnums: FilterEnums | null;
  className?: string;
}

/**
 * FilterPanel Component
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  filterEnums,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_SEARCH_FILTERS);
  };

  // Multi-select checkbox handler
  const handleCheckboxChange = (
    field: 'contentTypes' | 'categories' | 'urgencyLevels' | 'statuses',
    value: string | number,
    checked: boolean
  ) => {
    const current = filters[field] || [];
    const updated = checked
      ? [...current, value as any]
      : current.filter((v: any) => v !== value);
    
    onFiltersChange({
      ...filters,
      [field]: updated.length > 0 ? updated : undefined,
    });
  };

  // Date range handlers
  const handleDateFromChange = (value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        from: value || undefined,
      },
    });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        to: value || undefined,
      },
    });
  };

  // Confidence slider handler
  const handleConfidenceChange = (value: number) => {
    onFiltersChange({
      ...filters,
      minConfidence: value,
    });
  };

  // Active filter count
  const activeFilterCount = [
    filters.contentTypes?.length || 0,
    filters.categories?.length || 0,
    filters.urgencyLevels?.length || 0,
    filters.statuses?.length || 0,
    filters.dateRange?.from || filters.dateRange?.to ? 1 : 0,
    filters.minConfidence !== undefined && filters.minConfidence > 0 ? 1 : 0,
  ].reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);

  return (
    <div className={cn('border border-slate-200 rounded-charming-lg bg-white', className)}>
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors rounded-t-charming-lg"
      >
        <div className="flex items-center gap-3">
          <svg
            className={cn(
              'h-5 w-5 text-slate-600 transition-transform',
              isExpanded && 'rotate-90'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <h3 className="text-lg font-heading font-semibold text-slate-900">
            Filters
          </h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-electric-purple text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <span className="text-sm text-slate-500">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-6 border-t border-slate-200">
          {/* Content Types */}
          {filterEnums?.contentTypes && filterEnums.contentTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content Type
              </label>
              <div className="space-y-2">
                {filterEnums.contentTypes.map(type => (
                  <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.contentTypes?.includes(type.value as any) || false}
                      onChange={e => handleCheckboxChange('contentTypes', type.value, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-electric-purple focus:ring-electric-purple"
                    />
                    <span className="text-sm text-slate-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Processing Status */}
          {filterEnums?.statuses && filterEnums.statuses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Processing Status
              </label>
              <div className="space-y-2">
                {filterEnums.statuses.map(status => (
                  <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.statuses?.includes(status.value) || false}
                      onChange={e => handleCheckboxChange('statuses', status.value, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-electric-purple focus:ring-electric-purple"
                    />
                    <span className="text-sm text-slate-700">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Urgency Levels */}
          {filterEnums?.urgencyLevels && filterEnums.urgencyLevels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Urgency
              </label>
              <div className="space-y-2">
                {filterEnums.urgencyLevels.map(level => (
                  <label key={level.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.urgencyLevels?.includes(level.value as any) || false}
                      onChange={e => handleCheckboxChange('urgencyLevels', level.value, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-electric-purple focus:ring-electric-purple"
                    />
                    <span className="text-sm text-slate-700">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Minimum Confidence */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Minimum Confidence: {Math.round((filters.minConfidence || 0) * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={filters.minConfidence || 0}
              onChange={e => handleConfidenceChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-electric-purple"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateRange?.from || ''}
                  onChange={e => handleDateFromChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-purple"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateRange?.to || ''}
                  onChange={e => handleDateToChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-purple"
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="pt-2">
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
