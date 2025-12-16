/**
 * useDumps Hook
 * 
 * Convenience hook for accessing dumps context
 */

import { useContext } from 'react';
import { DumpsContext, type DumpsContextState } from '../contexts/DumpsContext';

/**
 * Hook to access dumps context
 * 
 * @throws {Error} If used outside of DumpsProvider
 */
export const useDumps = (): DumpsContextState => {
  const context = useContext(DumpsContext);

  if (context === undefined) {
    throw new Error('useDumps must be used within a DumpsProvider');
  }

  return context;
};
