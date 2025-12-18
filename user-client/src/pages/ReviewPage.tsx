/**
 * Review Page
 * 
 * Dedicated page for reviewing flagged dumps that require manual approval/rejection
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LuClock, LuCircleCheck, LuCircleX, LuTriangleAlert } from 'react-icons/lu';
import { apiService } from '../services/api';
import { SearchResultCard } from '../components/SearchResultCard';
import { DumpDetailModal } from '../components/DumpDetailModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/Button';
import { enrichDump } from '../utils/time-buckets';
import type { DumpDerived } from '../types/dump.types';
import type { SearchResult } from '../types/search.types';
import { useDumps } from '../hooks/useDumps';
import { useToast } from '../components/Toast';

interface FlaggedDump {
  id: string;
  dump: {
    id: string;
    rawContent: string;
    category?: { name: string };
    aiConfidence: number;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected';
  flaggedAt: string;
  user?: {
    id: string;
    phoneNumber: string;
  };
}

/**
 * ReviewPage Component
 */
export const ReviewPage: React.FC = () => {
  const { t } = useTranslation();
  const [flaggedDumps, setFlaggedDumps] = useState<FlaggedDump[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDump, setSelectedDump] = useState<DumpDerived | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  const { acceptDumpWithOptimism, rejectDumpWithOptimism } = useDumps();
  const { addToast } = useToast();

  // Load flagged dumps
  useEffect(() => {
    loadFlaggedDumps();
  }, [statusFilter]);

  const loadFlaggedDumps = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await apiService.get<FlaggedDump[]>('/review/flagged', params);
      
      console.log('[ReviewPage] API response:', response);
      
      if (response.success && response.data) {
        setFlaggedDumps(response.data);
      } else {
        console.error('[ReviewPage] API returned success=false:', response);
        setError(t('capture.failedToLoad'));
      }
    } catch (err: any) {
      console.error('[ReviewPage] Error loading flagged dumps:', err);
      setError(err?.message || t('capture.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  // Convert FlaggedDump to SearchResult format for display
  const enrichedResults = useMemo(() => {
    if (!flaggedDumps.length) return [];

    return flaggedDumps.map(flagged => {
      // Create a minimal Dump object from flagged data
      const dump: any = {
        id: flagged.dump.id,
        raw_content: flagged.dump.rawContent,
        ai_confidence: flagged.dump.aiConfidence,
        category: flagged.dump.category,
        created_at: flagged.flaggedAt,
        processing_status: flagged.status,
        urgency_level: flagged.priority === 'critical' ? 3 : flagged.priority === 'high' ? 3 : flagged.priority === 'medium' ? 2 : 1,
        extracted_entities: {
          urgency: flagged.priority,
        },
      };

      const enrichedDump = enrichDump(dump);

      const result: SearchResult & { dump: DumpDerived } = {
        dump: enrichedDump,
        relevanceScore: 1 - (flagged.dump.aiConfidence / 100), // Lower confidence = higher relevance for review
        matchType: 'hybrid',
        matchedFields: ['ai_confidence', 'flagged'],
        explanation: `Flagged for review - ${flagged.priority} priority, ${flagged.dump.aiConfidence}% confidence`,
      };

      return result;
    });
  }, [flaggedDumps]);

  // Handle modal routing via query param
  useEffect(() => {
    const dumpId = searchParams.get('dumpId');
    if (dumpId && enrichedResults.length) {
      const result = enrichedResults.find(r => r.dump.id === dumpId);
      if (result) {
        setSelectedDump(result.dump);
      }
    } else {
      setSelectedDump(null);
    }
  }, [searchParams, enrichedResults]);

  // Handle dump card click - open modal
  const handleDumpClick = (dumpId: string) => {
    setSearchParams({ ...Object.fromEntries(searchParams), dumpId });
  };

  // Handle modal close
  const handleModalClose = () => {
    const params = Object.fromEntries(searchParams);
    delete params.dumpId;
    setSearchParams(params);
  };

  // Handle approve
  const handleApprove = async (dumpId: string, updates: any) => {
    try {
      const result = await acceptDumpWithOptimism(dumpId, updates);
      if (result.success) {
        addToast('success', t('review.approved'));
        handleModalClose();
        loadFlaggedDumps(); // Reload list
      } else {
        addToast('error', result.error || t('capture.failedToApprove'));
      }
    } catch (err: any) {
      addToast('error', err?.message || t('review.failed'));
    }
  };

  // Handle reject
  const handleReject = async (dumpId: string, reason?: string) => {
    try {
      const result = await rejectDumpWithOptimism(dumpId, reason || '');
      if (result.success) {
        addToast('success', t('review.rejected'));
        handleModalClose();
        loadFlaggedDumps(); // Reload list
      } else {
        addToast('error', result.error || t('capture.failedToReject'));
      }
    } catch (err: any) {
      addToast('error', err?.message || t('review.failed'));
    }
  };

  // Stats
  const pendingCount = flaggedDumps.filter(d => d.status === 'pending').length;
  const approvedCount = flaggedDumps.filter(d => d.status === 'approved').length;
  const rejectedCount = flaggedDumps.filter(d => d.status === 'rejected').length;
  const criticalCount = flaggedDumps.filter(d => d.priority === 'critical' && d.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          {t('review.title')}
        </h1>
        <p className="text-slate-600 mt-1">
          {t('review.description')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-yellow-100 text-sm">{t('review.stats.pending')}</span>
            <LuClock className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold">{pendingCount}</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-green-100 text-sm">{t('review.stats.approved')}</span>
            <LuCircleCheck className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold">{approvedCount}</div>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-red-100 text-sm">{t('review.stats.rejected')}</span>
            <LuCircleX className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold">{rejectedCount}</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-orange-100 text-sm">{t('review.stats.critical')}</span>
            <LuTriangleAlert className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold">{criticalCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          onClick={() => setStatusFilter('all')}
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
        >
          {t('review.filters.all')}
        </Button>
        <Button
          onClick={() => setStatusFilter('pending')}
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
        >
          {t('review.filters.pending')}
        </Button>
        <Button
          onClick={() => setStatusFilter('approved')}
          variant={statusFilter === 'approved' ? 'default' : 'outline'}
          size="sm"
        >
          {t('review.filters.approved')}
        </Button>
        <Button
          onClick={() => setStatusFilter('rejected')}
          variant={statusFilter === 'rejected' ? 'default' : 'outline'}
          size="sm"
        >
          {t('review.filters.rejected')}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadFlaggedDumps} variant="outline" size="sm" className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!error && enrichedResults.length === 0 && (
        <EmptyState
          title={t('review.noFlagged')}
          message={
            statusFilter === 'pending'
              ? t('review.description')
              : `${t('capture.none')} ${statusFilter}`
          }
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      )}

      {/* Results Grid */}
      {!error && enrichedResults.length > 0 && (
        <div className="space-y-3">
          {enrichedResults.map(result => (
            <SearchResultCard
              key={result.dump.id}
              result={result}
              onClick={handleDumpClick}
            />
          ))}
        </div>
      )}

      {/* Dump Detail Modal */}
      <DumpDetailModal
        dump={selectedDump}
        isOpen={!!selectedDump}
        onClose={handleModalClose}
        onAccept={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};
