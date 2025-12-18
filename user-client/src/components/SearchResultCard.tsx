/**
 * SearchResultCard Component
 * 
 * Enhanced dump card specifically for search results showing:
 * - Category with status badges
 * - Due date, relevance score, match type
 * - AI summary (prominent)
 * - Raw content preview
 * - Highlighted matched content
 */

import React from 'react';
import { Bell, Package, Target } from 'lucide-react';
import { Badge } from './ui/Badge';
import type { DumpDerived } from '../types/dump.types';
import type { SearchResult } from '../types/search.types';
import { formatDisplayDate, truncateText, formatCategory } from '../utils/formatting';
import { cn } from '../lib/utils';

export interface SearchResultCardProps {
  result: SearchResult & { dump: DumpDerived };
  onUpdate?: (dumpId: string, updates: Partial<DumpDerived>) => void;
  onClick?: (dumpId: string) => void;
}

/**
 * SearchResultCard Component
 */
export const SearchResultCard: React.FC<SearchResultCardProps> = ({ 
  result, 
  onClick 
}) => {
  const { dump, relevanceScore, matchType, explanation, highlightedContent } = result;

  // Status badge variant mapping
  const statusVariants: Record<string, 'overdue' | 'pending' | 'approved' | 'rejected' | 'processing'> = {
    received: 'pending',
    Processing: 'processing',
    Approved: 'approved',
    Rejected: 'rejected',
  };

  // Match type badge colors
  const matchTypeBadge = {
    semantic: 'bg-purple-100 text-purple-700 border-purple-300',
    fuzzy: 'bg-blue-100 text-blue-700 border-blue-300',
    exact: 'bg-green-100 text-green-700 border-green-300',
    hybrid: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  };

  const relevancePercentage = Math.round(relevanceScore * 100);

  return (
    <div
      onClick={() => onClick?.(dump.id)}
      className={cn(
        'rounded-charming-lg bg-white border shadow-sm hover:shadow-glow transition-all p-4',
        dump.isOverdue && 'border-l-4 border-l-red-500 border-slate-200',
        !dump.isOverdue && dump.hasReminder && 'border-l-4 border-l-orange-400 border-slate-200',
        !dump.isOverdue && !dump.hasReminder && dump.hasTracking && 'border-l-4 border-l-cyan-400 border-slate-200',
        !dump.isOverdue && !dump.hasReminder && !dump.hasTracking && 'border-slate-200',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Header: Category + Status + Badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-700">
            {formatCategory(dump.categoryName || dump.category?.name)}
          </span>
          <Badge variant={statusVariants[dump.status] || 'default'}>
            {dump.status}
          </Badge>
          {dump.isOverdue && (
            <Badge variant="overdue">
              OVERDUE
            </Badge>
          )}
          {dump.hasReminder && (
            <Badge variant="pending" className="bg-orange-100 text-orange-700 border-orange-300">
              <Bell className="h-3 w-3 inline mr-1" />
              Reminder
            </Badge>
          )}
          {dump.hasTracking && (
            <Badge variant="pending" className="bg-cyan-100 text-cyan-700 border-cyan-300">
              <Package className="h-3 w-3 inline mr-1" />
              Tracking
            </Badge>
          )}
        </div>

        {/* Urgency Indicator */}
        {dump.extracted_entities?.urgency && (
          <div className="flex items-center gap-1">
            {dump.extracted_entities.urgency === 'critical' && (
              <span className="text-red-600 text-xs font-medium">🔴 Critical</span>
            )}
            {dump.extracted_entities.urgency === 'high' && (
              <span className="text-orange-600 text-xs font-medium">🟠 High</span>
            )}
            {dump.extracted_entities.urgency === 'medium' && (
              <span className="text-yellow-600 text-xs font-medium">🟡 Medium</span>
            )}
            {dump.extracted_entities.urgency === 'low' && (
              <span className="text-green-600 text-xs font-medium">🟢 Low</span>
            )}
          </div>
        )}
      </div>

      {/* Search Metadata */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        {/* Due Date */}
        <span className="flex items-center gap-1 text-slate-600">
          📅 {formatDisplayDate(dump.displayDate)}
        </span>
        
        {/* Relevance Score */}
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
          <Target className="h-3 w-3 inline mr-1" />
          {relevancePercentage}% match
        </Badge>
        
        {/* Match Type */}
        <Badge className={matchTypeBadge[matchType]}>
          {matchType}
        </Badge>
      </div>

      {/* AI Summary (Prominent) */}
      {dump.ai_summary && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-1">AI Summary</p>
          <p className="text-sm text-blue-800 leading-relaxed">
            {dump.ai_summary}
          </p>
        </div>
      )}

      {/* Highlighted Content or Raw Content */}
      <div className="mb-3">
        {highlightedContent ? (
          <p 
            className="text-slate-900 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: truncateText(highlightedContent.replace(/\*\*(.*?)\*\*/g, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'), 200)
            }}
          />
        ) : (
          <p className="text-slate-900 text-sm leading-relaxed">
            {truncateText(dump.raw_content, 200)}
          </p>
        )}
      </div>

      {/* Footer: Icons + Actions + Explanation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          {/* Reminder Icon */}
          {dump.hasReminder && (
            <span className="flex items-center gap-1 text-orange-600" title="Has reminder">
              <Bell className="h-3.5 w-3.5" />
            </span>
          )}

          {/* Tracking Icon */}
          {dump.hasTracking && (
            <span className="flex items-center gap-1 text-cyan-600" title="Has package tracking">
              <Package className="h-3.5 w-3.5" />
            </span>
          )}

          {/* Match Explanation */}
          {explanation && (
            <span className="text-slate-500 italic" title={explanation}>
              {truncateText(explanation, 50)}
            </span>
          )}
        </div>
      </div>

      {/* Notes (if present) */}
      {dump.notes && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-600">
            <span className="font-medium">Notes:</span> {dump.notes}
          </p>
        </div>
      )}
    </div>
  );
};
