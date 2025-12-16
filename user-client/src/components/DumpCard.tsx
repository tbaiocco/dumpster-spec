/**
 * DumpCard Component
 * 
 * Displays a single dump with category badge, content preview, date, urgency,
 * reminder/tracking icons, and optional Accept/Reject buttons
 */

import React, { useState } from 'react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import type { DumpDerived } from '../types/dump.types';
import { formatDisplayDate, truncateText, formatCategory } from '../utils/formatting';
import { cn } from '../lib/utils';
import * as dumpsService from '../services/dumps.service';
import { useToast } from './Toast';

export interface DumpCardProps {
  dump: DumpDerived;
  showActions?: boolean;
  onUpdate?: (dumpId: string, updates: Partial<DumpDerived>) => void;
  onClick?: (dump: DumpDerived) => void;
}

/**
 * DumpCard Component
 */
export const DumpCard: React.FC<DumpCardProps> = ({ dump, showActions = false, onUpdate, onClick }) => {
  const { addToast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const response = await dumpsService.acceptDump(dump.id);

      if (response.success && response.data) {
        addToast('success', 'Dump accepted successfully');
        onUpdate?.(dump.id, { status: 'Approved' });
      } else {
        addToast('error', response.error?.message || 'Failed to accept dump');
      }
    } catch (err: any) {
      addToast('error', err?.message || 'An unexpected error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);

    try {
      const response = await dumpsService.rejectDump(dump.id);

      if (response.success && response.data) {
        addToast('success', 'Dump rejected');
        onUpdate?.(dump.id, { status: 'Rejected' });
      } else {
        addToast('error', response.error?.message || 'Failed to reject dump');
      }
    } catch (err: any) {
      addToast('error', err?.message || 'An unexpected error occurred');
    } finally {
      setIsRejecting(false);
    }
  };

  // Status badge variant mapping
  const statusVariants: Record<string, 'overdue' | 'pending' | 'approved' | 'rejected' | 'processing'> = {
    Pending: 'pending',
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
        !dump.isOverdue && 'border-slate-200',
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
            <span className="flex items-center gap-1" title="Has reminder">
              🔔
            </span>
          )}

          {/* Tracking Icon */}
          {dump.hasTracking && (
            <span className="flex items-center gap-1" title="Has package tracking">
              📦
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && dump.status === 'Pending' && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="success"
              onClick={handleAccept}
              loading={isAccepting}
              disabled={isRejecting}
            >
              ✓ Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              loading={isRejecting}
              disabled={isAccepting}
            >
              ✗ Reject
            </Button>
          </div>
        )}
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
