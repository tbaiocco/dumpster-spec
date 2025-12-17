/**
 * Time Bucket Utilities
 * 
 * Calendar-based time bucket assignment logic for organizing dumps
 * by temporal proximity (per clarification Q2)
 */

import {
  isToday,
  isTomorrow,
  isBefore,
  startOfDay,
  addWeeks,
  addMonths,
  parseISO,
} from 'date-fns';
import type { TimeBucket, Dump, DumpDerived } from '../types/dump.types';

/**
 * Assign a time bucket to a dump based on its earliest date
 * 
 * Bucket Logic (calendar-based):
 * - overdue: Any date before today
 * - today: Dates within today (same day)
 * - tomorrow: Dates within tomorrow (next day)
 * - nextWeek: Dates within next 7 days (excluding today/tomorrow)
 * - nextMonth: Dates within next 30 days (excluding nextWeek)
 * - later: All other future dates
 * 
 * @param earliestDate - ISO 8601 date string from dump's extractedEntities
 * @returns TimeBucket identifier
 */
export function assignTimeBucket(earliestDate: string): TimeBucket {
  const date = parseISO(earliestDate);
  const now = new Date();
  const todayStart = startOfDay(now);
  const nextWeekEnd = addWeeks(todayStart, 1);
  const nextMonthEnd = addMonths(todayStart, 1);

  // Overdue: before today
  if (isBefore(date, todayStart)) {
    return 'overdue';
  }

  // Today: within today
  if (isToday(date)) {
    return 'today';
  }

  // Tomorrow: within tomorrow
  if (isTomorrow(date)) {
    return 'tomorrow';
  }

  // Next Week: within next 7 days (excluding today/tomorrow)
  if (isBefore(date, nextWeekEnd)) {
    return 'nextWeek';
  }

  // Next Month: within next 30 days (excluding nextWeek)
  if (isBefore(date, nextMonthEnd)) {
    return 'nextMonth';
  }

  // Later: all other future dates
  return 'later';
}

/**
 * Get the earliest date from a dump's extracted entities
 * Returns null if no dates exist
 */
export function getEarliestDate(dump: Dump): Date | null {
  if (!dump.extracted_entities?.entities?.dates) {
    return null;
  }
  
  const dates = dump.extracted_entities.entities.dates;
  
  if (!dates || dates.length === 0) {
    return null;
  }

  // Dates are ISO strings, parse them
  const parsedDates = dates.map(d => parseISO(d));
  return new Date(Math.min(...parsedDates.map(d => d.getTime())));
}

/**
 * Check if a dump is overdue based on its earliest date
 */
export function isOverdue(dump: Dump): boolean {
  const earliestDate = getEarliestDate(dump);
  
  if (!earliestDate) {
    return false;
  }

  return isBefore(earliestDate, startOfDay(new Date()));
}

/**
 * Map backend processing_status to frontend DumpStatus
 */
function mapProcessingStatus(status: string): 'Pending' | 'Processing' | 'Approved' | 'Rejected' {
  switch (status?.toLowerCase()) {
    case 'pending': return 'Pending';
    case 'processing': return 'Processing';
    case 'completed': return 'Approved';
    case 'failed': return 'Rejected';
    default: return 'Pending';
  }
}

/**
 * Enrich a dump with derived properties for UI display
 */
export function enrichDump(dump: Dump): DumpDerived {
  const earliestDate = getEarliestDate(dump);
  
  // Safely create display date, fallback to current date if created_at is invalid
  let displayDate: Date;
  if (earliestDate) {
    displayDate = earliestDate;
  } else if (dump.created_at) {
    const parsedDate = new Date(dump.created_at);
    displayDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  } else {
    displayDate = new Date();
  }
  
  const hasReminder = !!(dump.extracted_entities?.actionItems && dump.extracted_entities.actionItems.length > 0);
  const hasTracking = !!(dump.extracted_entities?.entities?.contacts?.phones && dump.extracted_entities.entities.contacts.phones.length > 0);

  return {
    ...dump,
    timeBucket: earliestDate ? assignTimeBucket(earliestDate.toISOString()) : 'later',
    isOverdue: earliestDate ? isOverdue(dump) : false,
    displayDate,
    hasReminder,
    hasTracking,
    // Map backend fields to frontend expected fields
    status: mapProcessingStatus(dump.processing_status),
    categoryName: dump.category?.name || 'general',
    notes: undefined, // Notes functionality to be added
  };
}

/**
 * Group dumps by time bucket
 */
export function groupByTimeBucket(dumps: DumpDerived[]): Record<TimeBucket, DumpDerived[]> {
  const groups: Record<TimeBucket, DumpDerived[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    nextWeek: [],
    nextMonth: [],
    later: [],
  };

  dumps.forEach(dump => {
    groups[dump.timeBucket].push(dump);
  });

  return groups;
}
