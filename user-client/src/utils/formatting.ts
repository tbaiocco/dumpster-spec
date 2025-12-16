/**
 * Formatting Utilities
 * 
 * Display helpers for dates, text truncation, and user-friendly formatting
 */

import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';

/**
 * Format a date for display with relative time context
 * 
 * Examples:
 * - Today at 2:30 PM
 * - Tomorrow at 9:00 AM
 * - Yesterday at 4:45 PM
 * - Dec 25 at 10:00 AM
 * - Jan 1, 2026
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
  if (!date) {
    return 'No date';
  }

  // Convert to Date object if string
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'h:mm a')}`;
  }

  if (isTomorrow(dateObj)) {
    return `Tomorrow at ${format(dateObj, 'h:mm a')}`;
  }

  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'h:mm a')}`;
  }

  const now = new Date();
  const thisYear = now.getFullYear();
  const dateYear = dateObj.getFullYear();

  // Same year: "Dec 25 at 10:00 AM"
  if (dateYear === thisYear) {
    return format(dateObj, 'MMM d \'at\' h:mm a');
  }

  // Different year: "Jan 1, 2026"
  return format(dateObj, 'MMM d, yyyy');
}

/**
 * Format relative time distance
 * 
 * Examples:
 * - "in 2 hours"
 * - "in 3 days"
 * - "2 days ago"
 */
export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Truncate text to specified length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 */
export function truncateText(text: string | null | undefined, maxLength: number, suffix: string = '...'): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - suffix.length).trim() + suffix;
}

/**
 * Format a confidence score as percentage
 * 
 * @param confidence - Confidence score (0-1)
 * @returns Formatted percentage string (e.g., "92%")
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Get user-friendly urgency level label with emoji
 * Handles both lowercase (backend) and capitalized (frontend) urgency levels
 */
export function formatUrgencyWithIcon(urgency: string): string {
  const icons: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  const urgencyLower = urgency?.toLowerCase() || '';
  const urgencyCapitalized = capitalize(urgencyLower);
  
  return `${icons[urgencyLower] || ''} ${urgencyCapitalized}`;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format category name for display
 * Handles snake_case, kebab-case, and PascalCase
 */
export function formatCategory(category: string | null | undefined): string {
  if (!category || typeof category !== 'string') {
    return 'Uncategorized';
  }
  
  return category
    .replace(/[_-]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(capitalize)
    .join(' ');
}
