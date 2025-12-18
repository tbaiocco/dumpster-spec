/**
 * Dashboard Page
 * 
 * Main dashboard displaying time-bucketed action items
 * with Accept/Reject actions and real-time updates
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useDumps } from '../hooks/useDumps';
import { useTimeBuckets } from '../hooks/useTimeBuckets';
import type { DumpDerived } from '../types/dump.types';
import { TimeBucket } from '../components/TimeBucket';
import { DumpDetailModal } from '../components/DumpDetailModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dumps, loading, error, fetchDumps, refetchDumps, updateDumpLocally, clearError } = useDumps();
  const timeBuckets = useTimeBuckets(dumps);
  const [showActions, setShowActions] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDump, setSelectedDump] = useState<DumpDerived | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'reject'>('view');

  // Fetch dumps on mount
  useEffect(() => {
    if (user?.id) {
      fetchDumps(user.id);
    }
  }, [user?.id]);

  // Handle modal routing via query param
  useEffect(() => {
    const dumpId = searchParams.get('dumpId');
    if (dumpId && dumps.length > 0) {
      const dump = dumps.find(d => d.id === dumpId);
      if (dump) {
        setSelectedDump(dump as any);
      }
    } else {
      setSelectedDump(null);
    }
  }, [searchParams, dumps]);

  // Handle dump updates from DumpCard
  const handleDumpUpdate = (dumpId: string, updates: Partial<DumpDerived>) => {
    updateDumpLocally(dumpId, updates);
  };

  // Handle dump card click - open modal with URL routing
  const handleDumpClick = (dump: DumpDerived, mode: 'view' | 'reject' = 'view') => {
    setModalMode(mode);
    setSearchParams({ dumpId: dump.id });
  };

  // Handle modal close - clear URL param
  const handleModalClose = () => {
    setSearchParams({});
    setModalMode('view');
  };

  // Handle successful accept - refetch data
  const handleAccept = () => {
    refetchDumps();
  };

  // Handle successful reject - refetch data
  const handleReject = () => {
    refetchDumps();
  };

  // Retry on error
  const handleRetry = () => {
    clearError();
    if (user?.id) {
      refetchDumps();
    }
  };

  // Loading state
  if (loading && dumps.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="xl" text={t('dashboard.loading')} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <EmptyState
          title={t('dashboard.failedToLoad')}
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
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  // Empty state
  if (dumps.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <EmptyState
          title={t('dashboard.noItemsYet')}
          message={t('dashboard.allCaughtUp')}
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">
            {t('dashboardTitle.dailyActionItems')}
          </h1>
          <p className="text-slate-600 mt-1">
            {t('dashboardTitle.itemsToReview', { count: dumps.length })}
          </p>
        </div>

        {/* Show Actions Toggle */}
        <Button
          onClick={() => setShowActions(!showActions)}
          variant={showActions ? 'default' : 'outline'}
          className="flex items-center gap-2"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={showActions
                ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              }
            />
          </svg>
          {showActions ? t('dashboardTitle.hideActions') : t('dashboardTitle.showActions')}
        </Button>
      </div>

      {/* Time Buckets */}
      <div className="space-y-4">
        {timeBuckets.map(bucket => (
          <TimeBucket
            key={bucket.bucket}
            timeBucket={bucket}
            onDumpUpdate={handleDumpUpdate}
            onDumpClick={handleDumpClick}
          />
        ))}
      </div>

      {/* Dump Detail Modal */}
      <DumpDetailModal
        dump={selectedDump}
        isOpen={!!selectedDump}
        onClose={handleModalClose}
        onAccept={handleAccept}
        onReject={handleReject}
        initialMode={modalMode}
      />

      {/* Loading Overlay (refetching) */}
      {loading && dumps.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-charming-xl p-6 shadow-glow">
            <LoadingSpinner size="lg" text={t('dashboard.refreshing')} />
          </div>
        </div>
      )}
    </div>
  );
};
