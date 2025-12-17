/**
 * Tracking Page
 * 
 * Dedicated view for dumps with reminders or package tracking
 * Filters and organizes items by type (Reminders vs Tracking)
 */

import React, { useEffect, useMemo } from 'react';
import { Bell, Package } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDumps } from '../hooks/useDumps';
import { useSearchParams } from 'react-router-dom';
import type { DumpDerived } from '../types/dump.types';
import { enrichDump } from '../utils/time-buckets';
import { DumpDetailModal } from '../components/DumpDetailModal';
import { Timeline } from '../components/Timeline';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/Button';

export const TrackingPage: React.FC = () => {
  const { user } = useAuth();
  const { dumps, loading, error, fetchDumps, refetchDumps, clearError } = useDumps();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDump, setSelectedDump] = React.useState<DumpDerived | null>(null);
  const [modalMode, setModalMode] = React.useState<'view' | 'reject'>('view');

  // Enrich dumps with derived properties
  const enrichedDumps = useMemo(() => dumps.map(enrichDump), [dumps]);

  // Fetch dumps on mount
  useEffect(() => {
    if (user?.id) {
      fetchDumps(user.id);
    }
  }, [user?.id]);

  // Handle modal routing via query param
  useEffect(() => {
    const dumpId = searchParams.get('dumpId');
    if (dumpId && enrichedDumps.length > 0) {
      const dump = enrichedDumps.find(d => d.id === dumpId);
      if (dump) {
        setSelectedDump(dump);
      }
    } else {
      setSelectedDump(null);
    }
  }, [searchParams, enrichedDumps]);

  // Filter dumps: hasReminder=true OR hasTracking=true
  const reminderDumps = enrichedDumps.filter(dump => dump.hasReminder && dump.status === 'Pending');
  const trackingDumps = enrichedDumps.filter(dump => dump.hasTracking && dump.status === 'Pending');
  const allFilteredDumps = enrichedDumps.filter(dump => 
    (dump.hasReminder || dump.hasTracking) && dump.status === 'Pending'
  );

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

  // Handle successful accept/reject - refetch data
  const handleAccept = () => {
    refetchDumps();
  };

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
        <LoadingSpinner size="xl" text="Loading reminders and tracking..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <EmptyState
          title="Failed to load items"
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
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // Empty state - no reminders or tracking items
  if (allFilteredDumps.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <EmptyState
          title="No reminders or tracking items"
          message="Items with reminders or package tracking will appear here."
          icon={
            <div className="flex gap-3">
              <Bell className="h-12 w-12 text-orange-300" />
              <Package className="h-12 w-12 text-cyan-300" />
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          Reminders & Tracking
        </h1>
        <p className="text-slate-600 mt-1">
          {allFilteredDumps.length} item{allFilteredDumps.length === 1 ? '' : 's'} requiring attention
        </p>
      </div>

      {/* Reminders Section */}
      {reminderDumps.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-heading font-semibold text-slate-900">
              Reminders
            </h2>
            <span className="text-sm text-slate-500">
              ({reminderDumps.length} {reminderDumps.length === 1 ? 'item' : 'items'})
            </span>
          </div>
          <Timeline
            dumps={reminderDumps}
            showActions={true}
            onDumpClick={handleDumpClick}
          />
        </div>
      )}

      {/* Tracking Section */}
      {trackingDumps.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-600" />
            <h2 className="text-xl font-heading font-semibold text-slate-900">
              Package Tracking
            </h2>
            <span className="text-sm text-slate-500">
              ({trackingDumps.length} {trackingDumps.length === 1 ? 'item' : 'items'})
            </span>
          </div>
          <Timeline
            dumps={trackingDumps}
            showActions={true}
            onDumpClick={handleDumpClick}
          />
        </div>
      )}

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
            <LoadingSpinner size="lg" text="Refreshing..." />
          </div>
        </div>
      )}
    </div>
  );
};
