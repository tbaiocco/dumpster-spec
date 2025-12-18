/**
 * Timeline Component
 * 
 * Chronological list view with date markers
 * Alternative to time buckets for displaying dumps in linear chronological order
 */

import React from 'react';
import type { DumpDerived } from '../types/dump.types';
import { DumpCard } from './DumpCard';
import { formatDisplayDate } from '../utils/formatting';
import { cn } from '../lib/utils';

export interface TimelineProps {
  dumps: DumpDerived[];
  onDumpClick?: (dump: DumpDerived, mode?: 'view' | 'reject') => void;
}

interface TimelineGroup {
  date: Date;
  dateLabel: string;
  dumps: DumpDerived[];
}

/**
 * Timeline Component
 * 
 * Groups dumps by date and displays them in chronological order
 */
export const Timeline: React.FC<TimelineProps> = ({
  dumps,
  onDumpClick,
}) => {
  // Group dumps by date
  const groupedDumps = React.useMemo(() => {
    const groups = new Map<string, TimelineGroup>();

    dumps.forEach(dump => {
      const date = new Date(dump.displayDate);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date,
          dateLabel: formatDisplayDate(date),
          dumps: [],
        });
      }

      groups.get(dateKey)!.dumps.push(dump);
    });

    // Sort groups by date (earliest first)
    return Array.from(groups.values()).sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );
  }, [dumps]);

  if (dumps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {groupedDumps.map(group => (
        <div key={group.dateLabel} className="relative">
          {/* Date Marker */}
          <div className="sticky top-0 z-10 bg-warm-stone py-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-electric-purple/20 to-bright-cyan/20" />
              <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-charming shadow-sm border border-slate-200">
                <svg
                  className="h-4 w-4 text-electric-purple"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm font-medium text-slate-700">
                  {group.dateLabel}
                </span>
                <span className="text-xs text-slate-500">
                  ({group.dumps.length} {group.dumps.length === 1 ? 'item' : 'items'})
                </span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-bright-cyan/20 to-electric-purple/20" />
            </div>
          </div>

          {/* Timeline Items */}
          <div className="relative pl-6">
            {/* Vertical Line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-electric-purple/30 via-bright-cyan/30 to-electric-purple/30" />

            {/* Dump Cards */}
            <div className="space-y-4">
              {group.dumps.map(dump => (
                <div key={dump.id} className="relative">
                  {/* Timeline Dot */}
                  <div className={cn(
                    "absolute -left-6 top-6 w-3 h-3 rounded-full border-2 border-white shadow-sm",
                    dump.isOverdue ? "bg-red-500" : "bg-electric-purple"
                  )} />

                  {/* Dump Card */}
                  <DumpCard
                    dump={dump}
                    onClick={onDumpClick}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
