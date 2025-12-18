/**
 * DumpDetailModal Component
 * 
 * Modal for reviewing and accepting dumps with edit capabilities
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { DumpDerived } from '../types/dump.types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { Badge } from './ui/Badge';
import { formatDisplayDate, formatUrgencyWithIcon } from '../utils/formatting';
import { useDumps } from '../hooks/useDumps';
import * as dumpsService from '../services/dumps.service';
import { apiService } from '../services/api';
import { useToast } from './Toast';

export interface DumpDetailModalProps {
  dump: DumpDerived | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (dumpId: string, updates?: any) => void;
  onReject?: (dumpId: string, reason?: string) => void;
  initialMode?: 'view' | 'reject';
}

/**
 * DumpDetailModal Component
 */
export const DumpDetailModal: React.FC<DumpDetailModalProps> = ({
  dump,
  isOpen,
  onClose,
  onAccept,
  onReject,
  initialMode = 'view',
}) => {
  const { t } = useTranslation();
  const { acceptDumpWithOptimism, rejectDumpWithOptimism } = useDumps();
  const { addToast } = useToast();
  
  // Status badge variant mapping
  const statusVariants: Record<string, 'overdue' | 'pending' | 'approved' | 'rejected' | 'processing'> = {
    received: 'pending',
    processing: 'processing',
    completed: 'approved',
    failed: 'rejected',
  };
  
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiService.get<Array<{ id: string; name: string }>>('/admin/categories');
        if (response.success && response.data) {
          const categoryNames = response.data.map(cat => cat.name).sort();
          setCategories(categoryNames);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Filter categories based on input
  useEffect(() => {
    if (!category.trim()) {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(cat => 
        cat.toLowerCase().includes(category.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [category, categories]);

  // Reset form when dump changes or modal opens
  useEffect(() => {
    if (dump) {
      setCategory(dump.categoryName || dump.category?.name || '');
      setNotes(dump.notes || '');
      setRawContent(dump.raw_content || '');
      setAiSummary(dump.ai_summary || '');
      setRejectReason('');
      setValidationError(null);
      setShowRejectForm(initialMode === 'reject');
      setIsEditing(false);
    }
  }, [dump, initialMode]);

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
      const updates: any = {
        category: category.trim(),
        notes: notes.trim() || undefined,
      };

      // Include edited fields if in edit mode
      if (isEditing) {
        if (rawContent !== dump.raw_content) {
          updates.raw_content = rawContent;
        }
        if (aiSummary !== dump.ai_summary) {
          updates.ai_summary = aiSummary;
        }
      }

      // For received dumps, use the approval workflow
      // For other dumps, just update directly
      let result;
      if (dump.status === 'received') {
        result = await acceptDumpWithOptimism(dump.id, updates);
      } else {
        // Direct update for already-approved dumps
        const updateResponse = await dumpsService.updateDump(dump.id, updates);
        result = { 
          success: updateResponse.success, 
          error: updateResponse.error?.message 
        };
      }

      if (result.success) {
        addToast('success', dump.status === 'received' ? t('capture.accepted') : t('capture.saved'));
        if (onAccept) {
          onAccept(dump.id, updates);
        }
        onClose();
      } else {
        // Keep modal open on failure, preserve edits
        addToast('error', result.error || (dump.status === 'received' ? t('capture.failedToApprove') : t('capture.failedToUpdate')));
      }
    } catch (err: any) {
      addToast('error', err?.message || t('feedback.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle retry after failure
  const handleRetry = () => {
    if (showRejectForm) {
      handleReject();
    } else {
      handleAccept();
    }
  };

  // Handle reject
  const handleReject = async () => {
    // Validation: reason must be at least 10 chars
    if (!rejectReason.trim() || rejectReason.trim().length < 10) {
      setValidationError(t('review.reasonRequired'));
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const result = await rejectDumpWithOptimism(dump.id, rejectReason.trim());

      if (result.success) {
        addToast('success', t('capture.rejected'));
        if (onReject) {
          onReject(dump.id, rejectReason.trim());
        }
        onClose();
      } else {
        // Keep modal open on failure, preserve edits
        addToast('error', result.error || t('capture.failedToReject'));
      }
    } catch (err: any) {
      addToast('error', err?.message || t('feedback.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle reject form
  const handleShowRejectForm = () => {
    setShowRejectForm(true);
    setValidationError(null);
  };

  // Cancel reject
  const handleCancelReject = () => {
    setShowRejectForm(false);
    setRejectReason('');
    setValidationError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('capture.update')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={dump.status === 'received' ? 'pending' : 'default'}>
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

        {/* Edit Mode Toggle */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <span className="text-sm font-medium text-slate-700">
            {isEditing ? 'Editing Mode' : 'View Mode'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Fields'}
          </Button>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
          
          {/* Content Type & AI Confidence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content Type</label>
              <Badge variant="default">{dump.content_type}</Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">AI Confidence</label>
              <Badge variant={dump.ai_confidence >= 80 ? 'approved' : dump.ai_confidence >= 60 ? 'pending' : 'rejected'}>
                {dump.ai_confidence}%
              </Badge>
            </div>
          </div>

          {/* Category */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                onBlur={() => {
                  // Delay to allow click on dropdown item
                  setTimeout(() => setShowCategoryDropdown(false), 200);
                }}
                placeholder={t('category.placeholder')}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-electric-purple ${
                  validationError?.includes('Category') 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-slate-300 bg-white'
                } disabled:bg-slate-100 disabled:cursor-not-allowed`}
              />
              {isEditing && showCategoryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {/* Existing categories */}
                  {filteredCategories.length > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t('category.existing')}
                      </div>
                      {filteredCategories.map((cat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCategory(cat);
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-900">{cat}</span>
                            {cat.toLowerCase() === category.toLowerCase() && (
                              <svg className="w-4 h-4 text-electric-purple" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Create new category option */}
                  {category.trim() && !categories.some(cat => cat.toLowerCase() === category.toLowerCase()) && (
                    <div className={filteredCategories.length > 0 ? "border-t border-slate-200" : ""}>
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Create New
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCategoryDropdown(false)}
                        className="w-full text-left px-3 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-sm text-slate-900">Create "<span className="font-semibold">{category}</span>"</span>
                        </div>
                      </button>
                    </div>
                  )}
                  {/* No results message */}
                  {filteredCategories.length === 0 && (!category.trim() || categories.some(cat => cat.toLowerCase() === category.toLowerCase())) && (
                    <div className="px-3 py-4 text-sm text-slate-500 text-center">
                      {!category.trim() ? 'Start typing to search categories...' : 'Category already exists'}
                    </div>
                  )}
                </div>
              )}
            </div>
            {validationError?.includes('Category') && (
              <p className="mt-1 text-sm text-red-600">{validationError}</p>
            )}
            {isEditing && (
              <p className="mt-1 text-xs text-slate-500">
                Select from existing categories or type to create a new one
              </p>
            )}
          </div>

          {/* Processing Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Processing Status</label>
            <Badge variant={statusVariants[dump.status] || 'default'}>
              {dump.processing_status}
            </Badge>
          </div>

          {/* Urgency Level */}
          {dump.urgency_level && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Urgency Level</label>
              <div className="flex items-center gap-2">
                <Badge variant={dump.urgency_level === 3 ? 'overdue' : dump.urgency_level === 2 ? 'pending' : 'approved'}>
                  {dump.urgency_level === 3 ? 'High' : dump.urgency_level === 2 ? 'Medium' : 'Low'}
                </Badge>
                {dump.extracted_entities?.urgency && (
                  <span className="text-sm text-slate-600">({dump.extracted_entities.urgency})</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Summary */}
        {(aiSummary || dump.ai_summary) && (
          <div>
            {isEditing ? (
              <TextArea
                label="AI Summary"
                value={aiSummary}
                onChange={e => setAiSummary(e.target.value)}
                placeholder="AI-generated summary..."
                rows={3}
              />
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  AI Summary
                </label>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
                  {dump.ai_summary}
                </div>
              </>
            )}
          </div>
        )}

        {/* Raw Content */}
        <div>
          {isEditing ? (
            <TextArea
              label="Content"
              value={rawContent}
              onChange={e => setRawContent(e.target.value)}
              placeholder="Content..."
              rows={6}
            />
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content
              </label>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {dump.raw_content}
              </div>
            </>
          )}
        </div>

        {/* Media URL */}
        {dump.media_url && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Media
            </label>
            <a 
              href={dump.media_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              View Media File
            </a>
          </div>
        )}

        {/* Notes */}
        <div>
          <TextArea
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any additional notes..."
            helperText={`${notes.length}/500 characters`}
            error={validationError?.includes('Notes') ? validationError : undefined}
            rows={4}
            disabled={!isEditing}
          />
        </div>

        {/* Extracted Entities */}
        {dump.extracted_entities && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Extracted Information</h3>
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              {/* Sentiment */}
              {dump.extracted_entities.sentiment && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Sentiment:</span>
                  <Badge variant={
                    dump.extracted_entities.sentiment === 'positive' ? 'approved' : 
                    dump.extracted_entities.sentiment === 'negative' ? 'rejected' : 
                    'default'
                  }>
                    {dump.extracted_entities.sentiment}
                  </Badge>
                </div>
              )}

              {/* Category Confidence */}
              {dump.extracted_entities.categoryConfidence !== undefined && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Category Confidence:</span>
                  <span className="text-sm text-slate-700">{dump.extracted_entities.categoryConfidence}%</span>
                </div>
              )}

              {/* Dates */}
              {dump.extracted_entities.entities?.dates && dump.extracted_entities.entities.dates.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Dates:</span>
                  <div className="flex flex-wrap gap-1">
                    {dump.extracted_entities.entities.dates.map((date, idx) => (
                      <Badge key={idx} variant="default">
                        {formatDisplayDate(date)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Times */}
              {dump.extracted_entities.entities?.times && dump.extracted_entities.entities.times.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Times:</span>
                  <div className="flex flex-wrap gap-1">
                    {dump.extracted_entities.entities.times.map((time, idx) => (
                      <Badge key={idx} variant="default">{time}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* People */}
              {dump.extracted_entities.entities?.people && dump.extracted_entities.entities.people.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">People:</span>
                  <div className="flex flex-wrap gap-1">
                    {dump.extracted_entities.entities.people.map((person, idx) => (
                      <Badge key={idx} variant="default">{person}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Organizations */}
              {dump.extracted_entities.entities?.organizations && dump.extracted_entities.entities.organizations.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Organizations:</span>
                  <div className="flex flex-wrap gap-1">
                    {dump.extracted_entities.entities.organizations.map((org, idx) => (
                      <Badge key={idx} variant="default">{org}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations */}
              {dump.extracted_entities.entities?.locations && dump.extracted_entities.entities.locations.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Locations:</span>
                  <div className="flex flex-wrap gap-1">
                    {dump.extracted_entities.entities.locations.map((loc, idx) => (
                      <Badge key={idx} variant="default">{loc}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Amounts */}
              {dump.extracted_entities.entities?.amounts && dump.extracted_entities.entities.amounts.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Amounts:</span>
                  <div className="flex flex-wrap gap-1">
                    {dump.extracted_entities.entities.amounts.map((amount, idx) => (
                      <Badge key={idx} variant="default">{amount}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {dump.extracted_entities.actionItems && dump.extracted_entities.actionItems.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Action Items:</span>
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

        {/* Metadata */}
        {dump.extracted_entities?.metadata && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Metadata</h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              {dump.extracted_entities.metadata.source && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Source:</span>
                  <span className="text-sm text-slate-700">{dump.extracted_entities.metadata.source}</span>
                </div>
              )}
              {dump.extracted_entities.metadata.routingInfo && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-slate-600 min-w-[100px]">Routing Info:</span>
                  <span className="text-sm text-slate-700">{JSON.stringify(dump.extracted_entities.metadata.routingInfo)}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-slate-600 min-w-[100px]">Enhanced Processing:</span>
                <Badge variant={dump.extracted_entities.metadata.enhancedProcessing ? 'approved' : 'default'}>
                  {dump.extracted_entities.metadata.enhancedProcessing ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Timestamps</h3>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-slate-600 min-w-[100px]">Created:</span>
              <span className="text-sm text-slate-700">{formatDisplayDate(new Date(dump.created_at))}</span>
            </div>
            {dump.processed_at && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-slate-600 min-w-[100px]">Processed:</span>
                <span className="text-sm text-slate-700">{formatDisplayDate(new Date(dump.processed_at))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Reject Form */}
        {showRejectForm && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <label className="block text-sm font-medium text-red-900 mb-2">
              Rejection Reason *
            </label>
            <TextArea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={t('review.reasonPlaceholder')}
              error={validationError?.includes('Rejection') ? validationError : undefined}
              rows={3}
              helperText={`${rejectReason.length} characters (minimum 10 required)`}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            onClick={showRejectForm ? handleCancelReject : onClose}
            variant="outline"
            disabled={isSubmitting}
          >
            {showRejectForm ? t('common.back') : t('common.cancel')}
          </Button>
          
          {dump.status === 'received' && !showRejectForm && (
            <>
              <Button
                onClick={handleShowRejectForm}
                variant="destructive"
                disabled={isSubmitting}
              >
                {t('common.reject')}
              </Button>
              <Button
                onClick={handleAccept}
                variant="success"
                loading={isSubmitting}
              >
                {t('common.approve')}
              </Button>
            </>
          )}

          {dump.status === 'received' && showRejectForm && (
            <Button
              onClick={handleReject}
              variant="destructive"
              loading={isSubmitting}
            >
              Confirm Reject
            </Button>
          )}

          {/* Save Changes button for edit mode when not in approval flow */}
          {dump.status !== 'received' && isEditing && (
            <Button
              onClick={handleAccept}
              variant="default"
              loading={isSubmitting}
            >
              Save Changes
            </Button>
          )}
          
          {validationError && !validationError.includes('Category') && !validationError.includes('Notes') && !validationError.includes('Rejection') && (
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
