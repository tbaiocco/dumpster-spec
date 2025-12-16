/**
 * DumpDetailModal Component
 * 
 * Modal for reviewing and accepting dumps with edit capabilities
 */

import React, { useState, useEffect } from 'react';
import type { DumpDerived } from '../types/dump.types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { TextArea } from './ui/TextArea';
import { Badge } from './ui/Badge';
import { formatDisplayDate, formatUrgencyWithIcon } from '../utils/formatting';
import { useDumps } from '../hooks/useDumps';
import { useToast } from './Toast';

export interface DumpDetailModalProps {
  dump: DumpDerived | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (dumpId: string) => void;
}

/**
 * DumpDetailModal Component
 */
export const DumpDetailModal: React.FC<DumpDetailModalProps> = ({
  dump,
  isOpen,
  onClose,
  onAccept,
}) => {
  const { acceptDumpWithOptimism } = useDumps();
  const { addToast } = useToast();
  
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when dump changes
  useEffect(() => {
    if (dump) {
      setCategory(dump.categoryName || dump.category?.name || '');
      setNotes(dump.notes || '');
      setValidationError(null);
    }
  }, [dump]);

  if (!dump) return null;

  // Form validation
  const validateForm = (): boolean => {
    if (!category.trim()) {
      setValidationError('Category is required');
      return false;
    }
    if (notes.length > 500) {
      setValidationError('Notes must be 500 characters or less');
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Handle accept
  const handleAccept = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await acceptDumpWithOptimism(dump.id, {
        category: category.trim(),
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        addToast('success', 'Dump accepted successfully');
        if (onAccept) {
          onAccept(dump.id);
        }
        onClose();
      } else {
        // Keep modal open on failure, preserve edits
        addToast('error', result.error || 'Failed to accept dump');
      }
    } catch (err: any) {
      addToast('error', err?.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle retry after failure
  const handleRetry = () => {
    handleAccept();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Dump"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={dump.status === 'Pending' ? 'pending' : 'default'}>
                {dump.status}
              </Badge>
              {dump.isOverdue && (
                <Badge variant="overdue">OVERDUE</Badge>
              )}
            </div>
            <p className="text-sm text-slate-600">
              Created {formatDisplayDate(new Date(dump.created_at))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-700">
              {dump.extracted_entities?.urgency && formatUrgencyWithIcon(dump.extracted_entities.urgency)}
            </p>
          </div>
        </div>

        {/* Content (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Content
          </label>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
            {dump.raw_content}
          </div>
        </div>

        {/* Category (Editable) */}
        <div>
          <Input
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g., Work, Personal, Bills"
            error={validationError?.includes('Category') ? validationError : undefined}
            required
          />
        </div>

        {/* Notes (Editable) */}
        <div>
          <TextArea
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            helperText={`${notes.length}/500 characters`}
            error={validationError?.includes('Notes') ? validationError : undefined}
            rows={4}
          />
        </div>

        {/* Extracted Entities */}
        {dump.extracted_entities?.entities?.dates && dump.extracted_entities.entities.dates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Extracted Information
            </label>
            <div className="space-y-2">
              {/* Dates */}
              {dump.extracted_entities.entities.dates && dump.extracted_entities.entities.dates.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[80px]">Dates:</span>
                  <div className="flex flex-wrap gap-1">
                    {dump.extracted_entities.entities.dates.map((date, idx) => (
                      <Badge key={idx} variant="default">
                        {formatDisplayDate(date)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {dump.extracted_entities.actionItems && dump.extracted_entities.actionItems.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[80px]">Actions:</span>
                  <div className="flex flex-col gap-1">
                    {dump.extracted_entities.actionItems.map((item, idx) => (
                      <span key={idx} className="text-sm text-slate-700">• {item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {dump.status === 'Pending' && (
            <Button
              onClick={handleAccept}
              variant="success"
              loading={isSubmitting}
            >
              Accept & Approve
            </Button>
          )}
          {validationError && !validationError.includes('Category') && !validationError.includes('Notes') && (
            <Button
              onClick={handleRetry}
              variant="default"
              disabled={isSubmitting}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
