/**
 * Reminders Service
 * 
 * API service for reminder management
 */

import { apiService } from './api';

/**
 * Reminder entity
 */
export interface Reminder {
  id: string;
  userId: string;
  dumpId: string;
  reminderText: string;
  reminderDate: string; // ISO 8601 datetime
  status: 'active' | 'snoozed' | 'dismissed' | 'completed';
  snoozedUntil?: string; // ISO 8601 datetime
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Reminder update request
 */
export interface ReminderUpdateRequest {
  reminderText?: string;
  reminderDate?: string;
  status?: 'active' | 'snoozed' | 'dismissed' | 'completed';
}

/**
 * Snooze reminder until specified date/time
 */
export const snoozeReminder = async (
  reminderId: string,
  snoozeUntil: string
): Promise<Reminder> => {
  const response = await apiService.post<Reminder>(
    `/api/reminders/${reminderId}/snooze`,
    { snooze_until: snoozeUntil }
  );
  return response.data!;
};

/**
 * Dismiss reminder (mark as dismissed)
 */
export const dismissReminder = async (reminderId: string): Promise<Reminder> => {
  const response = await apiService.post<Reminder>(
    `/api/reminders/${reminderId}/dismiss`
  );
  return response.data!;
};

/**
 * Update reminder details
 */
export const updateReminder = async (
  reminderId: string,
  updates: ReminderUpdateRequest
): Promise<Reminder> => {
  const response = await apiService.put<Reminder>(
    `/api/reminders/${reminderId}`,
    updates
  );
  return response.data!;
};

/**
 * Get reminders for a specific dump
 */
export const getRemindersForDump = async (dumpId: string): Promise<Reminder[]> => {
  const response = await apiService.get<Reminder[]>(
    `/api/reminders?dumpId=${dumpId}`
  );
  return response.data!;
};
