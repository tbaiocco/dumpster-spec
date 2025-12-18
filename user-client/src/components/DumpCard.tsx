/**
 * DumpCard Component
 * 
 * Displays a single dump with category badge, content preview, date, urgency,
 * reminder/tracking icons, and optional Accept/Reject buttons
 */

import React from 'react';
import { Bell, Package } from 'lucide-react';
import { Badge } from './ui/Badge';
import type { DumpDerived } from '../types/dump.types';
import { formatDisplayDate, truncateText, formatCategory } from '../utils/formatting';
import { cn } from '../lib/utils';

export interface DumpCardProps {
  dump: DumpDerived;
  onUpdate?: (dumpId: string, updates: Partial<DumpDerived>) => void;
  onClick?: (dump: DumpDerived, mode?: 'view' | 'reject') => void;
}

/**
 * DumpCard Component
 */
export const DumpCard: React.FC<DumpCardProps> = ({ dump, onClick }) => {

  // Status badge variant mapping
  const statusVariants: Record<string, 'overdue' | 'pending' | 'approved' | 'rejected' | 'processing'> = {
    received: 'pending',
    Processing: 'processing',
    Approved: 'approved',
    Rejected: 'rejected',
  };

  return (
    <div
      onClick={() => onClick?.(dump)}
      className={cn(
        'rounded-charming-lg bg-white border shadow-sm hover:shadow-glow transition-all p-4',
        dump.isOverdue && 'border-l-4 border-l-red-500 border-slate-200',
        !dump.isOverdue && dump.hasReminder && 'border-l-4 border-l-orange-400 border-slate-200',
        !dump.isOverdue && !dump.hasReminder && dump.hasTracking && 'border-l-4 border-l-cyan-400 border-slate-200',
        !dump.isOverdue && !dump.hasReminder && !dump.hasTracking && 'border-slate-200',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Header: Category + Status + Overdue Badge */}
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

      {/* Content Preview */}
      <p className="text-slate-900 text-sm mb-3 leading-relaxed">
        {truncateText(dump.raw_content, 150)}
      </p>

      {/* Footer: Date + Icons + Actions */}
      <div className="flex items-center justify-between gap-3">
        {/* Display Date */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            📅 {formatDisplayDate(dump.displayDate)}
          </span>

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
