/**
 * Dumps Context
 * 
 * Global state management for dumps data
 */

import React, { createContext, useState, useCallback, type ReactNode } from 'react';
import type { Dump } from '../types/dump.types';
import * as dumpsService from '../services/dumps.service';

export interface DumpsContextState {
  dumps: Dump[];
  loading: boolean;
  error: string | null;
  fetchDumps: (userId: string) => Promise<void>;
  refetchDumps: () => Promise<void>;
  updateDumpLocally: (dumpId: string, updates: Partial<Dump>) => void;
  acceptDumpWithOptimism: (dumpId: string, updates: { category?: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  rejectDumpWithOptimism: (dumpId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const DumpsContext = createContext<DumpsContextState | undefined>(undefined);

export const DumpsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dumps, setDumps] = useState<Dump[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  const fetchDumps = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    setLastUserId(userId);

    try {
      const response = await dumpsService.fetchDumps(userId);

      if (response.success && response.data) {
        setDumps(response.data.dumps);
      } else {
        setError(response.error?.message || 'Failed to fetch dumps');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchDumps = useCallback(async () => {
    if (lastUserId) {
      await fetchDumps(lastUserId);
    }
  }, [lastUserId, fetchDumps]);

  const updateDumpLocally = useCallback((dumpId: string, updates: Partial<Dump>) => {
    setDumps(prev =>
      prev.map(dump =>
        dump.id === dumpId ? { ...dump, ...updates } : dump
      )
    );
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Accept dump with optimistic update pattern
   * Updates locally first, then commits to backend
   * Rolls back on failure
   */
  const acceptDumpWithOptimism = useCallback(
    async (
      dumpId: string,
      updates: { category?: string; notes?: string }
    ): Promise<{ success: boolean; error?: string }> => {
      // Store original dump for rollback
      const originalDump = dumps.find(d => d.id === dumpId);
      if (!originalDump) {
        return { success: false, error: 'Dump not found' };
      }

      // Step 1: Optimistic update - apply immediately
      const optimisticUpdate: Partial<Dump> = {
        processing_status: 'completed',
      };
      updateDumpLocally(dumpId, optimisticUpdate);

      try {
        // Step 2: Commit to backend
        // First update category/notes if provided
        if (updates.category || updates.notes) {
          const updateResponse = await dumpsService.updateDump(dumpId, updates);
          if (!updateResponse.success) {
            throw new Error(updateResponse.error?.message || 'Failed to update dump');
          }
        }

        // Then accept the dump
        const acceptResponse = await dumpsService.acceptDump(dumpId);
        if (!acceptResponse.success || !acceptResponse.data) {
          throw new Error(acceptResponse.error?.message || 'Failed to accept dump');
        }

        // Step 3: Replace optimistic data with server response
        updateDumpLocally(dumpId, acceptResponse.data);

        return { success: true };
      } catch (err: any) {
        // Step 4: Rollback on failure
        updateDumpLocally(dumpId, originalDump);
        const errorMessage = err?.message || 'Failed to accept dump';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [dumps, updateDumpLocally]
  );

  /**
   * Reject dump with optimistic update pattern
   * Updates locally first, then commits to backend
   * Rolls back on failure
   */
  const rejectDumpWithOptimism = useCallback(
    async (
      dumpId: string,
      reason: string
    ): Promise<{ success: boolean; error?: string }> => {
      // Validation: reason must be at least 10 chars
      if (!reason || reason.trim().length < 10) {
        return { success: false, error: 'Rejection reason must be at least 10 characters' };
      }

      // Store original dump for rollback
      const originalDump = dumps.find(d => d.id === dumpId);
      if (!originalDump) {
        return { success: false, error: 'Dump not found' };
      }

      // Step 1: Optimistic update - apply immediately
      const optimisticUpdate: Partial<Dump> = {
        processing_status: 'completed',
      };
      // Update both the base dump and derived properties
      updateDumpLocally(dumpId, { ...optimisticUpdate, status: 'Rejected' } as any);

      try {
        // Step 2: Commit to backend
        const rejectResponse = await dumpsService.rejectDump(dumpId, reason);
        if (!rejectResponse.success || !rejectResponse.data) {
          throw new Error(rejectResponse.error?.message || 'Failed to reject dump');
        }

        // Step 3: Replace optimistic data with server response
        updateDumpLocally(dumpId, rejectResponse.data);

        return { success: true };
      } catch (err: any) {
        // Step 4: Rollback on failure
        updateDumpLocally(dumpId, originalDump);
        const errorMessage = err?.message || 'Failed to reject dump';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [dumps, updateDumpLocally]
  );

  const value: DumpsContextState = {
    dumps,
    loading,
    error,
    fetchDumps,
    refetchDumps,
    updateDumpLocally,
    acceptDumpWithOptimism,
    rejectDumpWithOptimism,
    clearError,
  };

  return <DumpsContext.Provider value={value}>{children}</DumpsContext.Provider>;
};
