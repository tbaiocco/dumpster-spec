/**
 * useTimeBuckets Hook
 * 
 * Computes DumpDerived properties and groups dumps by time bucket
 */

import { useMemo } from 'react';
import type { Dump, DumpDerived, TimeBucket, TimeBucketGroup } from '../types/dump.types';
import { BUCKET_LABELS } from '../types/dump.types';
import { enrichDump, groupByTimeBucket } from '../utils/time-buckets';
import { sortTimeBucketGroups } from '../utils/sorting';

/**
 * Hook to compute time buckets from raw dumps
 * 
 * @param dumps - Array of raw dumps from API
 * @returns Array of time bucket groups with sorted dumps
 */
export const useTimeBuckets = (dumps: Dump[]): TimeBucketGroup[] => {
  return useMemo(() => {
    // Enrich dumps with derived properties
    const enrichedDumps: DumpDerived[] = dumps.map(enrichDump);

    // Group by time bucket
    const grouped = groupByTimeBucket(enrichedDumps);

    // Sort within each bucket
    const sorted = sortTimeBucketGroups(grouped);

    // Convert to TimeBucketGroup array
    const buckets: TimeBucket[] = ['overdue', 'today', 'tomorrow', 'nextWeek', 'nextMonth', 'later'];

    return buckets.map(bucket => ({
      bucket,
      label: BUCKET_LABELS[bucket],
      dumps: sorted[bucket] || [],
      isExpanded: bucket === 'overdue' || bucket === 'today', // Overdue and Today expanded by default
      count: (sorted[bucket] || []).length,
    }));
  }, [dumps]);
};
