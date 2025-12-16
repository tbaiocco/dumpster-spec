/**
 * Sorting Utilities
 * 
 * Multi-level sorting logic for dumps:
 * Primary: displayDate (ascending - earliest first)
 * Secondary: urgencyLevel (descending - highest first)
 * Tertiary: createdAt (ascending - oldest first)
 */

import type { DumpDerived } from '../types/dump.types';

/**
 * Compare two dumps using multi-level sorting criteria
 * 
 * @returns Negative if a comes before b, positive if b comes before a, 0 if equal
 */
export function compareDumps(a: DumpDerived, b: DumpDerived): number {
  // Primary sort: displayDate (ascending - earliest first)
  const dateA = a.displayDate.getTime();
  const dateB = b.displayDate.getTime();
  
  if (dateA !== dateB) {
    return dateA - dateB;
  }

  // Secondary sort: urgencyLevel (descending - highest first)
  // Map urgency string to weight
  const getUrgencyWeight = (urgency?: string): number => {
    if (!urgency) return 0;
    const normalized = urgency.toLowerCase();
    if (normalized === 'critical') return 4;
    if (normalized === 'high') return 3;
    if (normalized === 'medium') return 2;
    if (normalized === 'low') return 1;
    return 0;
  };
  
  const urgencyA = getUrgencyWeight(a.extracted_entities?.urgency);
  const urgencyB = getUrgencyWeight(b.extracted_entities?.urgency);
  
  if (urgencyA !== urgencyB) {
    return urgencyB - urgencyA; // Reversed for descending
  }

  // Tertiary sort: created_at (ascending - oldest first)
  const createdA = new Date(a.created_at).getTime();
  const createdB = new Date(b.created_at).getTime();
  
  return createdA - createdB;
}

/**
 * Sort an array of dumps using multi-level sorting criteria
 * Returns a new sorted array (does not mutate original)
 */
export function sortDumps(dumps: DumpDerived[]): DumpDerived[] {
  return [...dumps].sort(compareDumps);
}

/**
 * Sort dumps within time bucket groups
 * Returns a new object with sorted arrays
 */
export function sortTimeBucketGroups(
  groups: Record<string, DumpDerived[]>
): Record<string, DumpDerived[]> {
  const sorted: Record<string, DumpDerived[]> = {};

  Object.entries(groups).forEach(([bucket, dumps]) => {
    sorted[bucket] = sortDumps(dumps);
  });

  return sorted;
}
