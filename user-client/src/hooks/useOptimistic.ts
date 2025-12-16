/**
 * useOptimistic Hook
 * 
 * Generic hook for optimistic UI updates with automatic rollback on error.
 * Implements the pattern from clarification Q5 and research.md.
 */

import { useState, useCallback } from 'react';

export interface OptimisticState<T> {
  data: T | null;
  isOptimistic: boolean;
  isPending: boolean;
  error: string | null;
}

export interface OptimisticOptions<T, TArgs extends any[]> {
  onUpdate: (current: T | null, ...args: TArgs) => T | null;
  onCommit: (...args: TArgs) => Promise<T>;
  onError?: (error: Error, ...args: TArgs) => void;
  onSuccess?: (result: T, ...args: TArgs) => void;
}

/**
 * Hook for optimistic updates with rollback
 * 
 * @example
 * const { state, execute } = useOptimistic({
 *   onUpdate: (dump, updates) => ({ ...dump, ...updates }),
 *   onCommit: async (dumpId, updates) => await api.updateDump(dumpId, updates),
 * });
 */
export function useOptimistic<T, TArgs extends any[]>(
  initialData: T | null,
  options: OptimisticOptions<T, TArgs>
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
    isPending: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: TArgs) => {
      const { onUpdate, onCommit, onError, onSuccess } = options;

      // Store original data for rollback
      const originalData = state.data;

      // Step 1: Apply optimistic update immediately
      const optimisticData = onUpdate(state.data, ...args);
      setState({
        data: optimisticData,
        isOptimistic: true,
        isPending: true,
        error: null,
      });

      try {
        // Step 2: Commit to backend
        const result = await onCommit(...args);

        // Step 3: Success - replace optimistic data with server response
        setState({
          data: result,
          isOptimistic: false,
          isPending: false,
          error: null,
        });

        if (onSuccess) {
          onSuccess(result, ...args);
        }

        return { success: true, data: result };
      } catch (error: any) {
        // Step 4: Failure - rollback to original data
        setState({
          data: originalData,
          isOptimistic: false,
          isPending: false,
          error: error.message || 'Operation failed',
        });

        if (onError) {
          onError(error, ...args);
        }

        return { success: false, error: error.message };
      }
    },
    [state.data, options]
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const setData = useCallback((data: T | null) => {
    setState({
      data,
      isOptimistic: false,
      isPending: false,
      error: null,
    });
  }, []);

  return {
    state,
    execute,
    clearError,
    setData,
  };
}
