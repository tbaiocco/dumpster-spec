/**
 * TimeBucket Component
 * 
 * Collapsible section displaying dumps grouped by time bucket
 * with lazy rendering, expand/collapse toggle, and empty state
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimeBucketGroup, DumpDerived } from '../types/dump.types';
import { DumpCard } from './DumpCard';
import { EmptyState } from './EmptyState';
import { cn } from '../lib/utils';

export interface TimeBucketProps {
  timeBucket: TimeBucketGroup;
  onDumpUpdate?: (dumpId: string, updates: Partial<DumpDerived>) => void;
  onDumpClick?: (dump: DumpDerived, mode?: 'view' | 'reject') => void;
}

/**
 * TimeBucket Component
 */
export const TimeBucket: React.FC<TimeBucketProps> = ({
  timeBucket,
  onDumpUpdate,
  onDumpClick,
}) => {
  const { t } = useTranslation();
  const localStorageKey = `timeBucket_${timeBucket.bucket}_expanded`;
  
  // Initialize from localStorage or default value
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem(localStorageKey);
    if (stored !== null) {
      return stored === 'true';
    }
    return timeBucket.isExpanded;
  });

  // Persist to localStorage when expanded state changes
  useEffect(() => {
    localStorage.setItem(localStorageKey, String(isExpanded));
  }, [isExpanded, localStorageKey]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Empty bucket message
  const emptyMessages: Record<string, string> = {
    overdue: 'No overdue items! You\'re all caught up.',
    today: 'Nothing scheduled for today. Enjoy your free time!',
    tomorrow: 'No items for tomorrow yet.',
    nextWeek: 'Nothing coming up this week.',
    nextMonth: 'No items scheduled for the next month.',
    later: 'No future items beyond next month.',
  };

  return (
    <div className="rounded-charming-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left transition-colors',
          'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-electric-purple focus:ring-inset',
          timeBucket.bucket === 'overdue' && timeBucket.count > 0 && 'bg-red-50 hover:bg-red-100'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Icon */}
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

          {/* Bucket Label */}
          <h3 className="text-lg font-heading font-semibold text-slate-900">
            {timeBucket.label}
          </h3>

          {/* Count Badge */}
          {timeBucket.count > 0 && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                timeBucket.bucket === 'overdue'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              )}
            >
              {timeBucket.count}
            </span>
          )}
        </div>

        {/* Expand/Collapse Text */}
        <span className="text-sm text-slate-500">
          {isExpanded ? t('common.close') : t('common.next')}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {timeBucket.dumps.length === 0 ? (
            <div className="py-6">
              <EmptyState
                title={t('time.noItems')}
                message={emptyMessages[timeBucket.bucket] || t('time.noItems')}
                icon={
                  <svg
                    className="h-10 w-10 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
            </div>
          ) : (
            timeBucket.dumps.map(dump => (
              <DumpCard
                key={dump.id}
                dump={dump}
                onUpdate={onDumpUpdate}
                onClick={onDumpClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
